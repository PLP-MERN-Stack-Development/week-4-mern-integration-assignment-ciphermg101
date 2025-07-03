require('module-alias/register');
const express = require('express');
const path = require('path');
const connectDB = require('@config/db');
const { securityHeaders, corsMiddleware, sanitizeData, publicApiLimiter } = require('@middleware/security');
const { globalErrorHandler, notFound } = require('@utils/errorHandler');
const logger = require('@utils/logger');

const app = express();

app.use(securityHeaders);
app.use(corsMiddleware);
app.set('trust proxy', 1);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(sanitizeData);

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

app.use('/api', publicApiLimiter);

// API routes
const apiRoutes = [
  require('./src/routes/auth'),
  require('./src/routes/posts'),
  require('./src/routes/categories')
];

apiRoutes.forEach(route => app.use('/api', route));

// Handle 404 for API routes
app.use('/api', notFound);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// Global error handler
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;