/**
 * ANADOL League - Upload Route
 * مسار رفع الصور والملفات وحفظها داخل مجلد uploads
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 1. تحديد وتأكيد وجود مجلد الحفظ (public/uploads أو Public/uploads)
let publicDirName = 'public';
const rootDir = path.join(__dirname, '..');

if (!fs.existsSync(path.join(rootDir, 'public')) && fs.existsSync(path.join(rootDir, 'Public'))) {
    publicDirName = 'Public';
}

const uploadsDir = path.join(rootDir, publicDirName, 'uploads');

// إنشاء مجلد uploads تلقائياً إذا لم يكن موجوداً
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// 2. إعدادات تخزين الملفات عبر Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // توليد اسم فريد للملف لتفادي التضارب
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, 'img-' + uniqueSuffix + ext);
    }
});

// تصفية أنواع الملفات (قبول الصور فقط)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);

    if (extName && mimeType) {
        return cb(null, true);
    } else {
        cb(new Error('مسموح فقط برفع الصور (JPG, PNG, WEBP, GIF)'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // الحد الأقصى: 10 ميجابايت
    fileFilter: fileFilter
});

// 3. Endpoint استقبال الصورة
// POST /api/upload
router.post('/', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'لم يتم إرسال أي صورة' });
        }

        // إرجاع الرابط النسبي للواجهة الأمامية
        const fileUrl = `/uploads/${req.file.filename}`;

        return res.json({
            success: true,
            url: fileUrl,
            message: 'تم رفع الصورة بنجاح'
        });
    } catch (error) {
        console.error('Error in file upload route:', error);
        return res.status(500).json({ success: false, message: 'حدث خطأ في السيرفر أثناء حفظ الصورة' });
    }
});

module.exports = router;
