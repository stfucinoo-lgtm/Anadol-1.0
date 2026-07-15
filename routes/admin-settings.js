const express = require('express');
const router = express.Router();
const AppSettings = require('../models/AppSettings');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * @route   GET /api/admin/settings
 * @desc    جلب إعدادات النظام الحالية (بما فيها وضع الصيانة)
 * @access  Admin Only
 */
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    let settings = await AppSettings.findOne();
    
    // إذا لم تكن هناك إعدادات مخزنة بعد، نقوم بإنشاء سجل افتراضي لضمان سلامة التشغيل
    if (!settings) {
      settings = await AppSettings.create({ maintenanceMode: false });
    }

    return res.status(200).json({
      maintenanceMode: settings.maintenanceMode
    });
  } catch (err) {
    console.error('خطأ أثناء جلب إعدادات النظام:', err);
    return res.status(500).json({
      success: false,
      message: 'فشل السيرفر في جلب إعدادات النظام.'
    });
  }
});

/**
 * @route   PUT /api/admin/settings
 * @desc    تعديل إعدادات النظام وتفعيل/تعطيل وضع الصيانة
 * @access  Admin Only
 */
router.put('/', authenticateToken, requireRole('admin'), async (req, res) => {
  const { maintenanceMode } = req.body;

  if (typeof maintenanceMode !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'يجب توفير حقل وضع الصيانة بقيمة منطقية (true أو false).'
    });
  }

  try {
    let settings = await AppSettings.findOne();

    if (!settings) {
      // إنشاء السجل الأول في قاعدة البيانات في حال عدم تواجده سابقاً
      settings = await AppSettings.create({ maintenanceMode });
    } else {
      // تحديث السجل المتواجد حالياً
      settings.maintenanceMode = maintenanceMode;
      await settings.save();
    }

    return res.status(200).json({
      success: true,
      settings: {
        maintenanceMode: settings.maintenanceMode
      }
    });
  } catch (err) {
    console.error('خطأ أثناء تحديث إعدادات النظام:', err);
    return res.status(500).json({
      success: false,
      message: 'تعذر حفظ الإعدادات الجديدة على السيرفر.'
    });
  }
});

module.exports = router;