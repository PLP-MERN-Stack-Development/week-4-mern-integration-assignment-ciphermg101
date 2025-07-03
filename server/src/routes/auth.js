const express = require('express');
const { check } = require('express-validator');
const authController = require('@controllers/authController');
const { protect } = require('@middleware/auth');
const { authLimiter } = require('@middleware/rateLimiter');

const router = express.Router();

// Apply rate limiting to all auth routes
router.use(authLimiter);

// Public routes
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  authController.register
);

router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  authController.login
);

router.get(
  '/verify-email/:token',
  authController.verifyEmail
);

router.post(
  '/forgotpassword',
  [
    check('email', 'Please include a valid email').isEmail()
  ],
  authController.forgotPassword
);

router.put(
  '/resetpassword/:resettoken',
  [
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  authController.resetPassword
);

// Protected routes
router.use(protect);

router.get('/me', authController.getMe);
router.put('/updatedetails', authController.updateDetails);
router.put('/updatepassword', authController.updatePassword);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);

module.exports = router;
