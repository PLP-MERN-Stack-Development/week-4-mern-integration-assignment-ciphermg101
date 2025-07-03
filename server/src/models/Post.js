const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters']
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true
    },
    excerpt: {
      type: String,
      maxlength: [500, 'Excerpt cannot be more than 500 characters'],
      trim: true
    },
    featuredImage: {
      type: String,
      default: ''
    },
    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'At least one category is required']
    }],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft'
    },
    publishedAt: {
      type: Date
    },
    tags: [{
      type: String,
      trim: true
    }],
    viewCount: {
      type: Number,
      default: 0
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    meta: {
      title: String,
      description: String,
      keywords: [String]
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Create slug from title before saving
postSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')      // Replace spaces with -
      .replace(/--+/g, '-')      // Replace multiple - with single -
      .trim();
  }
  
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = Date.now();
  }
  
  // Generate excerpt from content if not provided
  if (this.isModified('content') && !this.excerpt) {
    this.excerpt = this.content.substring(0, 200) + (this.content.length > 200 ? '...' : '');
  }
  
  next();
});

// Virtual for comments on this post
postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post',
  justOne: false
});

// Index for better query performance
postSchema.index({ title: 'text', content: 'text', tags: 'text' });
postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ author: 1 });
postSchema.index({ categories: 1 });

// Static method to get published posts
postSchema.statics.getPublishedPosts = function(query = {}, options = {}) {
  const { page = 1, limit = 10, sort = { publishedAt: -1 }, select } = options;
  
  return this.find({ status: 'published', ...query })
    .select(select)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('author', 'name email')
    .populate('categories', 'name slug');
};

// Instance method to increment view count
postSchema.methods.incrementViewCount = async function() {
  this.viewCount += 1;
  await this.save();
};

module.exports = mongoose.model('Post', postSchema);
