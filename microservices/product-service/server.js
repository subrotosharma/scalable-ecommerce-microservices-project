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
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));

const productLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests'
});

app.use('/api/products', productLimiter);
app.use(express.json({ limit: '1mb' }));

const csrfProtection = csrf({ 
  cookie: { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  } 
});
// Apply CSRF protection to state-changing operations only
app.use('/api/products', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    return csrfProtection(req, res, next);
  }
  next();
});

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'easybuybd',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

const validateSearchInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim().substring(0, 100);
};

// Get all products with pagination and filtering
app.get('/api/products', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search, minPrice, maxPrice } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (category) {
      query += ` AND category = $${++paramCount}`;
      params.push(category);
    }
    
    if (search) {
      query += ` AND (name ILIKE $${++paramCount} OR description ILIKE $${++paramCount})`;
      params.push(`%${search}%`, `%${search}%`);
      paramCount++;
    }
    
    if (minPrice) {
      query += ` AND price >= $${++paramCount}`;
      params.push(minPrice);
    }
    
    if (maxPrice) {
      query += ` AND price <= $${++paramCount}`;
      params.push(maxPrice);
    }

    query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product (admin only)
app.post('/api/products', authenticateToken, async (req, res) => {
  try {
    const { name, description, price, category, image_url, stock_quantity } = req.body;
    const result = await pool.query(
      'INSERT INTO products (name, description, price, category, image_url, stock_quantity) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, description, price, category, image_url, stock_quantity]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product
app.put('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, price, category, image_url, stock_quantity } = req.body;
    const result = await pool.query(
      'UPDATE products SET name = $1, description = $2, price = $3, category = $4, image_url = $5, stock_quantity = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
      [name, description, price, category, image_url, stock_quantity, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT category FROM products ORDER BY category');
    res.json(result.rows.map(row => row.category));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'product-service' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', service: 'product-service' });
  }
});

const PORT = process.env.PORT || 8084;
app.listen(PORT, () => {
  console.log(`Product service running on port ${PORT}`);
});