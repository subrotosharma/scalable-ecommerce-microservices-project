const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

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

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per minute
  message: 'Too many search requests, please try again later'
});

app.use('/api/search', searchLimiter);
app.use(express.json({ limit: '1mb' }));

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

// Input validation helpers
const validateSearchInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim().substring(0, 100); // Limit length
};

const validateNumericInput = (input, min = 0, max = 999999) => {
  const num = parseFloat(input);
  if (isNaN(num)) return null;
  return Math.max(min, Math.min(max, num));
};

// Advanced search with filters
// NOTE: This could probably be optimized with Elasticsearch later
app.get('/api/search', async (req, res) => {
  try {
    const { 
      q = '', 
      category, 
      minPrice, 
      maxPrice, 
      inStock = false,
      sortBy = 'relevance',
      page = 1, 
      limit = 20 
    } = req.query;
    
    // Validate page and limit to prevent abuse
    const validatedPage = Math.max(1, parseInt(page));
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit)));
    
    const offset = (validatedPage - 1) * validatedLimit;
    let query = `
      SELECT *, 
      CASE 
        WHEN name ILIKE $1 THEN 3
        WHEN description ILIKE $1 THEN 2
        WHEN category ILIKE $1 THEN 1
        ELSE 0
      END as relevance_score
      FROM products WHERE 1=1
    `;
    
    // Validate and sanitize inputs
    const searchTerm = validateSearchInput(q);
    const validatedMinPrice = validateNumericInput(minPrice);
    const validatedMaxPrice = validateNumericInput(maxPrice);
    
    const params = [`%${searchTerm}%`];
    let paramCount = 1;

    if (searchTerm) {
      query += ` AND (name ILIKE $1 OR description ILIKE $1 OR category ILIKE $1)`;
    }
    
    if (category) {
      const validatedCategory = validateSearchInput(category);
      query += ` AND category = $${++paramCount}`;
      params.push(validatedCategory);
    }
    
    if (validatedMinPrice !== null) {
      query += ` AND price >= $${++paramCount}`;
      params.push(validatedMinPrice);
    }
    
    if (validatedMaxPrice !== null) {
      query += ` AND price <= $${++paramCount}`;
      params.push(validatedMaxPrice);
    }
    
    if (inStock === 'true') {
      query += ` AND stock_quantity > 0`;
    }

    // Sorting
    switch (sortBy) {
      case 'price_low':
        query += ` ORDER BY price ASC`;
        break;
      case 'price_high':
        query += ` ORDER BY price DESC`;
        break;
      case 'newest':
        query += ` ORDER BY created_at DESC`;
        break;
      default:
        query += ` ORDER BY relevance_score DESC, created_at DESC`;
    }

    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(validatedLimit, offset);

    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM products WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;
    
    if (searchTerm) {
      countQuery += ` AND (name ILIKE $${++countParamCount} OR description ILIKE $${countParamCount} OR category ILIKE $${countParamCount})`;
      countParams.push(`%${searchTerm}%`);
    }
    
    if (category) {
      const validatedCategoryForCount = validateSearchInput(category);
      countQuery += ` AND category = $${++countParamCount}`;
      countParams.push(validatedCategoryForCount);
    }
    
    if (validatedMinPrice !== null) {
      countQuery += ` AND price >= $${++countParamCount}`;
      countParams.push(validatedMinPrice);
    }
    
    if (validatedMaxPrice !== null) {
      countQuery += ` AND price <= $${++countParamCount}`;
      countParams.push(validatedMaxPrice);
    }
    
    if (inStock === 'true') {
      countQuery += ` AND stock_quantity > 0`;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      products: result.rows,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total: totalCount,
        pages: Math.ceil(totalCount / validatedLimit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get search suggestions
app.get('/api/search/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    const sanitizedQuery = validateSearchInput(q);
    const result = await pool.query(
      `SELECT DISTINCT name FROM products 
       WHERE name ILIKE $1 
       ORDER BY name 
       LIMIT 10`,
      [`%${sanitizedQuery}%`]
    );
    
    res.json(result.rows.map(row => row.name));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get filter options
app.get('/api/search/filters', async (req, res) => {
  try {
    const categories = await pool.query('SELECT DISTINCT category FROM products ORDER BY category');
    const priceRange = await pool.query('SELECT MIN(price) as min_price, MAX(price) as max_price FROM products');
    
    res.json({
      categories: categories.rows.map(row => row.category),
      priceRange: priceRange.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'search-service' });
});

const PORT = process.env.PORT || 8087;
app.listen(PORT, () => {
  console.log(`Search service running on port ${PORT}`);
});