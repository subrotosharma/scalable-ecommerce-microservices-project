const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');
const geoip = require('geoip-lite');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 8080;

app.use(helmet());
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME || 'frauddb',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: 6379
});

redisClient.connect();

// Real-time fraud scoring
app.post('/api/fraud/score', async (req, res) => {
  try {
    const { userId, orderId, amount, paymentMethod, ipAddress, deviceFingerprint, billingAddress, shippingAddress } = req.body;
    
    let riskScore = 0;
    const riskFactors = [];
    
    // 1. Amount-based risk
    if (amount > 1000) {
      riskScore += 20;
      riskFactors.push('high_amount');
    }
    
    // 2. Velocity checks - multiple orders in short time
    const recentOrders = await pool.query(`
      SELECT COUNT(*) FROM orders 
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '1 hour'
    `, [userId]);
    
    if (parseInt(recentOrders.rows[0].count) > 3) {
      riskScore += 30;
      riskFactors.push('high_velocity');
    }
    
    // 3. Geographic risk
    const geo = geoip.lookup(ipAddress);
    if (geo) {
      const userLocation = await pool.query(`
        SELECT country FROM user_profiles WHERE user_id = $1
      `, [userId]);
      
      if (userLocation.rows.length > 0 && userLocation.rows[0].country !== geo.country) {
        riskScore += 25;
        riskFactors.push('location_mismatch');
      }
    }
    
    // 4. Address mismatch
    if (billingAddress && shippingAddress) {
      if (billingAddress.country !== shippingAddress.country) {
        riskScore += 15;
        riskFactors.push('address_mismatch');
      }
    }
    
    // 5. Device fingerprint check
    const deviceHistory = await redisClient.get(`device:${deviceFingerprint}`);
    if (!deviceHistory) {
      riskScore += 10;
      riskFactors.push('new_device');
      await redisClient.setEx(`device:${deviceFingerprint}`, 86400 * 30, userId);
    }
    
    // 6. Payment method risk
    if (paymentMethod === 'new_card') {
      riskScore += 15;
      riskFactors.push('new_payment_method');
    }
    
    // 7. Historical fraud patterns
    const fraudHistory = await pool.query(`
      SELECT COUNT(*) FROM fraud_cases 
      WHERE user_id = $1 AND status = 'confirmed'
    `, [userId]);
    
    if (parseInt(fraudHistory.rows[0].count) > 0) {
      riskScore += 50;
      riskFactors.push('fraud_history');
    }
    
    // Determine risk level
    let riskLevel = 'low';
    let action = 'approve';
    
    if (riskScore >= 70) {
      riskLevel = 'high';
      action = 'block';
    } else if (riskScore >= 40) {
      riskLevel = 'medium';
      action = 'review';
    }
    
    // Log the fraud check
    await pool.query(`
      INSERT INTO fraud_checks (order_id, user_id, risk_score, risk_level, risk_factors, action, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [orderId, userId, riskScore, riskLevel, JSON.stringify(riskFactors), action, ipAddress]);
    
    res.json({
      orderId,
      riskScore,
      riskLevel,
      action,
      riskFactors,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Report fraud
app.post('/api/fraud/report', async (req, res) => {
  try {
    const { orderId, userId, reportedBy, reason, evidence } = req.body;
    
    await pool.query(`
      INSERT INTO fraud_reports (order_id, user_id, reported_by, reason, evidence, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
    `, [orderId, userId, reportedBy, reason, JSON.stringify(evidence)]);
    
    // Update user risk profile
    await pool.query(`
      UPDATE user_profiles 
      SET fraud_reports = fraud_reports + 1 
      WHERE user_id = $1
    `, [userId]);
    
    res.json({ message: 'Fraud report submitted', status: 'pending' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get fraud analytics
app.get('/api/fraud/analytics', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    const allowedPeriods = {
      '7d': '7 days',
      '30d': '30 days',
      '1y': '1 year'
    };
    const interval = allowedPeriods[period] || '7 days';
    
    const [totalChecks, blockedTransactions, fraudReports] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM fraud_checks WHERE created_at >= NOW() - INTERVAL '${interval}'`),
      pool.query(`SELECT COUNT(*) FROM fraud_checks WHERE action = 'block' AND created_at >= NOW() - INTERVAL '${interval}'`),
      pool.query(`SELECT COUNT(*) FROM fraud_reports WHERE created_at >= NOW() - INTERVAL '${interval}'`)
    ]);
    
    const riskDistribution = await pool.query(`
      SELECT risk_level, COUNT(*) as count
      FROM fraud_checks 
      WHERE created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY risk_level
    `);
    
    res.json({
      period,
      totalChecks: parseInt(totalChecks.rows[0].count),
      blockedTransactions: parseInt(blockedTransactions.rows[0].count),
      fraudReports: parseInt(fraudReports.rows[0].count),
      riskDistribution: riskDistribution.rows,
      blockRate: (parseInt(blockedTransactions.rows[0].count) / parseInt(totalChecks.rows[0].count) * 100).toFixed(2)
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'fraud-detection-service' });
});

app.listen(port, () => {
  console.log(`Fraud detection service running on port ${port}`);
});