const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/comments
 */
router.get('/comments', async (req, res) => {
  try {
    const { blogPostId } = req.query;
    const whereCondition = {};
    if (blogPostId && blogPostId !== 'all') {
      whereCondition.blogPostId = parseInt(blogPostId);
    }

    let comments = [];
    try {
      comments = await Comment.findAll({
        where: whereCondition,
        include: [{ model: User, attributes: ['username', 'avatarUrl'], required: false }],
        order: [['createdAt', 'DESC']]
      });
    } catch (e) {
      comments = await Comment.findAll({
        where: whereCondition,
        order: [['createdAt', 'DESC']]
      });
    }

    const formattedComments = await Promise.all(comments.map(async (comment) => {
      const plainComment = comment.get({ plain: true });
      let username = plainComment.User ? plainComment.User.username : null;
      let avatarUrl = plainComment.User ? plainComment.User.avatarUrl : null;

      if ((!username || !avatarUrl) && plainComment.userId) {
        try {
          const u = await User.findByPk(plainComment.userId, { attributes: ['username', 'avatarUrl'] });
          if (u) {
            if (!username) username = u.username;
            if (!avatarUrl) avatarUrl = u.avatarUrl;
          }
        } catch (err) {}
      }

      return {
        id: plainComment.id,
        blogPostId: plainComment.blogPostId,
        userId: plainComment.userId,
        username: username || 'عضو سابق',
        avatarUrl: avatarUrl || null,
        content: plainComment.content,
        createdAt: plainComment.createdAt
      };
    }));

    return res.status(200).json(formattedComments);
  } catch (error) {
    console.error('Error loading all comments:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تحميل التعليقات.' });
  }
});

/**
 * GET /api/blog/:id/comments
 */
router.get('/blog/:id/comments', async (req, res) => {
  try {
    const blogPostId = parseInt(req.params.id);

    let comments = [];
    try {
      comments = await Comment.findAll({
        where: { blogPostId },
        include: [{ model: User, attributes: ['username', 'avatarUrl'], required: false }],
        order: [['createdAt', 'ASC']]
      });
    } catch (e) {
      comments = await Comment.findAll({
        where: { blogPostId },
        order: [['createdAt', 'ASC']]
      });
    }

    const formattedComments = await Promise.all(comments.map(async (comment) => {
      const plainComment = comment.get({ plain: true });
      let username = plainComment.User ? plainComment.User.username : null;
      let avatarUrl = plainComment.User ? plainComment.User.avatarUrl : null;

      if ((!username || !avatarUrl) && plainComment.userId) {
        try {
          const u = await User.findByPk(plainComment.userId, { attributes: ['username', 'avatarUrl'] });
          if (u) {
            if (!username) username = u.username;
            if (!avatarUrl) avatarUrl = u.avatarUrl;
          }
        } catch (err) {}
      }

      return {
        id: plainComment.id,
        blogPostId: plainComment.blogPostId,
        userId: plainComment.userId,
        username: username || 'مشجع مجهول',
        avatarUrl: avatarUrl || null,
        content: plainComment.content,
        createdAt: plainComment.createdAt
      };
    }));

    return res.status(200).json(formattedComments);
  } catch (error) {
    console.error('Error loading comments for post:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تحميل التعليقات.' });
  }
});

/**
 * POST /api/blog/:id/comments
 */
router.post('/blog/:id/comments', authenticateToken, async (req, res) => {
  try {
    const blogPostId = parseInt(req.params.id);
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'نص التعليق لا يمكن أن يكون فارغاً.' });
    }

    const newComment = await Comment.create({
      blogPostId,
      userId: req.user.id,
      content: content.trim()
    });

    const commentWithUser = {
      id: newComment.id,
      blogPostId: newComment.blogPostId,
      userId: newComment.userId,
      username: req.user.username,
      avatarUrl: req.user.avatarUrl || null,
      content: newComment.content,
      createdAt: newComment.createdAt
    };

    return res.status(201).json({ success: true, comment: commentWithUser });
  } catch (error) {
    console.error('Error creating comment:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء حفظ التعليق.' });
  }
});

/**
 * DELETE /api/comments/:id
 */
router.delete('/comments/:id', authenticateToken, requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const comment = await Comment.findByPk(commentId);

    if (!comment) {
      return res.status(404).json({ error: 'التعليق المطلوب حذفه غير موجود.' });
    }

    await comment.destroy();
    return res.status(200).json({ success: true, message: 'تم حذف التعليق بنجاح.' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء محاولة حذف التعليق.' });
  }
});

module.exports = router;
