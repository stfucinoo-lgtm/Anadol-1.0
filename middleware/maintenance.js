const AppSettings = require('../models/AppSettings');
const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  // 1. استثناء مسارات الإدارة الحساسة ومسارات التوثيق بالكامل لتفادي منع فك وضع الصيانة
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/auth')) {
    return next();
  }

  try {
    // 2. جلب حالة وضع الصيانة الحالية من جدول الإعدادات العامة بقاعدة البيانات
    const settings = await AppSettings.findOne();
    const maintenanceMode = settings ? settings.maintenanceMode : false;

    if (maintenanceMode) {
      // 3. التحقق مما إذا كان مرسل الطلب هو الـ admin لتجاوز الحظر والسماح له بالوصول
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_anadol_key');
          if (decoded && decoded.role === 'admin') {
            return next(); // المشرف يتجاوز وضع الصيانة بأمان للتحقق والتطوير
          }
        } catch (jwtErr) {
          // تجاهل أخطاء صلاحية التوكن والمتابعة لفرض الحظر العام
        }
      }

      // 4. إرجاع استجابة برمز الحالة 503 للطلبات العامة أثناء وضع الصيانة
      return res.status(503).json({
        success: false,
        maintenance: true,
        message: 'منصة دوري الأناضول قيد الصيانة حالياً لتحديثات برمجية فنية. نعتذر عن الإزعاج وسنعود للعمل قريباً جداً.'
      });
    }
  } catch (err) {
    // طباعة الخطأ والاستمرار للسماح بالعبور في حال تعطل قراءة جدول الإعدادات منعاً لشلل الموقع التام
    console.error('خطأ فني في برمجية الصيانة الوسيطة:', err);
  }

  next();
};