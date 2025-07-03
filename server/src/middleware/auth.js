const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('@models/User');
const ApiError = require('@utils/ApiError');
const config = require('@config/envConfig');

// Verify access token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header or cookie
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      // If no access token but refresh token exists, try to refresh
      if (req.cookies?.refreshToken) {
        return refreshToken(req, res, next);
      }
      return next(new ApiError(401, 'Not authorized to access this route - No token'));
    }

    try {
      // Verify access token
      const decoded = jwt.verify(token, config.jwt.accessToken.secret, {
        issuer: 'mern-blog-api',
        audience: 'mern-blog-client'
      });
      
      // Get user from the token
      const user = await User.findById(decoded.id).select('-password -refreshToken');
      
      if (!user) {
        // Clear any invalid tokens
        res.clearCookie('accessToken', config.jwt.cookieOptions);
        res.clearCookie('refreshToken', config.jwt.cookieOptions);
        return next(new ApiError(401, 'User not found with this token'));
      }
      
      // Check if user is active
      if (!user.isActive) {
        return next(new ApiError(401, 'User account is deactivated'));
      }
      
      // Check if user needs to change password
      if (user.passwordChangedAt) {
        const changedTimestamp = parseInt(
          user.passwordChangedAt.getTime() / 1000,
          10
        );

        if (decoded.iat < changedTimestamp) {
          return next(
            new ApiError(401, 'User recently changed password. Please log in again')
          );
        }
      }
      
      // Attach user to request
      req.user = user;
      
      return next();
    } catch (tokenError) {
      // If token is expired and we have a refresh token, try to refresh
      if (tokenError.name === 'TokenExpiredError' && req.cookies?.refreshToken) {
        return refreshToken(req, res, next);
      }
      // For any other token error, clear the invalid tokens
      res.clearCookie('accessToken', config.jwt.cookieOptions);
      res.clearCookie('refreshToken', config.jwt.cookieOptions);
      return next(new ApiError(401, 'Not authorized, invalid token'));
    }
  } catch (err) {
    return next(err);
  }
};

// Refresh access token
const refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      // Clear any existing tokens
      res.clearCookie('accessToken', config.jwt.cookieOptions);
      res.clearCookie('refreshToken', config.jwt.cookieOptions);
      return next(new ApiError(401, 'No refresh token provided'));
    }
    
    // Find user with matching refresh token
    const hashedToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
      
    const user = await User.findOne({
      refreshToken: hashedToken,
      refreshTokenExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      // Clear invalid tokens
      res.clearCookie('accessToken', config.jwt.cookieOptions);
      res.clearCookie('refreshToken', config.jwt.cookieOptions);
      return next(new ApiError(401, 'Invalid or expired refresh token'));
    }
    
    // Generate new tokens
    const accessToken = user.getSignedJwtToken();
    const newRefreshToken = user.getRefreshToken();
    
    // Hash the new refresh token
    const newHashedRefreshToken = crypto
      .createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');
    
    // Update user with new refresh token
    user.refreshToken = newHashedRefreshToken;
    user.refreshTokenExpire = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    
    await user.save({ validateBeforeSave: false });
    
    // Set new tokens in HTTP-only cookies
    res.cookie('refreshToken', newRefreshToken, {
      ...config.jwt.cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    res.cookie('accessToken', accessToken, {
      ...config.jwt.cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    
    // For API requests, return the new tokens in the response
    if (req.get('accept') === 'application/json') {
      return res.status(200).json({
        success: true,
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isActive: user.isActive
        }
      });
    }
    
    // For non-API requests, attach user to request and continue
    req.user = user;
    return next();
  } catch (error) {
    // Clear any invalid tokens on error
    res.clearCookie('accessToken', config.jwt.cookieOptions);
    res.clearCookie('refreshToken', config.jwt.cookieOptions);
    return next(new ApiError(401, 'Invalid refresh token'));
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `User role ${req.user.role} is not authorized to access this route`
        )
      );
    }
    next();
  };
};

// Check if user is the owner of the resource
exports.checkOwnership = (model) => {
  return async (req, res, next) => {
    const resource = await model.findById(req.params.id);
    
    if (!resource) {
      return next(
        new ApiError(404, `Resource not found with id of ${req.params.id}`)
      );
    }
    
    // Check if user is resource owner or admin
    if (
      resource.user && 
      resource.user.toString() !== req.user.id && 
      req.user.role !== 'admin'
    ) {
      return next(
        new ApiError(
          403,
          `User ${req.user.id} is not authorized to update this resource`
        )
      );
    }
    
    next();
  };
};
