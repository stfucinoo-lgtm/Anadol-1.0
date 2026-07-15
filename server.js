/**
 * ANADOL League - Entry Point
 */
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./config/db');
const User = require('./models/User'); // استدعاء الموديل
const bcrypt = require('bcryptjs'); // للتشفير

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'Public'))); // المجلد كما في صورتك

sequelize.sync({ alter: true })
    .then(async () => {
        console.log('Database synced successfully.');

        // كود إنشاء حساب الأدمن التلقائي (يعمل فقط إذا كان الجدول فارغاً من الأدمن)
        const adminExists = await User.findOne({ where: { role: 'admin' } });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('Admin123!', 10);
            await User.create({
                username: 'admin',
                email: 'admin@anadol.com',
                password: hashedPassword,
                role: 'admin'
            });
            console.log('تم إنشاء حساب الأدمن: admin@anadol.com | كلمة المرور: Admin123!');
        }

        // المسارات
        app.use('/api/teams', require('./routes/teams'));
        app.use('/api/matches', require('./routes/matches'));
        app.use('/api/standings', require('./routes/standings'));
        
        // ... (بقية المسارات كما كانت لديك)

        app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'Public', 'index.html'));
        });

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port: ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Error:', err.message);
    });

module.exports = app;
