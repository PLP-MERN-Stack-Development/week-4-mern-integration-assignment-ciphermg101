const express = require('express');
const { healthCheck } = require('@controllers/healthController');

const router = express.Router();

/**
 * @route   GET /health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', healthCheck);

module.exports = router;
