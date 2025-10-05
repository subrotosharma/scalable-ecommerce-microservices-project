const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const winston = require('winston');
const rateLimit = require('express-rate-limit');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const pool = new Pool({
  user: process.env.DB_USER || 'dbadmin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'easybuybd',
  password: process.env.DB_PASSWORD || 'password123',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      logger.warn('Authentication attempt without token', { ip: req.ip });
      return res.status(401).json({ error: 'Access token required' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    jwt.verify(token, secret, (err, user) => {
      if (err) {
        logger.warn('Invalid token attempt', { ip: req.ip, error: err.message });
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      
      if (!user || !user.userId) {
        logger.warn('Invalid token payload', { ip: req.ip });
        return res.status(403).json({ error: 'Invalid token payload' });
      }
      
      req.user = user;
      logger.info('Successful authentication', { userId: user.userId, ip: req.ip });
      next();
    });
  } catch (error) {
    logger.error('Authentication error', { error: error.message, ip: req.ip });
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      logger.warn('Admin check without valid user', { ip: req.ip });
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (result.rows.length === 0) {
      logger.warn('User not found for admin check', { userId: req.user.userId, ip: req.ip });
      return res.status(403).json({ error: 'User not found' });
    }
    
    if (result.rows[0].role !== 'admin') {
      logger.warn('Admin access denied', { userId: req.user.userId, role: result.rows[0].role, ip: req.ip });
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    logger.error('Admin check error', { error: error.message, userId: req.user?.userId });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { authenticateToken, requireAdmin, authLimiter };