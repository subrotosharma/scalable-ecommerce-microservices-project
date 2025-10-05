const express = require('express');
const { Pool } = require('pg');
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
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const wishlistLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many wishlist requests'
});

app.use('/api/wishlist', wishlistLimiter);
app.use(express.json({ limit: '1mb' }));

const csrfProtection = csrf({ cookie: true });
app.use('/api/wishlist', csrfProtection);

const pool = new Pool({
  user: process.env.DB_USER || 'dbadmin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'easybuybd',
  password: process.env.DB_PASSWORD || 'password123',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

const validateProductId = (id) => {
  const productId = parseInt(id);
  if (isNaN(productId) || productId <= 0) {
    throw new Error('Invalid product ID');
  }
  return productId;
};

// Get user's wishlist
app.get('/api/wishlist', authenticateToken, async (req, res) => {
  try {
    // TODO: Add pagination here - wishlist can get long
    const result = await pool.query(
      `SELECT w.*, p.name, p.price, p.image_url, p.stock_quantity 
       FROM wishlists w 
       JOIN products p ON w.product_id = p.id 
       WHERE w.user_id = $1 
       ORDER BY w.created_at DESC`,
      [req.user.userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Wishlist fetch error:', error); // Debug log
    res.status(500).json({ error: error.message });
  }
});

// Add to wishlist
app.post('/api/wishlist', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.userId;
    const validProductId = validateProductId(productId);
    
    const result = await pool.query(
      'INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
      [userId, validProductId]
    );
    
    logger.info('Added to wishlist', { userId, productId: validProductId });
    res.status(201).json({ success: true, message: 'Added to wishlist' });
  } catch (error) {
    logger.error('Wishlist add error', { error: error.message, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// Remove from wishlist
app.delete('/api/wishlist/:productId', authenticateToken, async (req, res) => {
  try {
    const validProductId = validateProductId(req.params.productId);
    
    await pool.query(
      'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2',
      [req.user.userId, validProductId]
    );
    
    logger.info('Removed from wishlist', { userId: req.user.userId, productId: validProductId });
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (error) {
    logger.error('Wishlist remove error', { error: error.message, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

// Check if product is in wishlist
app.get('/api/wishlist/check/:productId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id FROM wishlists WHERE user_id = $1 AND product_id = $2',
      [req.user.userId, req.params.productId]
    );
    
    res.json({ inWishlist: result.rows.length > 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'wishlist-service' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', service: 'wishlist-service' });
  }
});

const PORT = process.env.PORT || 8090;
app.listen(PORT, () => {
  console.log(`Wishlist service running on port ${PORT}`);
});