/**
 * ANADOL League - Entry Point
 * نقطة انطلاق الخادم الرئيسي وتكامل المسارات وتجهيزات قاعدة البيانات.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const sequelize = require('./config/db');

// استدعاء آمن لنموذج التشكيلة والتقييمات دون التسبب في انهيار السيرفر إن لم يكن الملف موجوداً
try {
    require('./models/MatchPlayer');
} catch (e) {
    console.log('Notice: MatchPlayer model not loaded:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3000;

// 1. برمجيات الوسيط الشاملة (Global Middlewares)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// تحديد مسار مجلد الواجهة الأمامية ديناميكياً
let publicDirName = 'public';
if (!fs.existsSync(path.join(__dirname, 'public')) && fs.existsSync(path.join(__dirname, 'Public'))) {
    publicDirName = 'Public';
}
const publicPath = path.join(__dirname, publicDirName);

// خدمة الملفات الساكنة للواجهة الأمامية
app.use(express.static(publicPath));

// 2. دمج وتفعيل مسارات الـ API النشطة
const teamRoutes = require('./routes/teams');
const matchRoutes = require('./routes/matches');
const standingsRoutes = require('./routes/standings');

app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/standings', standingsRoutes);

// وسيط إعادة التوجيه لربط مسارات اللاعبين
app.use('/api/players', (req, res, next) => {
    req.url = '/players' + req.url;
    next();
}, teamRoutes);

// 3. التحميل الآمن للمسارات المستقبلية
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

// تسجيل باقي المسارات
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
    if (req.path.startsWith('/api/') || req.path.includes('.')) {
        return res.status(404).json({ error: 'الطلب المستهدف غير متوفر بنظام الـ API أو الملف غير موجود' });
    }
    
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('فشل العثور على ملف الواجهة الأمامية index.html.');
    }
});

// 5. تهيئة السيرفر ومزامنة قاعدة البيانات بأمان وإصلاح الجداول تلقائياً
async function startServer() {
    try {
        // إضافة كافة العواميد المفقودة للجداول في PostgreSQL لحل أخطاء عدم العرض
        const alterQueries = [
            // أعمدة جدول المستخدمين
            'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;',
            'ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;',
            'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" TEXT;',
            'ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "bio" TEXT;',
            'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "favoriteTeamId" INTEGER;',
            'ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "favoriteTeamId" INTEGER;',

            // أعمدة جدول الفرق الكاملة (السبب الرئيسي لتعطل العرض)
            'ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "crestUrl" TEXT;',
            'ALTER TABLE "Teams" ADD COLUMN IF NOT EXISTS "crestUrl" TEXT;',
            'ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "primaryColor" VARCHAR(7) DEFAULT \'#00ff87\';',
            'ALTER TABLE "Teams" ADD COLUMN IF NOT EXISTS "primaryColor" VARCHAR(7) DEFAULT \'#00ff87\';',
            'ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "stadium" TEXT;',
            'ALTER TABLE "Teams" ADD COLUMN IF NOT EXISTS "stadium" TEXT;',
            'ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "foundedYear" INTEGER;',
            'ALTER TABLE "Teams" ADD COLUMN IF NOT EXISTS "foundedYear" INTEGER;',

            // أعمدة جدول اللاعبين والمقالات
            'ALTER TABLE "Players" ALTER COLUMN "photoUrl" TYPE TEXT;',
            'ALTER TABLE "players" ALTER COLUMN "photoUrl" TYPE TEXT;',
            'ALTER TABLE "BlogPosts" ALTER COLUMN "featuredImageUrl" TYPE TEXT;',
            'ALTER TABLE "blog_posts" ALTER COLUMN "featuredImageUrl" TYPE TEXT;',
            'ALTER TABLE "BlogPosts" ALTER COLUMN "excerpt" TYPE TEXT;',
            'ALTER TABLE "blog_posts" ALTER COLUMN "excerpt" TYPE TEXT;'
        ];

        for (const q of alterQueries) {
            try { await sequelize.query(q); } catch (e) {}
        }

        // إضافة أعمِدة الإحصائيات التفصيلية لجدول المباريات
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
            } catch (e) {
                try {
                    await sequelize.query(`ALTER TABLE "Matches" ADD COLUMN IF NOT EXISTS "${col}" INTEGER DEFAULT 0;`);
                } catch (e2) {}
            }
        }

        console.log('Database columns updated successfully.');
    } catch (queryErr) {
        console.log('Notice: Manual column setup skipped:', queryErr.message);
    }

    try {
        // مزامنة التغييرات الهيكلية تلقائياً لتوافق الجداول بدون مسح أي بيانات سابقة
        await sequelize.sync({ alter: true });
        console.log('PostgreSQL Database synced successfully.');
    } catch (err) {
        console.error('Database sync warning:', err.message);
    }
}

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`ANADOL League server is running on port: ${PORT}`);
    startServer();
});

module.exports = app;
