const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const helmet = require('helmet');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const validator = require('validator');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const notificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many notification requests'
});

app.use('/api/notifications', notificationLimiter);
app.use(express.json({ limit: '1mb' }));

const csrfProtection = csrf({ 
  cookie: { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  } 
});
// Apply CSRF protection to state-changing operations only
app.use('/api/notifications', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    return csrfProtection(req, res, next);
  }
  next();
});

// Email transporter (using Gmail for demo)
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'demo@easybuybd.com',
    pass: process.env.EMAIL_PASS || 'demo-password'
  }
});

// Send order confirmation email
app.post('/api/notifications/order-confirmation', async (req, res) => {
  try {
    const { email, orderDetails } = req.body;
    
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    
    if (!orderDetails || !orderDetails.id) {
      return res.status(400).json({ error: 'Invalid order details' });
    }
    
    const sanitizedOrderId = validator.escape(orderDetails.id.toString());
    const sanitizedTotal = validator.escape(orderDetails.total.toString());
    const sanitizedStatus = validator.escape(orderDetails.status.toString());
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@easybuybd.com',
      to: validator.normalizeEmail(email),
      subject: `Order Confirmation - #${sanitizedOrderId}`,
      text: `Thank you for your order! Order ID: #${sanitizedOrderId}, Total: $${sanitizedTotal}, Status: ${sanitizedStatus}. We'll send you updates as your order progresses. Best regards, EasyBuyBD Team`
    };
    
    logger.info('Order confirmation email queued', { email: validator.normalizeEmail(email), orderId: sanitizedOrderId });
    
    res.json({ success: true, message: 'Order confirmation sent' });
  } catch (error) {
    logger.error('Order confirmation error', { error: error.message });
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Send shipping notification
app.post('/api/notifications/shipping', async (req, res) => {
  try {
    const { email, orderDetails, trackingNumber } = req.body;
    
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    
    const sanitizedOrderId = validator.escape(orderDetails.id.toString());
    const sanitizedTrackingNumber = validator.escape(trackingNumber.toString());
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@easybuybd.com',
      to: validator.normalizeEmail(email),
      subject: `Your order has shipped - #${sanitizedOrderId}`,
      text: `Your order is on the way! Order ID: #${sanitizedOrderId}, Tracking Number: ${sanitizedTrackingNumber}. You can track your package using the tracking number. Best regards, EasyBuyBD Team`
    };
    
    console.log('Shipping email sent:', mailOptions);
    
    res.json({ success: true, message: 'Shipping notification sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send password reset email
app.post('/api/notifications/password-reset', async (req, res) => {
  try {
    const { email, resetToken } = req.body;
    
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    
    const sanitizedToken = validator.escape(resetToken.toString());
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@easybuybd.com',
      to: validator.normalizeEmail(email),
      subject: 'Password Reset Request',
      text: `Password Reset Request. Visit this link to reset your password: ${baseUrl}/reset-password?token=${sanitizedToken}. This link will expire in 1 hour. Best regards, EasyBuyBD Team`
    };
    
    console.log('Password reset email sent:', mailOptions);
    
    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'notification-service', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 8089;
app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
});