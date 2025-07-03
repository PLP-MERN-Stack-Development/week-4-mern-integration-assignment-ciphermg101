const helmet = require('helmet');
const hpp = require('hpp');
const cors = require('cors');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const ApiError = require('@utils/ApiError');

// Set security HTTP headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'same-origin' },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
  ieNoOpen: true,
});

// Enable CORS
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400, // 24 hours
};

const corsMiddleware = cors(corsOptions);

// Prevent HTTP Parameter Pollution
const hppMiddleware = hpp({
  whitelist: [
    'filter',
    'sort',
    'limit',
    'page',
    'fields',
    'select',
    'populate',
    'search',
  ],
});

// Sanitize data
const sanitizeData = [
  // Sanitize request data
  mongoSanitize(),
  
  // Prevent XSS attacks
  xss(),
  
  // Prevent parameter pollution
  hppMiddleware,
];

// Rate limiting for public APIs
const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  securityHeaders,
  corsMiddleware,
  sanitizeData,
  publicApiLimiter,
};
