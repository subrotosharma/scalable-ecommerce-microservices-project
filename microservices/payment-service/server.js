const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key');
const { authenticateToken } = require('../middleware/auth');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const app = express();
const port = process.env.PORT || 8082;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many payment attempts, please try again later'
});

app.use('/api/payment', paymentLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const csrfProtection = csrf({ 
  cookie: { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  } 
});
// Apply CSRF protection to state-changing operations only
app.use('/api/payment', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    return csrfProtection(req, res, next);
  }
  next();
});

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME || 'easybuybd',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Create payment intent
app.post('/api/payment/create-intent', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount, currency = 'usd', orderId } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    if (amount > 999999) {
      return res.status(400).json({ error: 'Amount too large' });
    }

    await client.query('BEGIN');

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency,
      metadata: {
        userId: userId.toString(),
        orderId: orderId?.toString() || 'pending'
      }
    });

    // Store payment record
    const result = await client.query(
      `INSERT INTO payments (user_id, order_id, stripe_payment_intent_id, amount, currency, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [userId, orderId, paymentIntent.id, amount, currency, 'pending']
    );

    await client.query('COMMIT');
    
    logger.info('Payment intent created', { userId: parseInt(userId), amount: parseFloat(amount), paymentId: result.rows[0].id });
    
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: result.rows[0].id,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Payment intent creation error', { error: error.message.replace(/[\r\n]/g, ''), userId: req.user?.userId });
    res.status(500).json({ error: 'Payment processing failed' });
  } finally {
    client.release();
  }
});

// Confirm payment
app.post('/api/payment/confirm', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { paymentIntentId, orderId } = req.body;
    const userId = req.user.userId;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID required' });
    }

    await client.query('BEGIN');

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Verify payment belongs to user
    const paymentCheck = await client.query(
      'SELECT id FROM payments WHERE stripe_payment_intent_id = $1 AND user_id = $2',
      [paymentIntentId, userId]
    );

    if (paymentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Payment not found or unauthorized' });
    }

    if (paymentIntent.status === 'succeeded') {
      // Update payment status
      await client.query(
        'UPDATE payments SET status = $1, order_id = $2, updated_at = NOW() WHERE stripe_payment_intent_id = $3 AND user_id = $4',
        ['completed', orderId, paymentIntentId, userId]
      );

      // Update order status
      await client.query(
        'UPDATE orders SET payment_status = $1, status = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4',
        ['paid', 'confirmed', orderId, userId]
      );

      await client.query('COMMIT');
      logger.info('Payment confirmed', { userId: parseInt(userId), paymentIntentId: paymentIntentId.replace(/[\r\n]/g, ''), orderId: parseInt(orderId) });
      res.json({ success: true, status: 'completed' });
    } else {
      await client.query('ROLLBACK');
      res.json({ success: false, status: paymentIntent.status });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Payment confirmation error', { error: error.message.replace(/[\r\n]/g, ''), userId: req.user?.userId });
    res.status(500).json({ error: 'Payment confirmation failed' });
  } finally {
    client.release();
  }
});

// Get payment status
app.get('/api/payment/:paymentId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const paymentId = req.params.paymentId;

    if (!paymentId || isNaN(paymentId)) {
      return res.status(400).json({ error: 'Invalid payment ID' });
    }

    const result = await pool.query(
      'SELECT id, user_id, order_id, amount, currency, status, created_at, updated_at FROM payments WHERE id = $1 AND user_id = $2',
      [paymentId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Get payment error', { error: error.message.replace(/[\r\n]/g, ''), userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to retrieve payment' });
  }
});

// Stripe webhook for payment events (no CSRF protection for webhooks)
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      logger.error('Stripe webhook secret not configured');
      return res.status(500).send('Webhook not configured');
    }
    
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Webhook signature verification failed', { error: err.message.replace(/[\r\n]/g, '') });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await client.query(
          'UPDATE payments SET status = $1, updated_at = NOW() WHERE stripe_payment_intent_id = $2',
          ['completed', paymentIntent.id]
        );
        logger.info('Payment succeeded via webhook', { paymentIntentId: paymentIntent.id });
        break;
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await client.query(
          'UPDATE payments SET status = $1, updated_at = NOW() WHERE stripe_payment_intent_id = $2',
          ['failed', failedPayment.id]
        );
        logger.info('Payment failed via webhook', { paymentIntentId: failedPayment.id });
        break;
      default:
        logger.info('Unhandled webhook event', { eventType: event.type });
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Webhook processing error', { error: error.message.replace(/[\r\n]/g, ''), eventType: event.type });
    return res.status(500).send('Webhook processing failed');
  } finally {
    client.release();
  }

  res.json({received: true});
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'payment-service', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Health check failed', { error: error.message.replace(/[\r\n]/g, '') });
    res.status(503).json({ status: 'unhealthy', service: 'payment-service' });
  }
});

app.listen(port, () => {
  console.log(`Payment service running on port ${port}`);
});