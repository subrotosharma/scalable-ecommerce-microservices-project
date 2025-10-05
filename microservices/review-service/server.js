const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const validator = require('validator');
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

const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many review requests'
});

app.use('/api/reviews', reviewLimiter);
app.use(express.json({ limit: '1mb' }));

const csrfProtection = csrf({ 
  cookie: { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  } 
});
// Apply CSRF protection to state-changing operations only
app.use('/api/reviews', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    return csrfProtection(req, res, next);
  }
  next();
});

const pool = new Pool({
  user: process.env.DB_USER || 'dbadmin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'easybuybd',
  password: process.env.DB_PASSWORD || 'password123',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
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

const validateRating = (rating) => {
  const r = parseInt(rating);
  if (isNaN(r) || r < 1 || r > 5) {
    throw new Error('Rating must be between 1 and 5');
  }
  return r;
};

// Get reviews for a product
app.get('/api/reviews/:productId', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const result = await pool.query(
      `SELECT r.*, u.first_name, u.last_name 
       FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.product_id = $1 
       ORDER BY r.created_at DESC 
       LIMIT $2 OFFSET $3`,
      [req.params.productId, limit, offset]
    );
    
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM reviews WHERE product_id = $1',
      [req.params.productId]
    );
    
    res.json({
      reviews: result.rows,
      total: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add review
app.post('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user.userId;
    
    const validProductId = validateProductId(productId);
    const validRating = validateRating(rating);
    const sanitizedComment = validator.escape(comment || '').substring(0, 1000);
    
    // Check if user already reviewed this product
    const existing = await pool.query(
      'SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2',
      [userId, validProductId]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'You have already reviewed this product' });
    }
    
    const result = await pool.query(
      'INSERT INTO reviews (user_id, product_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, validProductId, validRating, sanitizedComment]
    );
    
    logger.info('Review added', { userId, productId: validProductId, rating: validRating });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Add review error', { error: error.message, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// Get product rating summary
app.get('/api/reviews/:productId/summary', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
       FROM reviews WHERE product_id = $1`,
      [req.params.productId]
    );
    
    const summary = result.rows[0];
    summary.average_rating = parseFloat(summary.average_rating) || 0;
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'review-service' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', service: 'review-service' });
  }
});

const PORT = process.env.PORT || 8088;
app.listen(PORT, () => {
  console.log(`Review service running on port ${PORT}`);
});