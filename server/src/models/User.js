const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('@config/envConfig');

// Indexes for better query performance
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
      maxlength: [50, 'Name can not be more than 50 characters'],
      index: true
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please add a valid email'
      ]
    },
    role: {
      type: String,
      enum: ['user', 'publisher', 'admin'],
      default: 'user'
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false,
      validate: {
        validator: function(v) {
          // At least one uppercase, one lowercase, one number and one special character
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v);
        },
        message: props => 
          'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
      }
    },
    passwordChangedAt: Date,
    passwordResetToken: {
      type: String,
      index: true
    },
    passwordResetExpires: {
      type: Date,
      index: true
    },
    emailVerificationToken: {
      type: String,
      index: true
    },
    emailVerificationExpires: {
      type: Date,
      index: true
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: Date,
    lastActive: Date,
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    accountLockedUntil: {
      type: Date,
      select: false
    },
    refreshToken: {
      type: String,
      select: false,
      index: true
    },
    refreshTokenExpire: {
      type: Date,
      select: false,
      index: true
    },
    profileImage: {
      type: String,
      default: 'default.jpg'
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot be more than 500 characters']
    },
    website: {
      type: String,
      match: [
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
        'Please use a valid URL with HTTP or HTTPS'
      ]
    },
    social: {
      twitter: String,
      facebook: String,
      linkedin: String,
      instagram: String,
      github: String
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();
  
  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  
  // Delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

// Update passwordChangedAt property for the user when password is modified
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  
  // Set passwordChangedAt to current time - 1 second to ensure token is created after
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Document middleware to set emailVerificationExpires when emailVerificationToken is set
userSchema.pre('save', function(next) {
  if (this.isModified('emailVerificationToken') && this.emailVerificationToken) {
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  }
  next();
});

// Document middleware to set passwordResetExpires when passwordResetToken is set
userSchema.pre('save', function(next) {
  if (this.isModified('passwordResetToken') && this.passwordResetToken) {
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  }
  next();
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id, 
      role: this.role 
    },
    config.jwt.accessToken.secret,
    { 
      expiresIn: config.jwt.accessToken.expiresIn,
      issuer: 'mern-blog-api',
      audience: 'mern-blog-client'
    }
  );
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user changed password after the token was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  // False means NOT changed
  return false;
};

// Generate and hash refresh token
userSchema.methods.getRefreshToken = function() {
  // Generate token
  const refreshToken = crypto.randomBytes(40).toString('hex');
  
  // Hash token and set to refreshToken field
  this.refreshToken = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');
    
  // Set expire time (7 days)
  this.refreshTokenExpire = Date.now() + 7 * 24 * 60 * 60 * 1000;

  // Return plain token (not hashed)
  return refreshToken;
};

// Generate email verification token
userSchema.methods.getEmailVerificationToken = function() {
  // Generate token
  const verificationToken = crypto.randomBytes(20).toString('hex');
  
  // Hash token and set to emailVerificationToken field
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
    
  // Set expire time (24 hours)
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  
  // Return plain token (not hashed)
  return verificationToken;
};

// Generate password reset token
userSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  // Hash token and set to passwordResetToken field
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  // Set expire time (10 minutes)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
  // Return plain token (not hashed)
  return resetToken;
};

// Check if account is locked due to too many failed login attempts
userSchema.methods.isAccountLocked = function() {
  if (this.accountLockedUntil && this.accountLockedUntil > Date.now()) {
    return true;
  }
  // Reset failed attempts if lock has expired
  if (this.failedLoginAttempts >= 5) {
    this.failedLoginAttempts = 0;
    this.accountLockedUntil = undefined;
    this.save({ validateBeforeSave: false });
  }
  return false;
};

// Increment failed login attempts and lock account if necessary
userSchema.methods.incrementLoginAttempts = async function() {
  // If account is already locked, don't increment
  if (this.accountLockedUntil && this.accountLockedUntil > Date.now()) {
    return;
  }
  
  this.failedLoginAttempts += 1;
  
  // Lock account after 5 failed attempts for 30 minutes
  if (this.failedLoginAttempts >= 5) {
    this.accountLockedUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
  }
  
  await this.save({ validateBeforeSave: false });
};

// Static method to find user by credentials
userSchema.statics.findByCredentials = async function(email, password) {
  // Find user by email
  const user = await this.findOne({ email }).select('+password +failedLoginAttempts +accountLockedUntil');
  
  // If user doesn't exist or password is wrong
  if (!user || !(await user.matchPassword(password))) {
    if (user) {
      await user.incrementLoginAttempts();
    }
    throw new Error('Invalid email or password');
  }
  
  // Check if account is locked
  if (user.isAccountLocked()) {
    const timeLeft = Math.ceil((user.accountLockedUntil - Date.now()) / 60000);
    throw new Error(`Account locked. Try again in ${timeLeft} minutes.`);
  }
  
  // Reset failed login attempts on successful login
  if (user.failedLoginAttempts > 0) {
    user.failedLoginAttempts = 0;
    if (user.accountLockedUntil) {
      user.accountLockedUntil = undefined;
    }
    await user.save({ validateBeforeSave: false });
  }
  
  return user;
};

// Static method to find user by refresh token
userSchema.statics.findByRefreshToken = async function(refreshToken) {
  if (!refreshToken) {
    throw new Error('No refresh token provided');
  }
  
  // Hash the refresh token
  const hashedToken = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');
  
  // Find user with matching refresh token that hasn't expired
  return await this.findOne({
    refreshToken: hashedToken,
    refreshTokenExpire: { $gt: Date.now() }
  });
};

// Static method to find user by password reset token
userSchema.statics.findByPasswordResetToken = async function(token) {
  if (!token) {
    throw new Error('No reset token provided');
  }
  
  // Hash the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Find user with matching reset token that hasn't expired
  return await this.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });
};

// Static method to find user by email verification token
userSchema.statics.findByEmailVerificationToken = async function(token) {
  if (!token) {
    throw new Error('No verification token provided');
  }
  
  // Hash the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Find user with matching verification token that hasn't expired
  return await this.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() }
  });
};

userSchema.methods.getResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

userSchema.methods.getEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(20).toString('hex');
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  return verificationToken;
};

userSchema.pre('remove', async function(next) {
  await this.model('Post').deleteMany({ author: this._id });
  next();
});

// Reverse populate with virtuals
userSchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'author',
  justOne: false
});

// Create indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ refreshToken: 1, refreshTokenExpire: 1 });
userSchema.index({ emailVerificationToken: 1, emailVerificationExpires: 1 });
userSchema.index({ passwordResetToken: 1, passwordResetExpires: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
