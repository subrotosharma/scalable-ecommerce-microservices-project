const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'gateway.log' })
  ]
});

// Rate limiting
const createRateLimit = (windowMs, max) => rateLimit({
  windowMs,
  max,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Service routes with rate limiting
const services = {
  '/api/auth': { target: 'http://user-service:8080', limit: createRateLimit(15 * 60 * 1000, 20) },
  '/api/users': { target: 'http://user-service:8080', limit: createRateLimit(15 * 60 * 1000, 100) },
  '/api/cart': { target: 'http://cart-service:8081', limit: createRateLimit(15 * 60 * 1000, 200) },
  '/api/payments': { target: 'http://payment-service:8082', limit: createRateLimit(15 * 60 * 1000, 50) },
  '/api/orders': { target: 'http://order-service:8083', limit: createRateLimit(15 * 60 * 1000, 100) },
  '/api/products': { target: 'http://product-service:8084', limit: createRateLimit(15 * 60 * 1000, 300) },
  '/api/inventory': { target: 'http://inventory-service:8085', limit: createRateLimit(15 * 60 * 1000, 100) },
  '/api/profile': { target: 'http://profile-service:8086', limit: createRateLimit(15 * 60 * 1000, 100) },
  '/api/search': { target: 'http://search-service:8087', limit: createRateLimit(15 * 60 * 1000, 500) },
  '/api/reviews': { target: 'http://review-service:8088', limit: createRateLimit(15 * 60 * 1000, 100) },
  '/api/notifications': { target: 'http://notification-service:8089', limit: createRateLimit(15 * 60 * 1000, 20) },
  '/api/wishlist': { target: 'http://wishlist-service:8090', limit: createRateLimit(15 * 60 * 1000, 100) },
  '/api/admin': { target: 'http://admin-service:8091', limit: createRateLimit(15 * 60 * 1000, 50) }
};

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  next();
});

// Setup proxy routes
Object.entries(services).forEach(([path, config]) => {
  app.use(path, config.limit, createProxyMiddleware({
    target: config.target,
    changeOrigin: true,
    timeout: 30000,
    proxyTimeout: 30000,
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${path}:`, err.message);
      res.status(503).json({ error: 'Service temporarily unavailable' });
    },
    onProxyReq: (proxyReq, req, res) => {
      proxyReq.setHeader('X-Forwarded-For', req.ip);
      proxyReq.setHeader('X-Gateway-Request-ID', Math.random().toString(36).substr(2, 9));
    }
  }));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Gateway error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  logger.info(`API Gateway started on port ${PORT}`);
});