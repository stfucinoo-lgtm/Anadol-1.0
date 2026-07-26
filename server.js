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

// استدعاء نموذج التشكيلة والتقييمات لضمان جلب ومزامنة الجدول الجديد تلقائياً في PostgreSQL
require('./models/MatchPlayer');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. برمجيات الوسيط الشاملة (Global Middlewares)
app.use(cors());
app.use(express.json({ limit: '50mb' })); // زيادة الحد الأقصى للملفات لتتسع لصور الـ Base64 المرفوعة
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// وسيط إعادة التوجيه الذكي لربط مسارات اللاعبين المباشرة /api/players بمسارات الفريق برمجياً دون الحاجة لتغيير هيكل الملفات
app.use('/api/players', (req, res, next) => {
    req.url = '/players' + req.url; // تحويل المسار داخلياً من /:id إلى /players/:id لتتوافق مع ملف routes/teams.js
    next();
}, teamRoutes);

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
safeMountRoute('/api/upload', './routes/upload');
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

// 5. تهيئة المخطط برمجياً ومزامنة قاعدة البيانات وإضافة أعمِدة الإحصائيات المفقودة تلقائياً
async function startServer() {
    try {
        // إضافة أعمدة المستخدمين
        await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;');
        await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" TEXT;');
        await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "favoriteTeamId" INTEGER;');

        // توسيع حقول الصور للفرق واللاعبين
        const imageQueries = [
            'ALTER TABLE "Teams" ADD COLUMN IF NOT EXISTS "crestUrl" TEXT;',
            'ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "crestUrl" TEXT;',
            'ALTER TABLE "Players" ALTER COLUMN "photoUrl" TYPE TEXT;',
            'ALTER TABLE "players" ALTER COLUMN "photoUrl" TYPE TEXT;'
        ];
        for (const q of imageQueries) {
            try { await sequelize.query(q); } catch (e) {}
        }

        // إضافة أعمِدة الإحصائيات التفصيلية المفقودة لجدول المباريات (matches) تلقائياً
        const matchColumns = [
            'shotsHome', 'shotsAway', 'shotsOnTargetHome', 'shotsOnTargetAway',
            'foulsHome', 'foulsAway', 'offsidesHome', 'offsidesAway',
            'cornersHome', 'cornersAway', 'freeKicksHome', 'freeKicksAway',
            'passesHome', 'passesAway', 'passesCompletedHome', 'passesCompletedAway',
            'crossesHome', 'crossesAway', 'interceptionsHome', 'interceptionsAway',
            'tacklesHome', 'tacklesAway', 'savesHome', 'savesAway'
        ];

        for (const col of matchColumns) {
            try {
                await sequelize.query(`ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "${col}" INTEGER DEFAULT 0;`);
            } catch (e1) {
                try {
                    await sequelize.query(`ALTER TABLE "Matches" ADD COLUMN IF NOT EXISTS "${col}" INTEGER DEFAULT 0;`);
                } catch (e2) {}
            }
        }

        console.log('Database columns and match stats schema updated successfully.');
    } catch (queryErr) {
        console.log('Notice: Manual column addition skipped:', queryErr.message);
    }

    // مزامنة قاعدة البيانات وتشغيل الخادم
    sequelize.sync()
        .then(() => {
            console.log('PostgreSQL Database synced successfully.');
        })
        .catch(err => {
            console.error('Failed to synchronize database, sync aborted:', err.message);
        });
}

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`ANADOL League server is running on port: ${PORT}`);
    startServer();
});

module.exports = app;
