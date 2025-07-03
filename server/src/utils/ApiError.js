/**
 * Custom API error class that extends the built-in Error class
 * @class ApiError
 * @extends {Error}
 */
class ApiError extends Error {
  /**
   * Create a new ApiError
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {boolean} [isOperational=true] - Whether the error is operational
   * @param {string} [stack=''] - Error stack trace
   */
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    
    // Capture stack trace, excluding constructor call from it
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Create a bad request error (400)
   * @param {string} message - Error message
   * @returns {ApiError} New ApiError instance with 400 status code
   */
  static badRequest(message) {
    return new ApiError(400, message);
  }
  
  /**
   * Create an unauthorized error (401)
   * @param {string} [message='Unauthorized'] - Error message
   * @returns {ApiError} New ApiError instance with 401 status code
   */
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }
  
  /**
   * Create a forbidden error (403)
   * @param {string} [message='Forbidden'] - Error message
   * @returns {ApiError} New ApiError instance with 403 status code
   */
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }
  
  /**
   * Create a not found error (404)
   * @param {string} [message='Resource not found'] - Error message
   * @returns {ApiError} New ApiError instance with 404 status code
   */
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }
  
  /**
   * Create a conflict error (409)
   * @param {string} message - Error message
   * @returns {ApiError} New ApiError instance with 409 status code
   */
  static conflict(message) {
    return new ApiError(409, message);
  }
  
  /**
   * Create a validation error (422)
   * @param {string} message - Error message
   * @returns {ApiError} New ApiError instance with 422 status code
   */
  static validationError(message) {
    return new ApiError(422, message);
  }
  
  /**
   * Create an internal server error (500)
   * @param {string} [message='Internal server error'] - Error message
   * @param {boolean} [isOperational=false] - Whether the error is operational
   * @returns {ApiError} New ApiError instance with 500 status code
   */
  static internal(message = 'Internal server error', isOperational = false) {
    return new ApiError(500, message, isOperational);
  }
}

module.exports = ApiError;
