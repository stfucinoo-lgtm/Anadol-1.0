const sequelize = require('./config/db');
const User = require('./models/User'); // استدعاء موديل المستخدمين
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        const hashedPassword = await bcrypt.hash('Admin123!', 10); // كلمة مرورك المختارة
        await User.create({
            username: 'admin',
            email: 'admin@anadol.com',
            password: hashedPassword,
            role: 'admin'
        });
        console.log('تم إنشاء الأدمن بنجاح!');
        process.exit();
    } catch (e) {
        console.error('فشل الإنشاء:', e);
    }
}
createAdmin();