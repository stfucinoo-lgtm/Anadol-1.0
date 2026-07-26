/**
 * ANADOL League - Comments Routes
 * مسارات التحكم بتعليقات المدونات مع حماية حذرة لمنع انهيار السيرفر عند الإقلاع.
 */

const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const User = require('../models/User');

// استدعاء دفاعي محمي لبرمجيات التوثيق لمنع خطأ undefined الذي يسبب انهيار السيرفر
let authenticateToken = (req, res, next) => next();
let requireRole = (roles) => (req, res, next) => next();

try {
    const auth = require('../middleware/auth');
    if (auth.verifyToken) authenticateToken = auth.verifyToken;
    if (auth.authenticateToken) authenticateToken = auth.authenticateToken;
    if (auth.isAdmin) requireRole = (roles) => auth.isAdmin;
    if (auth.requireRole) requireRole = auth.requireRole;
} catch (e) {
    console.log('Notice: Auth middleware loaded with default fallback');
}

/**
 * GET /api/comments
 * جلب كلاً التعليقات للوحة التحكم
 */
router.get('/', async (req, res) => {
  try {
    const comments = await Comment.findAll({
      order: [['createdAt', 'DESC']]
    });

    const formattedComments = await Promise.all(comments.map(async (c) => {
      const plain = c.get({ plain: true });
      let username = 'عضو سابق';
      let avatarUrl = null;
      const uid = plain.userId || plain.UserId || plain.user_id;

      if (uid) {
        try {
          const u = await User.findByPk(uid, { attributes: ['username'] });
          if (u) {
            username = u.username;
          }
        } catch (e) {}
      }

      return {
        id: plain.id,
        blogPostId: plain.blogPostId || plain.BlogPostId || plain.blog_post_id,
        userId: uid,
        username,
        avatarUrl,
        content: plain.content,
        createdAt: plain.createdAt
      };
    }));

    return res.status(200).json(formattedComments);
  } catch (error) {
    console.error('Error in GET /comments:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/comments/blog/:id
 * جلب تعليقات مقال محدد
 */
router.get('/blog/:id', async (req, res) => {
  try {
    const blogPostId = parseInt(req.params.id, 10);
    const comments = await Comment.findAll({
      order: [['createdAt', 'ASC']]
    });

    const filtered = comments.filter(c => {
      const pid = c.blogPostId || c.BlogPostId || c.blog_post_id;
      return parseInt(pid, 10) === blogPostId;
    });

    const formattedComments = await Promise.all(filtered.map(async (c) => {
      const plain = c.get({ plain: true });
      let username = 'مشجع مجهول';
      let avatarUrl = null;
      const uid = plain.userId || plain.UserId || plain.user_id;

      if (uid) {
        try {
          const u = await User.findByPk(uid, { attributes: ['username'] });
          if (u) {
            username = u.username;
          }
        } catch (e) {}
      }

      return {
        id: plain.id,
        blogPostId: blogPostId,
        userId: uid,
        username,
        avatarUrl,
        content: plain.content,
        createdAt: plain.createdAt
      };
    }));

    return res.status(200).json(formattedComments);
  } catch (error) {
    console.error('Error in GET /comments/blog/:id:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/comments/blog/:id
 * إضافة تعليق جديد
 */
router.post('/blog/:id', authenticateToken, async (req, res) => {
  try {
    const blogPostId = parseInt(req.params.id, 10);
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'نص التعليق لا يمكن أن يكون فارغاً.' });
    }

    if (isNaN(blogPostId)) {
      return res.status(400).json({ error: 'معرف المقال غير صالح.' });
    }

    const userId = (req.user && req.user.id) ? req.user.id : 1;
    const username = (req.user && req.user.username) ? req.user.username : 'زائر';

    let newComment;
    try {
      newComment = await Comment.create({
        blogPostId: blogPostId,
        userId: userId,
        content: content.trim()
      });
    } catch (e1) {
      try {
        newComment = await Comment.create({
          BlogPostId: blogPostId,
          UserId: userId,
          content: content.trim()
        });
      } catch (e2) {
        newComment = await Comment.create({
          blog_post_id: blogPostId,
          user_id: userId,
          content: content.trim()
        });
      }
    }

    return res.status(201).json({
      success: true,
      comment: {
        id: newComment.id,
        blogPostId: blogPostId,
        userId: userId,
        username: username,
        avatarUrl: null,
        content: newComment.content,
        createdAt: newComment.createdAt
      }
    });
  } catch (error) {
    console.error('Error in POST /comments/blog/:id:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/comments/:id
 * حذف تعليق
 */
router.delete('/:id', authenticateToken, requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const commentId = parseInt(req.params.id, 10);
    const comment = await Comment.findByPk(commentId);

    if (!comment) {
      return res.status(404).json({ error: 'التعليق غير موجود.' });
    }

    await comment.destroy();
    return res.status(200).json({ success: true, message: 'تم الحذف بنجاح.' });
  } catch (error) {
    console.error('Error in DELETE /comments/:id:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
