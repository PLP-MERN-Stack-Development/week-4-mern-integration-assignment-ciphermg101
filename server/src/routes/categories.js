const express = require('express');
const { check } = require('express-validator');
const categoryController = require('@controllers/categoryController');
const { protect, authorize } = require('@middleware/auth');

const router = express.Router();

router.get('/', categoryController.getCategories);
// @route   GET /api/categories
router.get('/:id', categoryController.getCategory);

router.use(protect);
router.use(authorize('admin'));

router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty()
  ],
  categoryController.createCategory
);

router.put(
  '/:id',
  [
    check('name', 'Name is required').not().isEmpty()
  ],
  categoryController.updateCategory
);

router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
