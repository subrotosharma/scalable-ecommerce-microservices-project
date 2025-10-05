const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const prometheus = require('prom-client');
const fetch = require('node-fetch');
const validator = require('validator');

const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const monitoringLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many monitoring requests'
});

app.use('/api/monitoring', monitoringLimiter);
app.use(express.json({ limit: '1mb' }));

const csrfProtection = csrf({ cookie: true });
app.use('/api/monitoring', csrfProtection);

// Prometheus metrics
const register = new prometheus.Registry();
prometheus.collectDefaultMetrics({ register });

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeConnections);

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Service health checks
const services = [
  { name: 'user-service', url: 'http://user-service:8080/health' },
  { name: 'cart-service', url: 'http://cart-service:8081/health' },
  { name: 'payment-service', url: 'http://payment-service:8082/health' },
  { name: 'order-service', url: 'http://order-service:8083/health' },
  { name: 'product-service', url: 'http://product-service:8084/health' },
  { name: 'inventory-service', url: 'http://inventory-service:8085/health' },
  { name: 'profile-service', url: 'http://profile-service:8086/health' },
  { name: 'search-service', url: 'http://search-service:8087/health' },
  { name: 'review-service', url: 'http://review-service:8088/health' },
  { name: 'notification-service', url: 'http://notification-service:8089/health' },
  { name: 'wishlist-service', url: 'http://wishlist-service:8090/health' },
  { name: 'admin-service', url: 'http://admin-service:8091/health' }
];

// Health check endpoint
app.get('/api/monitoring/health', async (req, res) => {
  const healthChecks = await Promise.allSettled(
    services.map(async (service) => {
      try {
        const response = await fetch(service.url, { 
          method: 'GET',
          timeout: 5000 
        });
        return {
          name: service.name,
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime: Date.now()
        };
      } catch (error) {
        return {
          name: service.name,
          status: 'unhealthy',
          error: error.message
        };
      }
    })
  );

  const results = healthChecks.map((result, index) => ({
    service: services[index].name,
    ...result.value
  }));

  const overallHealth = results.every(r => r.status === 'healthy') ? 'healthy' : 'degraded';

  res.json({
    status: overallHealth,
    timestamp: new Date().toISOString(),
    services: results
  });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Log aggregation endpoint
app.post('/api/monitoring/logs', (req, res) => {
  const { level, message, service, metadata } = req.body;
  
  const validLevels = ['error', 'warn', 'info', 'debug'];
  const sanitizedLevel = validLevels.includes(level) ? level : 'info';
  const sanitizedMessage = validator.escape(message || 'No message');
  const sanitizedService = validator.escape(service || 'unknown');
  
  logger.log(sanitizedLevel, sanitizedMessage, {
    service: sanitizedService,
    timestamp: new Date().toISOString()
  });
  
  res.json({ success: true });
});

// Get recent logs
app.get('/api/monitoring/logs', (req, res) => {
  const { level = 'info', limit = 100 } = req.query;
  
  // In production, this would query a log aggregation system
  res.json({
    logs: [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Sample log entry',
        service: 'monitoring-service'
      }
    ]
  });
});

// System metrics
app.get('/api/monitoring/metrics', (req, res) => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  res.json({
    timestamp: new Date().toISOString(),
    memory: {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    uptime: process.uptime()
  });
});

// Error tracking
app.post('/api/monitoring/errors', (req, res) => {
  const { error, service, context } = req.body;
  
  const sanitizedError = validator.escape(error || 'Unknown error');
  const sanitizedService = validator.escape(service || 'unknown');
  
  logger.error('Application error', {
    error: sanitizedError,
    service: sanitizedService,
    timestamp: new Date().toISOString()
  });
  
  res.json({ success: true });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'monitoring-service', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 8092;
app.listen(PORT, () => {
  console.log(`Monitoring service running on port ${PORT}`);
  logger.info(`Monitoring service started on port ${PORT}`);
});