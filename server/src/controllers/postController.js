const Post = require('../models/Post');
const ApiError = require('@utils/ApiError');
const logger = require('../utils/logger');
const config = require('@config/envConfig');
const path = require('path');

// @desc    Get all posts
// @route   GET /api/v1/posts
// @access  Public
exports.getPosts = async (req, res, next) => {
  try {
    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit'];

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Finding resource
    let query = Post.find(JSON.parse(queryStr))
      .populate('author', 'name email')
      .populate('categories', 'name slug');

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Post.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const posts = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: posts.length,
      pagination,
      data: posts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single post
// @route   GET /api/v1/posts/:id
// @access  Public
exports.getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name email')
      .populate('categories', 'name slug');

    if (!post) {
      return next(
        new ApiError(`Post not found with id of ${req.params.id}`, 404)
      );
    }

    // Increment view count
    post.viewCount += 1;
    await post.save();

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new post
// @route   POST /api/v1/posts
// @access  Private
exports.createPost = async (req, res, next) => {
  try {
    // Add user to req.body
    req.body.author = req.user.id;

    // Publish the post if status is published
    if (req.body.status === 'published') {
      req.body.publishedAt = Date.now();
    }

    const post = await Post.create(req.body);

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update post
// @route   PUT /api/v1/posts/:id
// @access  Private
exports.updatePost = async (req, res, next) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) {
      return next(
        new ApiError(`Post not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is post owner or admin
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ApiError(
          `User ${req.user.id} is not authorized to update this post`,
          401
        )
      );
    }

    // If status is being updated to published and it wasn't published before
    if (req.body.status === 'published' && post.status !== 'published') {
      req.body.publishedAt = Date.now();
    }

    post = await Post.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete post
// @route   DELETE /api/v1/posts/:id
// @access  Private
exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return next(
        new ApiError(`Post not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is post owner or admin
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ApiError(
          `User ${req.user.id} is not authorized to delete this post`,
          401
        )
      );
    }

    await post.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Upload photo for post
// @route   PUT /api/v1/posts/:id/photo
// @access  Private
exports.postPhotoUpload = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return next(new ApiError(`Post not found with id of ${req.params.id}`, 404));
    }

    if (!req.files) {
      return next(new ApiError(`Please upload a file`, 400));
    }

    const file = req.files.file;

    // Make sure the image is a photo
    if (!file.mimetype.startsWith('image')) {
      return next(new ApiError(`Please upload an image file`, 400));
    }

    // Check file size
    if (file.size > config.upload.maxFileSize) {
      return next(
        new ApiError(
          `Please upload an image less than ${config.upload.maxFileSize} bytes`,
          400
        )
      );
    }

    // Create custom filename
    file.name = `photo_${post._id}${path.parse(file.name).ext}`;

    file.mv(`${config.upload.path}/${file.name}`, async err => {
      if (err) {
        console.error(err);
        return next(new ApiError(`Problem with file upload`, 500));
      }

      await Post.findByIdAndUpdate(req.params.id, { photo: file.name });

      res.status(200).json({
        success: true,
        data: file.name
      });
    });
  } catch (err) {
    next(err);
  }
};
