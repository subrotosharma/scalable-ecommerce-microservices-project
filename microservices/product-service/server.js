const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME || 'productdb',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: 6379
});

app.get('/api/products', async (req, res) => {
  try {
    const { category, brand, minPrice, maxPrice, rating, sortBy = 'created_at', sortOrder = 'DESC', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT p.*, c.name as category_name, b.name as brand_name, 
             AVG(r.rating) as avg_rating, COUNT(r.id) as review_count,
             i.stock_quantity
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN reviews r ON p.id = r.product_id
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.status = 'active'
    `;
    let params = [];
    let paramCount = 0;
    
    if (category) {
      query += ` AND c.slug = $${++paramCount}`;
      params.push(category);
    }
    
    if (brand) {
      query += ` AND b.slug = $${++paramCount}`;
      params.push(brand);
    }
    
    if (minPrice) {
      query += ` AND p.price >= $${++paramCount}`;
      params.push(minPrice);
    }
    
    if (maxPrice) {
      query += ` AND p.price <= $${++paramCount}`;
      params.push(maxPrice);
    }
    
    query += ` GROUP BY p.id, c.name, b.name, i.stock_quantity`;
    
    if (rating) {
      query += ` HAVING AVG(r.rating) >= $${++paramCount}`;
      params.push(rating);
    }
    
    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    const countResult = await pool.query('SELECT COUNT(*) FROM products WHERE status = \'active\'');
    
    res.json({
      products: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, description, price, category, stock } = req.body;
    
    const result = await pool.query(
      'INSERT INTO products (name, description, price, category, stock) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, price, category, stock]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, description, price, category, stock } = req.body;
    
    const result = await pool.query(
      'UPDATE products SET name = $1, description = $2, price = $3, category = $4, stock = $5 WHERE id = $6 RETURNING *',
      [name, description, price, category, stock, req.params.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'product-service' });
});

app.listen(port, () => {
  console.log(`Product service running on port ${port}`);
});