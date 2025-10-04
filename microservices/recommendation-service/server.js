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
  database: process.env.DB_NAME || 'recommendationdb',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: 6379
});

redisClient.connect();

// Collaborative filtering recommendations
app.get('/api/recommendations/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { limit = 10 } = req.query;
    
    // Check cache first
    const cacheKey = `recommendations:user:${userId}`;
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    // Get user's purchase history and preferences
    const userHistory = await pool.query(`
      SELECT DISTINCT p.category_id, p.brand_id, p.price_range
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = $1 AND o.status = 'completed'
    `, [userId]);
    
    // Find similar users
    const similarUsers = await pool.query(`
      SELECT o2.user_id, COUNT(*) as common_purchases
      FROM orders o1
      JOIN order_items oi1 ON o1.id = oi1.order_id
      JOIN order_items oi2 ON oi1.product_id = oi2.product_id
      JOIN orders o2 ON oi2.order_id = o2.id
      WHERE o1.user_id = $1 AND o2.user_id != $1
      GROUP BY o2.user_id
      ORDER BY common_purchases DESC
      LIMIT 50
    `, [userId]);
    
    // Get recommendations based on similar users
    const recommendations = await pool.query(`
      SELECT DISTINCT p.*, AVG(r.rating) as avg_rating, COUNT(r.id) as review_count
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE o.user_id = ANY($1) 
        AND p.id NOT IN (
          SELECT DISTINCT oi2.product_id 
          FROM orders o2 
          JOIN order_items oi2 ON o2.id = oi2.order_id 
          WHERE o2.user_id = $2
        )
        AND p.status = 'active'
      GROUP BY p.id
      ORDER BY COUNT(oi.id) DESC, avg_rating DESC
      LIMIT $3
    `, [similarUsers.rows.map(u => u.user_id), userId, limit]);
    
    const result = {
      recommendations: recommendations.rows,
      algorithm: 'collaborative_filtering',
      generatedAt: new Date().toISOString()
    };
    
    // Cache for 1 hour
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(result));
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Content-based recommendations
app.get('/api/recommendations/product/:productId/similar', async (req, res) => {
  try {
    const productId = req.params.productId;
    const { limit = 10 } = req.query;
    
    const cacheKey = `recommendations:product:${productId}`;
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    // Get product details
    const product = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
    
    if (product.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const currentProduct = product.rows[0];
    
    // Find similar products based on category, brand, price range
    const similar = await pool.query(`
      SELECT p.*, AVG(r.rating) as avg_rating, COUNT(r.id) as review_count
      FROM products p
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE p.id != $1 
        AND p.status = 'active'
        AND (
          p.category_id = $2 
          OR p.brand_id = $3
          OR (p.price BETWEEN $4 * 0.7 AND $4 * 1.3)
        )
      GROUP BY p.id
      ORDER BY 
        CASE WHEN p.category_id = $2 THEN 3 ELSE 0 END +
        CASE WHEN p.brand_id = $3 THEN 2 ELSE 0 END +
        CASE WHEN p.price BETWEEN $4 * 0.8 AND $4 * 1.2 THEN 1 ELSE 0 END DESC,
        avg_rating DESC
      LIMIT $5
    `, [productId, currentProduct.category_id, currentProduct.brand_id, currentProduct.price, limit]);
    
    const result = {
      recommendations: similar.rows,
      algorithm: 'content_based',
      basedOn: {
        productId: productId,
        category: currentProduct.category_id,
        brand: currentProduct.brand_id,
        priceRange: currentProduct.price
      },
      generatedAt: new Date().toISOString()
    };
    
    await redisClient.setEx(cacheKey, 7200, JSON.stringify(result));
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Trending products
app.get('/api/recommendations/trending', async (req, res) => {
  try {
    const { category, limit = 20 } = req.query;
    
    let query = `
      SELECT p.*, COUNT(oi.id) as order_count, AVG(r.rating) as avg_rating
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE o.created_at >= NOW() - INTERVAL '7 days'
        AND p.status = 'active'
    `;
    
    let params = [];
    
    if (category) {
      query += ' AND p.category_id = $1';
      params.push(category);
    }
    
    query += `
      GROUP BY p.id
      ORDER BY order_count DESC, avg_rating DESC
      LIMIT $${params.length + 1}
    `;
    params.push(limit);
    
    const result = await pool.query(query, params);
    
    res.json({
      trending: result.rows,
      period: '7_days',
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'recommendation-service' });
});

app.listen(port, () => {
  console.log(`Recommendation service running on port ${port}`);
});