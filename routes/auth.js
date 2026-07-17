const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize'); // استيراد مباشر وآمن لمعاملات الاستعلام
const User = require('../models/User'); // يرجى التأكد من أن اسم الملف الفعلي هو User.js بحرف U كبير

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

module.exports = router;
