const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');
const cors = require('cors');
const helmet = require('helmet');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const { authenticateToken } = require('../middleware/auth');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const app = express();
const port = process.env.PORT || 8081;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const cartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many cart requests, please try again later'
});

app.use('/api/cart', cartLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const csrfProtection = csrf({ 
  cookie: { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  } 
});
// Apply CSRF protection to state-changing operations only
app.use('/api/cart', (req, res, next) => {
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

// Input validation
const validateProductId = (id) => {
  const productId = parseInt(id);
  if (isNaN(productId) || productId <= 0) {
    throw new Error('Invalid product ID');
  }
  return productId;
};

const validateQuantity = (qty) => {
  const quantity = parseInt(qty);
  if (isNaN(quantity) || quantity < 0 || quantity > 999) {
    throw new Error('Invalid quantity');
  }
  return quantity;
};

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: 6379
});

// Add item to cart
app.post('/api/cart/add', authenticateToken, async (req, res) => {
  try {
    const { productId, quantity, price, name, image } = req.body;
    const userId = req.user.userId;
    
    // Validate inputs
    const validProductId = validateProductId(productId);
    const validQuantity = validateQuantity(quantity);
    
    if (!price || price <= 0 || price > 999999) {
      return res.status(400).json({ error: 'Invalid price' });
    }
    if (!name || name.length > 255) {
      return res.status(400).json({ error: 'Invalid product name' });
    }
    
    const result = await pool.query(
      `INSERT INTO cart_items (user_id, product_id, quantity, price, product_name, product_image, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
       ON CONFLICT (user_id, product_id) 
       DO UPDATE SET quantity = cart_items.quantity + $3, updated_at = NOW() 
       RETURNING *`,
      [userId, validProductId, validQuantity, price, name.trim(), image || '']
    );
    
    logger.info('Item added to cart', { userId, productId: validProductId, quantity: validQuantity });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Add to cart error', { error: error.message, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// Get user's cart
app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      'SELECT * FROM cart_items WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update item quantity
app.put('/api/cart/update', authenticateToken, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.userId;
    
    const validProductId = validateProductId(productId);
    const validQuantity = validateQuantity(quantity);
    
    if (validQuantity <= 0) {
      await pool.query('DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2', [userId, validProductId]);
      res.json({ message: 'Item removed from cart' });
    } else {
      const result = await pool.query(
        'UPDATE cart_items SET quantity = $3, updated_at = NOW() WHERE user_id = $1 AND product_id = $2 RETURNING *',
        [userId, validProductId, validQuantity]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found in cart' });
      }
      res.json(result.rows[0]);
    }
  } catch (error) {
    logger.error('Update cart error', { error: error.message, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

// Remove item from cart
app.delete('/api/cart/remove/:productId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const validProductId = validateProductId(req.params.productId);
    
    const result = await pool.query('DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2', [userId, validProductId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }
    
    logger.info('Item removed from cart', { userId, productId: validProductId });
    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    logger.error('Remove from cart error', { error: error.message, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

// Clear entire cart
app.delete('/api/cart/clear', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get cart summary
app.get('/api/cart/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      'SELECT COUNT(*) as item_count, COALESCE(SUM(quantity * price), 0) as total_amount FROM cart_items WHERE user_id = $1',
      [userId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'cart-service', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({ status: 'unhealthy', service: 'cart-service' });
  }
});

app.listen(port, () => {
  console.log(`Cart service running on port ${port}`);
});