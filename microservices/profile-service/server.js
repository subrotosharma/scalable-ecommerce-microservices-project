const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const bcrypt = require('bcrypt');
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

const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many profile requests'
});

app.use('/api/profile', profileLimiter);
app.use(express.json({ limit: '1mb' }));

const csrfProtection = csrf({ cookie: true });
app.use('/api/profile', csrfProtection);

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'easybuybd',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, phone, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;
    const result = await pool.query(
      'UPDATE users SET first_name = $1, last_name = $2, phone = $3, updated_at = NOW() WHERE id = $4 RETURNING id, email, first_name, last_name, phone',
      [first_name, last_name, phone, req.user.userId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password
app.put('/api/profile/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Verify current password
    const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.userId]);
    const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, req.user.userId]);
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user addresses
app.get('/api/profile/addresses', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new address
app.post('/api/profile/addresses', authenticateToken, async (req, res) => {
  try {
    const { type, first_name, last_name, address_line1, address_line2, city, state, zip_code, country, is_default } = req.body;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // If this is default, unset other defaults
      if (is_default) {
        await client.query('UPDATE user_addresses SET is_default = false WHERE user_id = $1', [req.user.userId]);
      }
      
      const result = await client.query(
        `INSERT INTO user_addresses (user_id, type, first_name, last_name, address_line1, address_line2, 
         city, state, zip_code, country, is_default) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [req.user.userId, type, first_name, last_name, address_line1, address_line2, city, state, zip_code, country, is_default]
      );
      
      await client.query('COMMIT');
      res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order history
app.get('/api/profile/orders', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const result = await pool.query(
      `SELECT o.*, COUNT(oi.id) as item_count 
       FROM orders o 
       LEFT JOIN order_items oi ON o.id = oi.order_id 
       WHERE o.user_id = $1 
       GROUP BY o.id 
       ORDER BY o.created_at DESC 
       LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'profile-service' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', service: 'profile-service' });
  }
});

const PORT = process.env.PORT || 8086;
app.listen(PORT, () => {
  console.log(`Profile service running on port ${PORT}`);
});