/**
 * ANADOL League - Entry Point
 * نقطة انطلاق الخادم الرئيسي وتكامل المسارات وتجهيزات قاعدة البيانات.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs'); // استيراد نظام الملفات للتحقق الديناميكي من المجلد الساكن
require('dotenv').config();

const sequelize = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. برمجيات الوسيط الشاملة (Global Middlewares)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تحديد مسار مجلد الواجهة الأمامية ديناميكياً للتوافق مع حالة الأحرف (public أو Public)
let publicDirName = 'public';
if (!fs.existsSync(path.join(__dirname, 'public')) && fs.existsSync(path.join(__dirname, 'Public'))) {
    publicDirName = 'Public';
}
const publicPath = path.join(__dirname, publicDirName);

// خدمة الملفات الساكنة للواجهة الأمامية
app.use(express.static(publicPath));

// 2. دمج وتفعيل مسارات الـ API النشطة حالياً (Phase 2 Routes)
const teamRoutes = require('./routes/teams');
const matchRoutes = require('./routes/matches');
const standingsRoutes = require('./routes/standings');

app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/standings', standingsRoutes);

// 3. دالة تفادي الانهيار للتحميل التدريجي للمسارات القادمة (Phase 3+ Routes)
function safeMountRoute(routePath, moduleName) {
    try {
        const routeModule = require(moduleName);
        app.use(routePath, routeModule);
        console.log(`Mounted path successfully: ${routePath}`);
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
            console.error(`Error loading route module ${moduleName}:`, e.message);
        }
    }
}

// تسجيل المسارات المستقبلية (سيتم تحميلها تلقائياً بمجرد إنشاء ملفاتها في المراحل القادمة)
safeMountRoute('/api/auth', './routes/auth');
safeMountRoute('/api/analytics', './routes/analytics');
safeMountRoute('/api/blog', './routes/blog');
safeMountRoute('/api/comments', './routes/comments');
safeMountRoute('/api/imports', './routes/imports');
safeMountRoute('/api/admin/users', './routes/admin-users');
safeMountRoute('/api/admin/database', './routes/admin-database');
safeMountRoute('/api/admin/settings', './routes/admin-settings');
safeMountRoute('/api/admin/audit-log', './routes/admin-audit');

// 4. التوجيه التلقائي لمعالجة واجهات الصفحة الواحدة (SPA Routing)
app.get('*', (req, res, next) => {
    // استثناء مسارات الـ API لعدم إرجاع صفحات HTML عند حدوث خطأ استدعاء
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'الطلب المستهدف غير متوفر بنظام الـ API' });
    }
    
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('فشل العثور على ملف الواجهة الأمامية index.html في المجلد المخصص.');
    }
});

// 5. مزامنة قاعدة البيانات (Sequelize Sync) وتشغيل خادم الاستماع
// تم تبديلها للمزامنة الافتراضية الآمنة لضمان استقرار التشغيل على Render
sequelize.sync()
    .then(() => {
        console.log('PostgreSQL Database synced successfully.');
        app.listen(PORT, () => {
            console.log(`ANADOL League server is running on port: ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Failed to synchronize database, server aborted:', err.message);
    });

module.exports = app;
