const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const { authenticateToken } = require('../middleware/auth');
const { validatePayment } = require('../middleware/validation');

const app = express();
const port = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME || 'paymentdb',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

app.post('/api/payments', authenticateToken, validatePayment, async (req, res) => {
  try {
    const { orderId, amount, userId, paymentMethod = 'card' } = req.body;
    
    // Simulate payment processing
    const paymentStatus = Math.random() > 0.1 ? 'completed' : 'failed';
    
    const result = await pool.query(
      'INSERT INTO payments (order_id, user_id, amount, payment_method, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [orderId, userId, amount, paymentMethod, paymentStatus]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/payments/order/:orderId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM payments WHERE order_id = $1', [req.params.orderId]);
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/payments/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/payments/:id/refund', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE payments SET status = $1 WHERE id = $2 RETURNING *',
      ['refunded', req.params.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'payment-service' });
});

app.listen(port, () => {
  console.log(`Payment service running on port ${port}`);
});