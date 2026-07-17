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
    // استثناء مسارات الـ API والملفات التي تحتوي على امتدادات من التوجيه لـ index.html لمنع أخطاء الـ MIME type
    if (req.path.startsWith('/api/') || req.path.includes('.')) {
        return res.status(404).json({ error: 'الطلب المستهدف غير متوفر بنظام الـ API أو الملف غير موجود' });
    }
    
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('فشل العثور على ملف الواجهة الأمامية index.html في المجلد المخصص.');
    }
});

// 5. تهيئة المخطط برمجياً ومزامنة قاعدة البيانات لتفادي أخطاء Sequelize Dialect مع PostgreSQL
async function startServer() {
    try {
        // فحص وإضافة الأعمدة الجديدة يدوياً لتفادي خلل استعلام UNIQUE المكسور في Sequelize { alter: true }
        await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" VARCHAR(255);');
        
        // تعديل نوع عمود avatarUrl يدوياً إلى TEXT ليتسع لحجم نصوص صور الـ Base64 المرفوعة دون قيود الحجم
        await sequelize.query('ALTER TABLE "users" ALTER COLUMN "avatarUrl" TYPE TEXT;');
        
        await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" TEXT;');
        await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "favoriteTeamId" INTEGER;');
        console.log('Database columns checked/updated successfully.');
    } catch (queryErr) {
        // في حال لم يكن الجدول منشأ بعد (أول تشغيل)، سيتم تجاوز الخطأ لتتولى sync المزامنة والإنشاء الآمن
        console.log('Notice: Manual column addition skipped (table may be newly created):', queryErr.message);
    }

    // مزامنة قاعدة البيانات القياسية الآمنة وتشغيل الخادم
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
}

// تشغيل الخادم والاتصال بقاعدة البيانات
startServer();

module.exports = app;
