const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');
const AWS = require('aws-sdk');
const cors = require('cors');
const helmet = require('helmet');
const { authenticateToken } = require('../middleware/auth');

const app = express();
const port = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME || 'analyticsdb',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// Sales analytics
app.get('/api/analytics/sales', authenticateToken, async (req, res) => {
  try {
    const { period = '7d', sellerId } = req.query;
    
    const allowedPeriods = {
      '7d': '7 days',
      '30d': '30 days', 
      '1y': '1 year'
    };
    const interval = allowedPeriods[period] || '7 days';
    
    let query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value
      FROM orders 
      WHERE created_at >= NOW() - INTERVAL '${interval}'
        AND status = 'completed'
    `;
    
    let params = [];
    if (sellerId) {
      query += ' AND seller_id = $1';
      params.push(sellerId);
    }
    
    query += ' GROUP BY DATE(created_at) ORDER BY date DESC';
    
    const result = await pool.query(query, params);
    
    const totalRevenue = result.rows.reduce((sum, row) => sum + parseFloat(row.revenue), 0);
    const totalOrders = result.rows.reduce((sum, row) => sum + parseInt(row.orders), 0);
    
    res.json({
      period,
      totalRevenue,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0,
      dailyData: result.rows
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Product performance
app.get('/api/analytics/products/top', authenticateToken, async (req, res) => {
  try {
    const { limit = 10, metric = 'revenue' } = req.query;
    
    const allowedMetrics = {
      'revenue': 'total_revenue DESC',
      'quantity': 'total_quantity DESC',
      'orders': 'order_count DESC'
    };
    const orderBy = allowedMetrics[metric] || 'total_revenue DESC';
    
    const result = await pool.query(`
      SELECT 
        p.id, p.name, p.price,
        COUNT(oi.id) as order_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.price) as total_revenue
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed'
        AND o.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY p.id, p.name, p.price
      ORDER BY ${orderBy}
      LIMIT $1
    `, [limit]);
    
    res.json({ topProducts: result.rows, metric });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Customer analytics
app.get('/api/analytics/customers', authenticateToken, async (req, res) => {
  try {
    const [newCustomers, returningCustomers, topCustomers] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) FROM users 
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `),
      pool.query(`
        SELECT COUNT(DISTINCT user_id) FROM orders 
        WHERE user_id IN (
          SELECT user_id FROM orders 
          GROUP BY user_id HAVING COUNT(*) > 1
        )
      `),
      pool.query(`
        SELECT 
          u.id, u.name, u.email,
          COUNT(o.id) as order_count,
          SUM(o.total_amount) as total_spent
        FROM users u
        JOIN orders o ON u.id = o.user_id
        WHERE o.status = 'completed'
        GROUP BY u.id, u.name, u.email
        ORDER BY total_spent DESC
        LIMIT 10
      `)
    ]);
    
    res.json({
      newCustomers: parseInt(newCustomers.rows[0].count),
      returningCustomers: parseInt(returningCustomers.rows[0].count),
      topCustomers: topCustomers.rows
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'analytics-service' });
});

app.listen(port, () => {
  console.log(`Analytics service running on port ${port}`);
});