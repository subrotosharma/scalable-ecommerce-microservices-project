const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME || 'sellerdb',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

const s3 = new AWS.S3();
const upload = multer({ storage: multer.memoryStorage() });

// Seller registration
app.post('/api/sellers/register', async (req, res) => {
  try {
    const { email, password, businessName, businessType, taxId, address, phone } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(`
      INSERT INTO sellers (email, password, business_name, business_type, tax_id, address, phone, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING id, email, business_name, status
    `, [email, hashedPassword, businessName, businessType, taxId, JSON.stringify(address), phone]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Seller login
app.post('/api/sellers/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query('SELECT * FROM sellers WHERE email = $1', [email]);
    const seller = result.rows[0];
    
    if (!seller || !await bcrypt.compare(password, seller.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (seller.status !== 'active') {
      return res.status(403).json({ error: 'Account not approved' });
    }
    
    const token = jwt.sign({ sellerId: seller.id }, process.env.JWT_SECRET || 'secret');
    res.json({ token, seller: { id: seller.id, email: seller.email, businessName: seller.business_name } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get seller dashboard data
app.get('/api/sellers/:id/dashboard', async (req, res) => {
  try {
    const sellerId = req.params.id;
    
    const [productsResult, ordersResult, revenueResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM products WHERE seller_id = $1', [sellerId]),
      pool.query('SELECT COUNT(*) FROM orders WHERE seller_id = $1', [sellerId]),
      pool.query('SELECT SUM(total_amount) FROM orders WHERE seller_id = $1 AND status = \\'completed\\'', [sellerId])
    ]);
    
    res.json({
      totalProducts: parseInt(productsResult.rows[0].count),
      totalOrders: parseInt(ordersResult.rows[0].count),
      totalRevenue: parseFloat(revenueResult.rows[0].sum) || 0
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add product
app.post('/api/sellers/:id/products', upload.array('images', 10), async (req, res) => {
  try {
    const sellerId = req.params.id;
    const { name, description, price, categoryId, brandId, sku, specifications } = req.body;
    
    // Upload images to S3
    const imageUrls = [];
    if (req.files) {
      for (const file of req.files) {
        const key = `products/${sellerId}/${Date.now()}-${file.originalname}`;
        const uploadResult = await s3.upload({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype
        }).promise();
        imageUrls.push(uploadResult.Location);
      }
    }
    
    const result = await pool.query(`
      INSERT INTO products (seller_id, name, description, price, category_id, brand_id, sku, specifications, images, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
      RETURNING *
    `, [sellerId, name, description, price, categoryId, brandId, sku, JSON.stringify(specifications), JSON.stringify(imageUrls)]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get seller orders
app.get('/api/sellers/:id/orders', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM orders WHERE seller_id = $1';
    let params = [req.params.id];
    
    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'seller-service' });
});

app.listen(port, () => {
  console.log(`Seller service running on port ${port}`);
});