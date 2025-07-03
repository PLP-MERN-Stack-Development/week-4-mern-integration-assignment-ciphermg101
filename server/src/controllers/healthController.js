const mongoose = require('mongoose');
const ApiError = require('@utils/ApiError');

/**
 * @desc    Health check endpoint
 * @route   GET /health
 * @access  Public
 */
const healthCheck = async (req, res, next) => {
  try {
    // Check database connection
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : 'disconnected';

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const formatMemoryUsage = (bytes) => 
      `${Math.round(bytes / 1024 / 1024 * 100) / 100} MB`;

    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        connectionState: dbState,
      },
      memory: {
        rss: formatMemoryUsage(memoryUsage.rss),
        heapTotal: formatMemoryUsage(memoryUsage.heapTotal),
        heapUsed: formatMemoryUsage(memoryUsage.heapUsed),
        external: formatMemoryUsage(memoryUsage.external),
      },
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    next(new ApiError(503, 'Service Unavailable', true, error.stack));
  }
};

module.exports = {
  healthCheck,
};
