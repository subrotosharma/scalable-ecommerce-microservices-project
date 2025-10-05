const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const redis = require('redis');
const cors = require('cors');
const helmet = require('helmet');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const { authenticateToken } = require('../middleware/auth');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const app = express();
const port = process.env.PORT || 8080;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Strict limit for auth endpoints
  message: 'Too many authentication attempts, please try again later'
});

app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const csrfProtection = csrf({ 
  cookie: { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  } 
});
app.use('/api/users', csrfProtection);

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME || 'easybuybd',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Input validation
const validateEmail = (email) => {
  if (typeof email !== 'string' || email.length > 254) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 8;
};

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: 6379
});

app.post('/api/users/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    // Validate inputs
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const result = await pool.query(
      'INSERT INTO users (email, password, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name',
      [email.toLowerCase(), hashedPassword, firstName.trim(), lastName.trim()]
    );
    
    logger.info('User registered', { userId: result.rows[0].id, email: email.replace(/[\r\n]/g, '') });
    res.status(201).json({ ...result.rows[0], csrfToken: req.csrfToken() });
  } catch (error) {
    logger.error('Registration error', { error: error.message.replace(/[\r\n]/g, ''), email: req.body?.email?.replace(/[\r\n]/g, '') });
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!validateEmail(email) || !password) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      logger.warn('Failed login attempt', { email: email.replace(/[\r\n]/g, ''), ip: req.ip });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '24h' });
    
    logger.info('User logged in', { userId: user.id, email: email.replace(/[\r\n]/g, '') });
    res.json({ 
      token, 
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name },
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    logger.error('Login error', { error: error.message.replace(/[\r\n]/g, ''), email: req.body?.email?.replace(/[\r\n]/g, '') });
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/users/profile/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'user-service', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Health check failed', { error: error.message.replace(/[\r\n]/g, '') });
    res.status(503).json({ status: 'unhealthy', service: 'user-service' });
  }
});

app.listen(port, () => {
  console.log(`User service running on port ${port}`);
});