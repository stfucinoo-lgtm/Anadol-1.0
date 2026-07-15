const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'anadol_secret_key';

/**
 * وسيط التحقق من التوكن (JWT Authentication)
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'يرجى تسجيل الدخول للوصول إلى هذا الإجراء.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // التحقق اللحظي من حالة حساب المستخدم في قاعدة البيانات
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'المستخدم صاحب هذا التوكن غير مسجل بالنظام.' });
    }

    if (user.banned) {
      return res.status(403).json({ message: 'تم حظر حسابك من قبل إدارة الدوري.' });
    }

    // إرفاق كائن المستخدم بالطلب لاستخدامه في المسارات والتحققات اللاحقة
    req.user = user;

    // تفعيل نظام التدقيق التلقائي (Auto Audit Logging) لعمليات التعديل والحذف الناجحة
    setupAuditLogger(req, res);

    next();
  } catch (error) {
    console.error('JWT Verification Error:', error);
    return res.status(403).json({ message: 'رمز الدخول غير صالح أو انتهت صلاحيته.' });
  }
}

/**
 * تحديد الصلاحيات بناءً على الأدوار المسموح لها بالوصول (Role Authorization)
 * @param {Array<string>} allowedRoles - الأدوار المسموح لها بالمرور
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'غير مصرح للوصول (لم يتم التحقق من الهوية).' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'ليس لديك الصلاحيات الكافية لتنفيذ هذا الإجراء.' });
    }

    next();
  };
}

/**
 * دالة مساعدة معترضة تقوم بتسجيل العمليات الحساسة (تعديل/حذف) تلقائياً في جدول AuditLog
 */
function setupAuditLogger(req, res) {
  const targetMethods = ['PUT', 'DELETE'];
  if (!targetMethods.includes(req.method)) return;

  const originalJson = res.json;

  res.json = function (data) {
    // نقوم بالتسجيل فقط في حال كانت الاستجابة ناجحة (حالة 2xx)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        let AuditLog = null;
        try {
          AuditLog = require('../models/AuditLog');
        } catch (e) {
          // يتفادى التوقف إذا لم يتم تفعيل نموذج AuditLog بعد في قاعدة البيانات
        }

        if (AuditLog && req.user) {
          // استخراج اسم الجدول والمعرّف برمجياً من مسار الطلب النشط
          const pathParts = req.originalUrl.split('?')[0].split('/');
          let tableName = 'unknown';
          let recordId = null;

          // فحص هل الوصول مباشر لقاعدة البيانات (Database Viewer)
          if (pathParts.includes('database')) {
            const dbIndex = pathParts.indexOf('database');
            tableName = pathParts[dbIndex + 1] || 'unknown';
            recordId = parseInt(pathParts[dbIndex + 2]) || null;
          } else {
            // المسارات الافتراضية العامة مثل /api/teams/5
            const apiIndex = pathParts.indexOf('api');
            if (apiIndex !== -1 && pathParts[apiIndex + 1]) {
              const resource = pathParts[apiIndex + 1];
              const resourceMap = {
                'teams': 'teams',
                'players': 'players',
                'matches': 'matches',
                'blog': 'blog_posts',
                'comments': 'comments',
                'users': 'users'
              };
              tableName = resourceMap[resource] || resource;
              const possibleId = parseInt(pathParts[apiIndex + 2]);
              if (!isNaN(possibleId)) {
                recordId = possibleId;
              }
            }
          }

          // تسجيل العملية بالخلفية دون تعطيل استجابة العميل الرئيسية
          AuditLog.create({
            userId: req.user.id,
            username: req.user.username,
            action: `${req.method.toLowerCase()}_record`,
            tableName: tableName,
            recordId: recordId,
            oldValue: null, // يمكن معالجته لاحقاً وتوسيعه حسب الطلب
            newValue: req.method === 'PUT' ? req.body : null
          }).catch(err => console.error('Error writing to AuditLog:', err));
        }
      } catch (err) {
        console.error('Audit Logger Interceptor failed:', err);
      }
    }
    return originalJson.call(this, data);
  };
}

// تصدير واجهات برمجية متعددة المسميات لضمان التوافق مع كافة الهياكل
module.exports = {
  authenticateToken,
  verifyToken: authenticateToken, // مرادف متوافق
  requireRole,
  isEditorOrAdmin: requireRole(['admin', 'editor']) // مرادف حماية مباشر
};