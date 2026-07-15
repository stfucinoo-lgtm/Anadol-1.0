const express = require('express');
const router = express.Router();
const BlogPost = require('../models/BlogPost');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/blog
 * جلب قائمة المقالات التحريرية بالكامل (بدون محتوى المقال الكامل لحفظ أداء النقل)
 * يعيد فقط الملخص والعناوين والتفاصيل الأساسية لعرضها في قائمة المدونة
 */
router.get('/', async (req, res) => {
  try {
    const posts = await BlogPost.findAll({
      attributes: ['id', 'title', 'slug', 'authorId', 'featuredImageUrl', 'excerpt', 'publishedAt'],
      order: [['publishedAt', 'DESC']]
    });
    return res.status(200).json(posts);
  } catch (error) {
    console.error('Error fetching blog list:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة المقالات.' });
  }
});

/**
 * GET /api/blog/:id
 * جلب مقال مفرد بكامل محتواه التفصيلي (Body) لعرضه في صفحة المقال المنفردة
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const post = await BlogPost.findByPk(id);

    if (!post) {
      return res.status(404).json({ error: 'المقال المطلوب غير موجود في الأرشيف.' });
    }

    return res.status(200).json(post);
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب تفاصيل المقال.' });
  }
});

/**
 * POST /api/blog
 * إنشاء مقال تحريري جديد (صلاحية Admin و Editor فقط)
 */
router.post('/', authenticateToken, requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const { title, slug, featuredImageUrl, excerpt, body } = req.body;

    if (!title || !slug || !excerpt || !body) {
      return res.status(400).json({ error: 'العنوان، الرابط الفريد، الملخص، ونص المقال هي حقول إلزامية.' });
    }

    const newPost = await BlogPost.create({
      title,
      slug,
      featuredImageUrl,
      excerpt,
      body,
      authorId: req.user.id, // استخراج معرّف الكاتب تلقائياً من التوكن الأمني
      publishedAt: new Date()
    });

    return res.status(201).json({ success: true, post: newPost });
  } catch (error) {
    console.error('Error creating blog post:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء إنشاء المقال التحريري.' });
  }
});

/**
 * PUT /api/blog/:id
 * تعديل بيانات مقال تحريري موجود (صلاحية Admin و Editor فقط)
 */
router.put('/:id', authenticateToken, requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const { id } = req.params;
    const post = await BlogPost.findByPk(id);

    if (!post) {
      return res.status(404).json({ error: 'المقال المطلوب تعديله غير موجود.' });
    }

    const { title, slug, featuredImageUrl, excerpt, body } = req.body;

    await post.update({
      title: title !== undefined ? title : post.title,
      slug: slug !== undefined ? slug : post.slug,
      featuredImageUrl: featuredImageUrl !== undefined ? featuredImageUrl : post.featuredImageUrl,
      excerpt: excerpt !== undefined ? excerpt : post.excerpt,
      body: body !== undefined ? body : post.body
    });

    return res.status(200).json({ success: true, post });
  } catch (error) {
    console.error('Error updating blog post:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تحديث بيانات المقال.' });
  }
});

/**
 * DELETE /api/blog/:id
 * حذف مقال تحريري نهائياً من الدوري (صلاحية Admin فقط - حسب مصفوفة الصلاحيات)
 */
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const post = await BlogPost.findByPk(id);

    if (!post) {
      return res.status(404).json({ error: 'المقال المطلوب حذفه غير موجود بالأرشيف.' });
    }

    await post.destroy();
    return res.status(200).json({ success: true, message: 'تم حذف المقال التحريري بنجاح.' });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء حذف المقال.' });
  }
});

module.exports = router;