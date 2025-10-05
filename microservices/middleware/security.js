const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const xss = require('xss');

// Rate limiting configurations
const createRateLimit = (windowMs, max, message = 'Too many requests') => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    }
  });
};

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Input validation middleware
const validateInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return xss(validator.escape(str));
  };

  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Email validation
const validateEmail = (email) => {
  return validator.isEmail(email) && validator.isLength(email, { max: 254 });
};

// Password validation
const validatePassword = (password) => {
  return validator.isLength(password, { min: 8, max: 128 }) &&
         /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);
};

// SQL injection prevention
const preventSQLInjection = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(;|\-\-|\#|\/\*|\*\/)/,
    /(\b(OR|AND)\b.*=.*)/i
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };

  const checkObject = (obj) => {
    for (const value of Object.values(obj)) {
      if (typeof value === 'string' && checkValue(value)) {
        return true;
      } else if (typeof value === 'object' && value !== null) {
        if (checkObject(value)) return true;
      }
    }
    return false;
  };

  if (req.body && checkObject(req.body)) {
    return res.status(400).json({ error: 'Invalid input detected' });
  }

  if (req.query && checkObject(req.query)) {
    return res.status(400).json({ error: 'Invalid query parameters' });
  }

  next();
};

// Request size limiting
const requestSizeLimit = (limit = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.get('content-length');
    if (contentLength && parseInt(contentLength) > parseSize(limit)) {
      return res.status(413).json({ error: 'Request too large' });
    }
    next();
  };
};

const parseSize = (size) => {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
  return match ? parseInt(match[1]) * units[match[2]] : 0;
};

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'https://easybuybd.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

module.exports = {
  createRateLimit,
  securityHeaders,
  validateInput,
  validateEmail,
  validatePassword,
  preventSQLInjection,
  requestSizeLimit,
  corsOptions
};