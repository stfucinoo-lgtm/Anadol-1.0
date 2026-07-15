/**
 * ANADOL League - Database Configuration
 * تهيئة اتصال قاعدة بيانات PostgreSQL باستخدام Sequelize ORM.
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

// قراءة متغير البيئة الموحد للإنتاج أولاً لتسهيل النشر على Render
if (process.env.DATABASE_URL) {
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        protocol: 'postgres',
        logging: false, // إغلاق تسجيل الاستعلامات في بيئة الإنتاج لتسريع الأداء وتقليص الضجيج في السجلات
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false // تلافي مشاكل شهادات SSL ذاتية التوقيع الشائعة في الخوادم السحابية كـ Render
            }
        }
    });
} else {
    // إعدادات افتراضية مخصصة للبيئة المحلية في حال عدم توفر متغير البيئة السحابي
    const dbName = process.env.DB_NAME || 'anadol_db';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'password';
    const dbHost = process.env.DB_HOST || '127.0.0.1';
    const dbPort = process.env.DB_PORT || 5432;

    sequelize = new Sequelize(dbName, dbUser, dbPassword, {
        host: dbHost,
        port: dbPort,
        dialect: 'postgres',
        logging: console.log // تفعيل طباعة الاستعلامات محلياً للمساعدة في مراجعة وتدقيق العمليات
    });
}

// دالة اختبار الاتصال المباشر بقاعدة البيانات للتأكد من سلامة التجهيزات
sequelize.authenticate()
    .then(() => {
        console.log('Successfully connected to PostgreSQL database (ANADOL League).');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err.message);
    });

module.exports = sequelize;