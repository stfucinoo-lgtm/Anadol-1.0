/**
 * ANADOL League - Database Configuration
 * تهيئة اتصال قاعدة بيانات PostgreSQL باستخدام Sequelize ORM.
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

// إعدادات مجمّع الاتصالات (Connection Pool) لتحسين الأداء على Render
const poolOptions = {
    max: 5,        // أقصى عدد اتصالات متزامنة
    min: 0,        // أقل عدد اتصالات
    acquire: 30000,// الوقت الأقصى للمحاولة (ملي ثانية)
    idle: 10000    // وقت الانتظار قبل إغلاق الاتصال الخامل
};

if (process.env.DATABASE_URL) {
    // إعدادات الإنتاج (Render)
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        protocol: 'postgres',
        logging: false,
        pool: poolOptions,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    });
} else {
    // إعدادات البيئة المحلية
    const dbName = process.env.DB_NAME || 'anadol_db';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'password';
    const dbHost = process.env.DB_HOST || '127.0.0.1';
    const dbPort = process.env.DB_PORT || 5432;

    sequelize = new Sequelize(dbName, dbUser, dbPassword, {
        host: dbHost,
        port: dbPort,
        dialect: 'postgres',
        pool: poolOptions,
        logging: console.log
    });
}

// دالة اختبار الاتصال
sequelize.authenticate()
    .then(() => {
        console.log('Successfully connected to PostgreSQL database (ANADOL League).');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err.message);
    });

module.exports = sequelize;
