const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// TODO: Add Redis caching for dashboard stats
// FIXME: Need to optimize the dashboard query - it's getting slow with more data

const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many admin requests, please try again later'
});

app.use('/api/admin', limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const csrfProtection = csrf({ cookie: true });
app.use('/api/admin', csrfProtection);

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

// Input validation
const validateOrderId = (id) => {
  const orderId = parseInt(id);
  if (isNaN(orderId) || orderId <= 0) {
    throw new Error('Invalid order ID');
  }
  return orderId;
};

const validatePagination = (page, limit) => {
  const validatedPage = Math.max(1, parseInt(page) || 1);
  const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
  return { page: validatedPage, limit: validatedLimit };
};

// Dashboard analytics
app.get('/api/admin/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await Promise.all([
      pool.query('SELECT COUNT(*) as total_users FROM users'),
      pool.query('SELECT COUNT(*) as total_products FROM products'),
      pool.query('SELECT COUNT(*) as total_orders FROM orders'),
      pool.query('SELECT SUM(total) as total_revenue FROM orders WHERE status = $1', ['delivered']),
      pool.query('SELECT COUNT(*) as pending_orders FROM orders WHERE status = $1', ['pending']),
      pool.query('SELECT COUNT(*) as low_stock FROM products WHERE stock_quantity < 10')
    ]);

    const recentOrders = await pool.query(
      'SELECT id, user_id, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 5'
    );

    res.json({
      totalUsers: parseInt(stats[0].rows[0].total_users),
      totalProducts: parseInt(stats[1].rows[0].total_products),
      totalOrders: parseInt(stats[2].rows[0].total_orders),
      totalRevenue: parseFloat(stats[3].rows[0].total_revenue) || 0,
      pendingOrders: parseInt(stats[4].rows[0].pending_orders),
      lowStockProducts: parseInt(stats[5].rows[0].low_stock),
      recentOrders: recentOrders.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manage products
app.get('/api/admin/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const result = await pool.query(
      'SELECT * FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/products', authenticateToken, requireAdmin, async (req, res) => {
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

// Manage orders
app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT o.*, u.email FROM orders o JOIN users u ON o.user_id = u.id';
    const params = [limit, offset];
    
    if (status) {
      query += ' WHERE o.status = $3';
      params.push(status);
    }
    
    query += ' ORDER BY o.created_at DESC LIMIT $1 OFFSET $2';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/orders/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, tracking_number } = req.body;
    let query = 'UPDATE orders SET status = $1, updated_at = NOW()';
    let params = [status, req.params.id];
    
    if (tracking_number) {
      query += ', tracking_number = $3';
      params = [status, req.params.id, tracking_number];
    }
    
    query += ' WHERE id = $2 RETURNING *';
    
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manage users
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'admin-service', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({ status: 'unhealthy', service: 'admin-service' });
  }
});

const PORT = process.env.PORT || 8091;
app.listen(PORT, () => {
  console.log(`Admin service running on port ${PORT}`);
});