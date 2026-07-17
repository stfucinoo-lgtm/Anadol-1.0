const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize'); // استيراد مباشر وآمن لمعاملات الاستعلام
const User = require('../models/User'); // التأكد من استيراد ملف المستخدم بحرف كبير

// محاولات استدعاء مرنة للنماذج الأخرى لتجنب توقف التشغيل في حال غياب ملفاتها مؤقتاً
let Team;
try {
  Team = require('../models/Team');
} catch (e) {
  console.log('Note: Team model is not accessible yet in auth routes.');
}

let Comment;
try {
  Comment = require('../models/Comment');
} catch (e) {
  console.log('Note: Comment model is not accessible yet in auth routes.');
}

const JWT_SECRET = process.env.JWT_SECRET || 'anadol_secret_key';

/**
 * دالة مساعدة لإنشاء التوكن الرقمي للمستخدم
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' } // صلاحية التوكن 24 ساعة
  );
}

/**
 * برمجية وسيطة محلية (Middleware) للتحقق من التوكن وحماية مسارات الملف الشخصي
 */
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // استخراج التوكن بعد كلمة Bearer

  if (!token) {
    return res.status(401).json({ message: 'وصول غير مصرح به، يرجى تسجيل الدخول أولاً.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'رمز التحقق غير صالح أو منتهي الصلاحية.' });
    }
    req.user = decoded; // تمرير بيانات فك تشفير التوكن { id, username, role }
    next();
  });
};

/**
 * POST /api/auth/register
 * تسجيل حساب زائر عادي جديد (role يتم فرضه تلقائياً ليكون visitor)
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1. التحقق من وجود كافة الحقول المطلوبة
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'يرجى ملء جميع الحقول المطلوبة للتسجيل.' });
    }

    // 2. التحقق من تكرار البريد الإلكتروني أو اسم المستخدم بشكل آمن
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(409).json({ message: 'اسم المستخدم أو البريد الإلكتروني مسجل بالفعل.' });
    }

    // 3. إنشاء حساب المستخدم مع فرض الدور visitor حمايةً للنظام
    const newUser = await User.create({
      username,
      email,
      password,
      role: 'visitor', // الحماية القصوى: لا يمكن التسجيل العام بأي رتبة أخرى
      banned: false
    });

    // 4. توليد الرمز والرد
    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Error in register route:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء إنشاء الحساب.' });
  }
});

/**
 * POST /api/auth/login
 * تسجيل الدخول لجميع الفئات (admin, editor, visitor)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. التحقق من إدخال البيانات
    if (!email || !password) {
      return res.status(400).json({ message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.' });
    }

    // 2. البحث عن المستخدم بالبريد الإلكتروني
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'البيانات المدخلة غير صحيحة.' });
    }

    // 3. التحقق من الحظر
    if (user.banned) {
      return res.status(403).json({ message: 'تم حظر حسابك من قبل إدارة الدوري.' });
    }

    // 4. التحقق من مطابقة كلمة المرور المشفرة
    const isPasswordValid = await user.validPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'البيانات المدخلة غير صحيحة.' });
    }

    // 5. توليد الرمز والرد
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error in login route:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء محاولة تسجيل الدخول.' });
  }
});

/**
 * GET /api/auth/profile
 * جلب بيانات الملف الشخصي للمستخدم الحالي مع الفريق المفضل والتعليقات الأخيرة
 */
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود.' });
    }

    let favoriteTeam = null;
    if (user.favoriteTeamId && Team) {
      favoriteTeam = await Team.findByPk(user.favoriteTeamId);
    }

    let latestComments = [];
    if (Comment) {
      latestComments = await Comment.findAll({
        where: { userId: user.id },
        limit: 5,
        order: [['createdAt', 'DESC']]
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        favoriteTeamId: user.favoriteTeamId,
        createdAt: user.createdAt,
        favoriteTeam,
        latestComments
      }
    });
  } catch (error) {
    console.error('Error in get profile route:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات الملف الشخصي.' });
  }
});

/**
 * PUT /api/auth/profile
 * تحديث بيانات الملف الشخصي للمستخدم الحالي
 */
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const { username, bio, avatarUrl, favoriteTeamId } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود.' });
    }

    // التحقق من تكرار اسم المستخدم الجديد إذا رغب في تغييره
    if (username && username !== user.username) {
      const usernameExists = await User.findOne({ where: { username } });
      if (usernameExists) {
        return res.status(409).json({ message: 'اسم المستخدم مسجل بالفعل.' });
      }
      user.username = username;
    }

    if (bio !== undefined) user.bio = bio;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    if (favoriteTeamId !== undefined) {
      if (favoriteTeamId === null || favoriteTeamId === '') {
        user.favoriteTeamId = null;
      } else if (Team) {
        const teamExists = await Team.findByPk(favoriteTeamId);
        if (!teamExists) {
          return res.status(400).json({ message: 'الفريق المحدد غير موجود.' });
        }
        user.favoriteTeamId = favoriteTeamId;
      } else {
        user.favoriteTeamId = favoriteTeamId;
      }
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        favoriteTeamId: user.favoriteTeamId
      }
    });
  } catch (error) {
    console.error('Error in update profile route:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء تحديث بيانات الملف الشخصي.' });
  }
});
// مسار مؤقت لإنشاء حساب المسؤول الأول - يرجى حذفه أو إغلاقه بعد التشغيل الأول لأسباب أمنية
router.get('/setup-initial-admin-account-secure', async (req, res) => {
  try {
    const [admin, created] = await User.findOrCreate({
      where: { email: 'admin@anadol.com' },
      defaults: {
        username: 'admin',
        password: 'Admin123!', // سيقوم الموديل بتشفيرها تلقائياً
        role: 'admin'
      }
    });

    if (created) {
      return res.status(201).json({ success: true, message: 'تم إنشاء حساب المسؤول بنجاح!' });
    } else {
      return res.status(200).json({ success: true, message: 'حساب المسؤول موجود بالفعل.' });
    }
  } catch (error) {
    console.error('Error in setup-admin route:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});
module.exports = router;
