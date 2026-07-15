/**
 * ANADOL League - Entry Point
 * تم تعديل المسارات لتتوافق مع مجلد Public وتأجيل التحميل لمزامنة قاعدة البيانات.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. برمجيات الوسيط
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// خدمة الملفات الساكنة (تأكد أن المجلد في GitHub اسمه Public بحرف P كبير)
app.use(express.static(path.join(__dirname, 'Public')));

// 2. دالة آمنة لتحميل المسارات
function safeMountRoute(routePath, moduleName) {
    try {
        app.use(routePath, require(moduleName));
        console.log(`Mounted path successfully: ${routePath}`);
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
            console.error(`Error loading route module ${moduleName}:`, e.message);
        }
    }
}

// 3. مزامنة قاعدة البيانات ثم تشغيل المسارات والتطبيق
sequelize.sync({ alter: true })
    .then(() => {
        console.log('PostgreSQL Database synced successfully.');

        // تحميل المسارات
        app.use('/api/teams', require('./routes/teams'));
        app.use('/api/matches', require('./routes/matches'));
        app.use('/api/standings', require('./routes/standings'));

        safeMountRoute('/api/auth', './routes/auth');
        safeMountRoute('/api/analytics', './routes/analytics');
        safeMountRoute('/api/blog', './routes/blog');
        safeMountRoute('/api/comments', './routes/comments');
        safeMountRoute('/api/imports', './routes/imports');
        safeMountRoute('/api/admin/users', './routes/admin-users');
        safeMountRoute('/api/admin/database', './routes/admin-database');
        safeMountRoute('/api/admin/settings', './routes/admin-settings');
        safeMountRoute('/api/admin/audit-log', './routes/admin-audit');

        // 4. التوجيه التلقائي للواجهة (SPA)
        app.get('*', (req, res) => {
            if (req.path.startsWith('/api/')) {
                return res.status(404).json({ error: 'الطلب المستهدف غير متوفر' });
            }
            res.sendFile(path.join(__dirname, 'Public', 'index.html'));
        });

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`ANADOL League server is running on port: ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Failed to sync database:', err.message);
        process.exit(1);
    });

module.exports = app;
