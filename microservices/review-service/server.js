const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME || 'reviewdb',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { productId, userId, rating, comment } = req.body;
    
    const result = await pool.query(
      'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
      [productId, userId, rating, comment]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/reviews/product/:productId', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const result = await pool.query(
      'SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.params.productId, limit, offset]
    );
    
    const avgResult = await pool.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE product_id = $1',
      [req.params.productId]
    );
    
    res.json({
      reviews: result.rows,
      avgRating: parseFloat(avgResult.rows[0].avg_rating) || 0,
      totalReviews: parseInt(avgResult.rows[0].total_reviews)
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/reviews/user/:userId', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reviews WHERE user_id = $1 ORDER BY created_at DESC', [req.params.userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/reviews/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'review-service' });
});

app.listen(port, () => {
  console.log(`Review service running on port ${port}`);
});