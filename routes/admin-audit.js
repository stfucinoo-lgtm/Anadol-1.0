const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');

/**
 * @route   GET /api/admin/audit-log
 * @desc    جلب السجل الأمني للتدقيق والعمليات الحساسة (قابل للفلترة)
 * @access  Admin Only
 */
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  const { userId, fromDate, toDate } = req.query;

  try {
    const whereCondition = {};

    // 1. تصفية السجل بمستخدم معين إذا تم توفيره بالـ query
    if (userId) {
      whereCondition.userId = parseInt(userId);
    }

    // 2. تصفية السجل بنطاق تواريخ زمني محدد بدقة
    if (fromDate || toDate) {
      whereCondition.createdAt = {};
      
      if (fromDate) {
        whereCondition.createdAt[Op.gte] = new Date(fromDate);
      }
      
      if (toDate) {
        // نضبط التاريخ إلى نهاية اليوم المطلوب (23:59:59) لتشمل الفلترة كامل اليوم
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        whereCondition.createdAt[Op.lte] = endOfDay;
      }
    }

    // 3. استعلام قاعدة البيانات وفرز السجلات من الأحدث للأقدم تلقائياً
    const auditLogs = await AuditLog.findAll({
      where: whereCondition,
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json(auditLogs);
  } catch (err) {
    console.error('خطأ أثناء جلب سجل التدقيق الأمني:', err);
    return res.status(500).json({
      success: false,
      message: 'فشل السيرفر في معالجة واستخراج سجل التدقيق.'
    });
  }
});

module.exports = router;