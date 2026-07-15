const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/blog/:id/comments
 * جلب جميع التعليقات الخاصة بمقال معين
 * مدمج معها اسم المستخدم تلقائياً لتجنب كثرة الاستدعاءات بالواجهة الأمامية
 */
router.get('/blog/:id/comments', async (req, res) => {
  try {
    const blogPostId = parseInt(req.params.id);

    const comments = await Comment.findAll({
      where: { blogPostId },
      include: [
        {
          model: User,
          attributes: ['username']
        }
      ],
      order: [['createdAt', 'ASC']] // عرض التعليقات من الأقدم إلى الأحدث
    });

    // تنسيق شكل البيانات ليتطابق مع العقد المشترك (القسم 7) بوضع الـ username في الكائن الرئيسي مباشرة
    const formattedComments = comments.map(comment => {
      const plainComment = comment.get({ plain: true });
      return {
        id: plainComment.id,
        blogPostId: plainComment.blogPostId,
        userId: plainComment.userId,
        username: plainComment.User ? plainComment.User.username : 'عضو سابق',
        content: plainComment.content,
        createdAt: plainComment.createdAt
      };
    });

    return res.status(200).json(formattedComments);
  } catch (error) {
    console.error('Error loading comments:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تحميل التعليقات.' });
  }
});

/**
 * POST /api/blog/:id/comments
 * كتابة تعليق جديد على مقال تحريري (يتطلب تسجيل الدخول - متاح لجميع الأدوار)
 */
router.post('/blog/:id/comments', authenticateToken, async (req, res) => {
  try {
    const blogPostId = parseInt(req.params.id);
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'نص التعليق لا يمكن أن يكون فارغاً.' });
    }

    // إنشاء التعليق وربطه بالمستخدم المسجل وصاحب التوكن الحالي
    const newComment = await Comment.create({
      blogPostId,
      userId: req.user.id,
      content: content.trim()
    });

    // إعادة كائن التعليق مع إرفاق اسم المستخدم الحالي لتسهيل الإضافة اللحظية بالواجهة
    const commentWithUser = {
      id: newComment.id,
      blogPostId: newComment.blogPostId,
      userId: newComment.userId,
      username: req.user.username,
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
 * حذف تعليق مخالف من النظام (صلاحية المشرفين admin و editor فقط)
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