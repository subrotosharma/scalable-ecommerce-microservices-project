const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const csrf = require('csurf');
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

const inventoryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many inventory requests, please try again later'
});

app.use('/api/inventory', inventoryLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const csrfProtection = csrf({ 
  cookie: { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  } 
});
// Apply CSRF protection to state-changing operations only
app.use('/api/inventory', (req, res, next) => {
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

// Input validation
const validateProductId = (id) => {
  const productId = parseInt(id);
  if (isNaN(productId) || productId <= 0) {
    throw new Error('Invalid product ID');
  }
  return productId;
};

// Check stock availability
app.get('/api/inventory/:productId', async (req, res) => {
  try {
    const productId = validateProductId(req.params.productId);
    const result = await pool.query('SELECT stock_quantity FROM products WHERE id = $1', [productId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ productId: productId, stock: result.rows[0].stock_quantity });
  } catch (error) {
    logger.error('Get inventory error', { error: error.message });
    res.status(500).json({ error: 'Failed to get inventory' });
  }
});

// Reserve stock for order
app.post('/api/inventory/reserve', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { items } = req.body; // [{ productId, quantity }]
    const reservations = [];
    
    for (const item of items) {
      const result = await client.query(
        'SELECT stock_quantity FROM products WHERE id = $1 FOR UPDATE',
        [item.productId]
      );
      
      if (result.rows.length === 0) {
        throw new Error(`Product ${item.productId} not found`);
      }
      
      const currentStock = result.rows[0].stock_quantity;
      if (currentStock < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.productId}. Available: ${currentStock}, Requested: ${item.quantity}`);
      }
      
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.quantity, item.productId]
      );
      
      reservations.push({ productId: item.productId, quantity: item.quantity });
    }
    
    await client.query('COMMIT');
    res.json({ success: true, reservations });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Release reserved stock (if order fails)
app.post('/api/inventory/release', async (req, res) => {
  try {
    const { items } = req.body; // [{ productId, quantity }]
    
    for (const item of items) {
      await pool.query(
        'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
        [item.quantity, item.productId]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update stock levels
app.put('/api/inventory/:productId', async (req, res) => {
  try {
    const { stock_quantity } = req.body;
    const result = await pool.query(
      'UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [stock_quantity, req.params.productId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get low stock alerts
app.get('/api/inventory/alerts', async (req, res) => {
  try {
    const threshold = req.query.threshold || 10;
    const result = await pool.query(
      'SELECT id, name, stock_quantity FROM products WHERE stock_quantity <= $1 ORDER BY stock_quantity ASC',
      [threshold]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'inventory-service', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({ status: 'unhealthy', service: 'inventory-service' });
  }
});

const PORT = process.env.PORT || 8085;
app.listen(PORT, () => {
  console.log(`Inventory service running on port ${PORT}`);
});