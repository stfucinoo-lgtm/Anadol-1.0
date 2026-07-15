const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

// فرض حماية مسبقة لتكون جميع هذه المسارات متاحة فقط لدور المسؤول (admin)
router.use(authenticateToken, requireRole(['admin']));

/**
 * GET /api/admin/users
 * جلب قائمة بجميع المستخدمين المسجلين في النظام (الاسم، البريد، الدور، حالة الحظر، تاريخ التسجيل)
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'role', 'banned', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json(users);
  } catch (error) {
    console.error('Error in admin GET users:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة المستخدمين.' });
  }
});

/**
 * PUT /api/admin/users/:id
 * تعديل دور المستخدم أو حظره (متاح للمسؤول فقط)
 * يمنع ترقية أي مستخدم إلى دور مسؤول (admin) لحماية المنصة
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, banned } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'المستخدم المستهدف غير موجود.' });
    }

    // القاعدة الأمنية (القسم 5): منع ترقية أي مستخدم إلى دور مسؤول عبر الـ API تحت أي ظرف
    if (role === 'admin' && user.role !== 'admin') {
      return res.status(400).json({ 
        error: 'حظر أمني: لا يمكن ترقية أي حساب لدور مسؤول (admin) عبر الواجهات؛ هذه العملية تتم فقط بقرار مباشر داخل قاعدة البيانات.' 
      });
    }

    // منع المسؤول من حظر نفسه عن الخطأ
    if (parseInt(id) === req.user.id && banned === true) {
      return res.status(400).json({ error: 'لا يمكنك حظر حسابك النشط كمسؤول.' });
    }

    // إجراء التعديل الفعلي
    await user.update({
      role: role !== undefined ? role : user.role,
      banned: banned !== undefined ? banned : user.banned
    });

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        banned: user.banned,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error in admin PUT user:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تحديث بيانات المستخدم.' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * حذف حساب مستخدم نهائياً من النظام (متاح للمسؤول فقط)
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // منع المسؤول من حذف نفسه
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'لا يمكنك حذف حسابك المسؤول الذي تقوم بالتشغيل من خلاله.' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'المستخدم المطلوب حذفه غير مسجل بالنظام.' });
    }

    await user.destroy();
    return res.status(200).json({ success: true, message: 'تم حذف حساب المستخدم بنجاح.' });
  } catch (error) {
    console.error('Error in admin DELETE user:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء محاولة حذف المستخدم.' });
  }
});

module.exports = router;