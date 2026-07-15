/**
 * ANADOL League - Entry Point
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./config/db');
const User = require('./models/User'); // استدعاء الموديل لإنشاء الأدمن
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// استخدام اسم المجلد الموحد (تأكد أن المجلد على GitHub اسمه Public)
app.use(express.static(path.join(__dirname, 'Public')));

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

sequelize.sync({ alter: true })
    .then(async () => {
        console.log('PostgreSQL Database synced successfully.');

        // --- كود إنشاء حساب الأدمن التلقائي ---
        const adminExists = await User.findOne({ where: { role: 'admin' } });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('Admin123!', 10);
            await User.create({
                username: 'admin',
                email: 'admin@anadol.com',
                password: hashedPassword,
                role: 'admin'
            });
            console.log('تم إنشاء حساب الأدمن التلقائي: admin@anadol.com / Admin123!');
        }

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

        app.get('*', (req, res) => {
            if (req.path.startsWith('/api/')) {
                return res.status(404).json({ error: 'Not found' });
            }
            res.sendFile(path.join(__dirname, 'Public', 'index.html'));
        });

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`ANADOL League server is running on port: ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Failed to synchronize database:', err.message);
        process.exit(1);
    });

module.exports = app;
