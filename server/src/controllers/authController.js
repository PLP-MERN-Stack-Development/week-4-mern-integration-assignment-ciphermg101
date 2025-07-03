const User = require('@models/User');
const ApiError = require('@utils/ApiError');
const sendEmail = require('@utils/sendEmail');
const config = require('@config/envConfig');

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const user = await User.create({
      name,
      email,
      password,
      role: req.body.role || 'user'
    });

    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verificationUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/verify-email/${verificationToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Email Verification',
        html: `Please verify your email by clicking on the following link: <a href="${verificationUrl}">Verify Email</a>`
      });

      await sendTokenResponse(user, 201, res);
    } catch (err) {
      user.emailVerificationToken = undefined;
      await user.save({ validateBeforeSave: false });
      return next(new ApiError('Email could not be sent', 500));
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Verify email
// @route   GET /api/v1/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res, next) => {
  try {
    // Get hashed token
    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken,
      isEmailVerified: false
    });

    if (!user) {
      return next(new ApiError('Invalid token or email already verified', 400));
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return next(new ApiError('Please provide an email and password', 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password +refreshToken');

    if (!user) {
      return next(new ApiError('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      // Increment failed login attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      await user.save({ validateBeforeSave: false });
      
      return next(new ApiError('Invalid credentials', 401));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(new ApiError('Your account has been deactivated', 401));
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return next(new ApiError('Please verify your email before logging in', 401));
    }

    // Reset failed login attempts on successful login
    user.failedLoginAttempts = 0;
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    // Send token response
    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Login error:', err);
    next(new ApiError('Login failed. Please try again.', 500));
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    // The user should already be attached to the request by the protect middleware
    const user = req.user;
    
    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }
    
    // Get fresh user data from the database
    const freshUser = await User.findById(user.id).select('-password -refreshToken');
    
    if (!freshUser) {
      return next(new ApiError(404, 'User not found'));
    }
    
    // Update last login time
    freshUser.lastLogin = Date.now();
    await freshUser.save({ validateBeforeSave: false });
    
    res.status(200).json({
      success: true,
      data: {
        id: freshUser._id,
        name: freshUser.name,
        email: freshUser.email,
        role: freshUser.role,
        isEmailVerified: freshUser.isEmailVerified,
        isActive: freshUser.isActive,
        lastLogin: freshUser.lastLogin,
        createdAt: freshUser.createdAt,
        updatedAt: freshUser.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return next(new ApiError('There is no user with that email', 404));
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/auth/resetpassword/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password reset token',
        message
      });

      res.status(200).json({ 
        success: true, 
        message: 'Email sent' 
      });
    } catch (err) {
      console.log(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return next(new ApiError('Email could not be sent', 500));
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Reset password
// @route   PUT /api/v1/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return next(new ApiError('Invalid token', 400));
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      bio: req.body.bio,
      website: req.body.website
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return next(new ApiError('Password is incorrect', 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    if (req.user?.id) {
      // Clear refresh token and related fields from database
      await User.findByIdAndUpdate(req.user.id, {
        $unset: { 
          refreshToken: 1, 
          refreshTokenExpire: 1,
          failedLoginAttempts: 1
        }
      });
    }
    
    // Clear HTTP-only cookies with proper options
    const clearCookieOptions = {
      ...config.jwt.cookieOptions,
      // Ensure cookies are cleared with the same options they were set with
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined
    };
    
    // Clear both cookies
    res.clearCookie('accessToken', clearCookieOptions);
    res.clearCookie('refreshToken', clearCookieOptions);
    
    // Additional clear for different paths/domains if needed
    res.clearCookie('accessToken', { ...clearCookieOptions, path: '/api' });
    res.clearCookie('refreshToken', { ...clearCookieOptions, path: '/api' });
    
    // Send response
    res.status(200).json({
      success: true,
      message: 'Successfully logged out',
      data: {}
    });
  } catch (err) {
    console.error('Logout error:', err);
    // Even if there's an error, try to clear cookies
    res.clearCookie('accessToken', config.jwt.cookieOptions);
    res.clearCookie('refreshToken', config.jwt.cookieOptions);
    next(new ApiError('Logout failed. Please try again.', 500));
  }
};

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res, next) => {
  try {
    // Get refresh token from body or cookie
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      return next(new ApiError('No refresh token provided', 400));
    }

    // Hash the refresh token to match with the one in the database
    const hashedToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Find user with matching refresh token that hasn't expired
    const user = await User.findOne({
      refreshToken: hashedToken,
      refreshTokenExpire: { $gt: Date.now() }
    });

    if (!user) {
      // Clear invalid tokens
      res.clearCookie('accessToken', config.jwt.cookieOptions);
      res.clearCookie('refreshToken', config.jwt.cookieOptions);
      return next(new ApiError('Invalid or expired refresh token', 401));
    }

    // Generate new access token
    const accessToken = user.getSignedJwtToken();

    // Generate new refresh token (rotation)
    const newRefreshToken = user.getRefreshToken();
    await user.save({ validateBeforeSave: false });

    // Set tokens in HTTP-only cookies
    const cookieOptions = {
      ...config.jwt.cookieOptions,
      // Override domain for production
      domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined
    };

    // Set access token (15 minutes)
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set refresh token (7 days)
    res.cookie('refreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Prepare user data for response
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive
    };

    // Send response with tokens
    res.status(200).json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
      user: userData
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    // Clear any invalid tokens on error
    res.clearCookie('accessToken', config.jwt.cookieOptions);
    res.clearCookie('refreshToken', config.jwt.cookieOptions);
    next(new ApiError('Failed to refresh token', 500));
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  try {
    // Create access token
    const accessToken = user.getSignedJwtToken();
    
    // Generate and save refresh token
    const refreshToken = user.getRefreshToken();
    user.save({ validateBeforeSave: false });
    
    // Set cookie options
    const cookieOptions = {
      ...config.jwt.cookieOptions,
      // Override domain for production
      domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined
    };
    
    // Set access token cookie (15 minutes)
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    
    // Set refresh token cookie (7 days)
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    // Remove sensitive data from output
    user.password = undefined;
    user.refreshToken = undefined;
    
    // Prepare user data for response
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt
    };
    
    // Send response
    res.status(statusCode).json({
      success: true,
      accessToken,
      refreshToken,
      user: userData
    });
  } catch (error) {
    console.error('Error in sendTokenResponse:', error);
    throw new Error('Failed to generate authentication tokens');
    throw error;
  }
};
