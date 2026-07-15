const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

// فرض وصول حصري للمسؤول فقط (admin)
router.use(authenticateToken, requireRole(['admin']));

/**
 * دالة مساعدة لتحميل نموذج قاعدة البيانات المطلوب برمجياً وبشكل دفاعي آمن
 * يمنع توقف التطبيق إذا لم يكن الملف قد تم إنشاؤه بعد في خطة البناء التدريجية
 */
function getModelByTableName(tableName) {
  try {
    switch (tableName) {
      case 'teams': 
        return require('../models/Team');
      case 'players': 
        return require('../models/Player');
      case 'matches': 
        return require('../models/Match');
      case 'matchEvents': 
        return require('../models/MatchEvent');
      case 'blogPosts': 
        return require('../models/BlogPost');
      case 'comments': 
        return require('../models/Comment');
      case 'users': 
        return require('../models/User');
      case 'statImports': 
        return require('../models/StatImport');
      case 'auditLog': 
        return require('../models/AuditLog');
      default: 
        return null;
    }
  } catch (error) {
    console.warn(`[Database Viewer Warning]: Model for table "${tableName}" is not yet ready or created.`);
    return null;
  }
}

/**
 * GET /api/admin/database/:tableName
 * جلب جميع السجلات الخام كاملة وبدون أي فلاتر أو حجب لأي حقل (خاص بالمراجعة الفنية)
 */
router.get('/database/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const Model = getModelByTableName(tableName);

    if (!Model) {
      return res.status(404).json({ error: `الجدول "${tableName}" غير موجود أو لم يتم تفعيله بعد.` });
    }

    const records = await Model.findAll({ order: [['id', 'DESC']] });
    return res.status(200).json(records);
  } catch (error) {
    console.error('Error fetching raw database records:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب السجلات الخام: ' + error.message });
  }
});

/**
 * GET /api/admin/database/:tableName/:id
 * جلب سجل خام مفرد بالمعرّف بكل حقوله المخزنة
 */
router.get('/database/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const Model = getModelByTableName(tableName);

    if (!Model) {
      return res.status(404).json({ error: `الجدول المطلوب غير مدعوم.` });
    }

    const record = await Model.findByPk(id);
    if (!record) {
      return res.status(404).json({ error: 'السجل المستهدف غير موجود.' });
    }

    return res.status(200).json(record);
  } catch (error) {
    console.error('Error fetching single raw record:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب السجل المطلوبة.' });
  }
});

/**
 * PUT /api/admin/database/:tableName/:id
 * تعديل مباشر وسريع لأي حقل في أي سجل خام دون قيود من المنطق البرمجي (صلاحية تحكم كاملة للمسؤول)
 */
router.put('/database/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const Model = getModelByTableName(tableName);

    if (!Model) {
      return res.status(404).json({ error: 'الجدول المستهدف غير موجود.' });
    }

    const record = await Model.findByPk(id);
    if (!record) {
      return res.status(404).json({ error: 'السجل المطلوب تعديله غير موجود.' });
    }

    // تطبيق التعديل المباشر
    await record.update(req.body);

    return res.status(200).json({ success: true, record });
  } catch (error) {
    console.error('Error updating raw database record:', error);
    return res.status(500).json({ error: 'فشل التعديل المباشر على السجل: ' + error.message });
  }
});

/**
 * DELETE /api/admin/database/:tableName/:id
 * حذف مباشر لأي سجل من قاعدة البيانات (حذف تطهيري لا تمنعه الخلفية مهما كانت التبعيات)
 */
router.delete('/database/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const Model = getModelByTableName(tableName);

    if (!Model) {
      return res.status(404).json({ error: 'الجدول المستهدف غير موجود.' });
    }

    const record = await Model.findByPk(id);
    if (!record) {
      return res.status(404).json({ error: 'السجل المطلوب حذفه غير موجود.' });
    }

    // تنفيذ الحذف المطلق
    await record.destroy();

    return res.status(200).json({ success: true, message: 'تم حذف السجل بنجاح من جذور قاعدة البيانات.' });
  } catch (error) {
    console.error('Error deleting raw database record:', error);
    return res.status(500).json({ error: 'فشل حذف السجل: ' + error.message });
  }
});

/**
 * GET /api/admin/export/:tableName
 * تصدير جميع سجلات الجدول المطلوب كملف JSON للتحميل المباشر والآمن للأرشفة والنسخ الاحتياطي
 */
router.get('/export/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const Model = getModelByTableName(tableName);

    if (!Model) {
      return res.status(404).send('الجدول المطلوب تصديره غير متوفر.');
    }

    const records = await Model.findAll({ raw: true });
    
    // تحويل البيانات لنص مهيأ
    const jsonString = JSON.stringify(records, null, 2);

    // ترويسات تحميل الملف التلقائي
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="anadol_${tableName}_export.json"`);
    
    return res.send(jsonString);
  } catch (error) {
    console.error('Database Export Error:', error);
    return res.status(500).send('فشل تصدير جدول البيانات: ' + error.message);
  }
});

module.exports = router;