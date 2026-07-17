const sequelize = require('./config/db');
const User = require('./models/User'); // التأكد من المسار الصحيح للموديل

async function createAdmin() {
    try {
        // التأكد من الاتصال بقاعدة البيانات أولاً
        await sequelize.authenticate();
        console.log('متصل بقاعدة البيانات بنجاح...');

        // البحث عن الحساب أو إنشائه إن لم يكن موجوداً
        const [admin, created] = await User.findOrCreate({
            where: { email: 'admin@anadol.com' },
            defaults: {
                username: 'admin',
                password: 'Admin123!', // نكتبها نصاً عادياً هنا، والموديل سيتولى تشفيرها تلقائياً
                role: 'admin'
            }
        });

        if (created) {
            console.log('تم إنشاء حساب المسؤول (Admin) بنجاح!');
            console.log('البريد الإلكتروني: admin@anadol.com');
            console.log('كلمة المرور: Admin123!');
        } else {
            console.log('حساب المسؤول موجود بالفعل مسبقاً في قاعدة البيانات.');
        }
        
        process.exit(0);
    } catch (e) {
        console.error('فشل إنشاء حساب المسؤول:', e);
        process.exit(1);
    }
}

createAdmin();
