const express = require('express');
const { check } = require('express-validator');
const postController = require('@controllers/postController');
const { protect, authorize } = require('@middleware/auth');

const router = express.Router();

// @route   GET /api/posts
router.get('/', postController.getPosts);
router.get('/:id', postController.getPost);

router.use(protect);

router.post(
  '/',
  [
    check('title', 'Title is required').not().isEmpty(),
    check('content', 'Content is required').not().isEmpty(),
    check('categories', 'At least one category is required').isArray({ min: 1 })
  ],
  postController.createPost
);

router.put(
  '/:id',
  [
    check('title', 'Title is required').not().isEmpty(),
    check('content', 'Content is required').not().isEmpty(),
    check('categories', 'At least one category is required').isArray({ min: 1 })
  ],
  postController.updatePost
);

router.delete('/:id', postController.deletePost);

// Routes that require admin role
router.use(authorize('admin'));

// Routes that require admin privileges
router.put('/:id/photo', postController.postPhotoUpload);

module.exports = router;
