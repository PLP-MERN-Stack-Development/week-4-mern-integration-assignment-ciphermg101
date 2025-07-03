const ApiError = require('./ApiError');

/**
 * Handles errors in development environment with detailed stack traces
 * @param {Error} err - The error object
 * @param {Object} res - Express response object
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err
    }
  });
};

/**
 * Handles errors in production environment with sanitized responses
 * @param {Error} err - The error object
 * @param {Object} res - Express response object
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    
    res.status(500).json({
      success: false,
      message: 'Something went very wrong!'
    });
  }
};

/**
 * Handles CastError from Mongoose (invalid ID format)
 * @param {Error} err - The error object
 * @returns {ApiError} - New ApiError instance
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new ApiError(400, message);
};

/**
 * Handles duplicate field errors from MongoDB
 * @param {Error} err - The error object
 * @returns {ApiError} - New ApiError instance
 */
const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new ApiError(400, message);
};

/**
 * Handles validation errors from Mongoose
 * @param {Error} err - The error object
 * @returns {ApiError} - New ApiError instance
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new ApiError(400, message);
};

/**
 * Handles JWT errors
 * @returns {ApiError} - New ApiError instance
 */
const handleJWTError = () =>
  new ApiError(401, 'Invalid token. Please log in again!');

/**
 * Handles JWT expired error
 * @returns {ApiError} - New ApiError instance
 */
const handleJWTExpiredError = () =>
  new ApiError(401, 'Your token has expired! Please log in again.');

/**
 * Global error handling middleware
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

// 404 Not Found handler
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Not Found - ${req.originalUrl}`);
  next(error);
};

module.exports = {
  globalErrorHandler,
  notFound
};
