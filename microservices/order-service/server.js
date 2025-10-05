const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const fetch = require('node-fetch');
const { authenticateToken } = require('../middleware/auth');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const app = express();
const port = process.env.PORT || 8083;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many order requests, please try again later'
});

app.use('/api/orders', orderLimiter);
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
app.use(['/api/orders/create', '/api/orders/*/status'], csrfProtection);

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

// Input validation helpers
const validateOrderId = (id) => {
  const orderId = parseInt(id);
  if (isNaN(orderId) || orderId <= 0) {
    throw new Error('Invalid order ID');
  }
  return orderId;
};

// Create order from cart
app.post('/api/orders/create', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { shippingAddress, billingAddress, paymentMethod } = req.body;
    const userId = req.user.userId;

    // Get cart items
    const cartResult = await client.query(
      'SELECT * FROM cart_items WHERE user_id = $1',
      [userId]
    );

    if (cartResult.rows.length === 0) {
      throw new Error('Cart is empty');
    }

    // Calculate totals
    const subtotal = cartResult.rows.reduce((sum, item) => 
      sum + (parseFloat(item.price) * item.quantity), 0
    );
    const tax = subtotal * 0.08; // 8% tax
    const shipping = subtotal > 50 ? 0 : 9.99; // Free shipping over $50
    const total = subtotal + tax + shipping;

    // Reserve inventory before creating order
    const inventoryItems = cartResult.rows.map(item => ({
      productId: item.product_id,
      quantity: item.quantity
    }));

    try {
      const inventoryResponse = await fetch('http://inventory-service:8085/api/inventory/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: inventoryItems })
      });

      if (!inventoryResponse.ok) {
        const error = await inventoryResponse.json();
        throw new Error(error.error || 'Inventory reservation failed');
      }
    } catch (fetchError) {
      // If inventory service is not available, continue without reservation
      console.warn('Inventory service unavailable:', fetchError.message);
    }

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, subtotal, tax, shipping, total, status, payment_status, 
       shipping_address, billing_address, payment_method, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING *`,
      [userId, subtotal, tax, shipping, total, 'confirmed', 'pending', 
       JSON.stringify(shippingAddress), JSON.stringify(billingAddress), paymentMethod]
    );

    const orderId = orderResult.rows[0].id;

    // Create order items
    for (const item of cartResult.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, 
         quantity, price, total, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [orderId, item.product_id, item.product_name, item.product_image, 
         item.quantity, item.price, item.quantity * item.price]
      );
    }

    // Clear cart after order creation
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      order: orderResult.rows[0],
      message: 'Order created successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Order creation error', { error: error.message.replace(/[\r\n]/g, ''), userId: req.user?.userId });
    res.status(500).json({ error: 'Order creation failed' });
  } finally {
    client.release();
  }
});

// Get user orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT o.id, o.subtotal, o.tax, o.shipping, o.total, o.status, o.payment_status, o.created_at, o.updated_at,
       COUNT(oi.id) as item_count,
       ARRAY_AGG(
         JSON_BUILD_OBJECT(
           'product_name', oi.product_name,
           'quantity', oi.quantity,
           'price', oi.price
         )
       ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Get orders error', { error: error.message.replace(/[\r\n]/g, ''), userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to retrieve orders' });
  }
});

// Get specific order
app.get('/api/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const orderId = validateOrderId(req.params.orderId);

    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const itemsResult = await pool.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [orderId]
    );

    const order = orderResult.rows[0];
    order.items = itemsResult.rows;

    res.json(order);
  } catch (error) {
    logger.error('Get order error', { error: error.message.replace(/[\r\n]/g, ''), userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to retrieve order' });
  }
});

// Update order status with fulfillment tracking
app.put('/api/orders/:orderId/status', authenticateToken, async (req, res) => {
  try {
    const { status, trackingNumber } = req.body;
    const orderId = validateOrderId(req.params.orderId);
    const userId = req.user.userId;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Validate tracking number if provided
    if (trackingNumber && (typeof trackingNumber !== 'string' || trackingNumber.length > 50)) {
      return res.status(400).json({ error: 'Invalid tracking number' });
    }

    let updateQuery, params;
    
    if (trackingNumber && status === 'shipped') {
      updateQuery = 'UPDATE orders SET status = $1, tracking_number = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *';
      params = [status, trackingNumber, orderId, userId];
    } else {
      updateQuery = 'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *';
      params = [status, orderId, userId];
    }

    const result = await pool.query(updateQuery, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    logger.info('Order status updated', { orderId: parseInt(orderId), status: status.replace(/[^a-zA-Z0-9_-]/g, ''), userId: parseInt(userId) });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Update order status error', { error: error.message.replace(/[\r\n]/g, ''), userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Get order tracking
app.get('/api/orders/:orderId/tracking', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const orderId = validateOrderId(req.params.orderId);

    const result = await pool.query(
      'SELECT id, status, tracking_number, created_at, updated_at FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];
    const statusSteps = [
      { status: 'pending', label: 'Order Placed', completed: true, date: order.created_at },
      { status: 'confirmed', label: 'Order Confirmed', completed: ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status) },
      { status: 'processing', label: 'Processing', completed: ['processing', 'shipped', 'delivered'].includes(order.status) },
      { status: 'shipped', label: 'Shipped', completed: ['shipped', 'delivered'].includes(order.status) },
      { status: 'delivered', label: 'Delivered', completed: order.status === 'delivered' }
    ];

    res.json({ 
      orderId: order.id, 
      currentStatus: order.status, 
      trackingNumber: order.tracking_number,
      statusSteps 
    });
  } catch (error) {
    logger.error('Get tracking error', { error: error.message.replace(/[\r\n]/g, ''), userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to retrieve tracking information' });
  }
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'order-service', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Health check failed', { error: error.message.replace(/[\r\n]/g, '') });
    res.status(503).json({ status: 'unhealthy', service: 'order-service' });
  }
});

app.listen(port, () => {
  console.log(`Order service running on port ${port}`);
});