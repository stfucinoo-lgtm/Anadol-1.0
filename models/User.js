const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 30]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'editor', 'visitor'),
    allowNull: false,
    defaultValue: 'visitor' // التسجيل العام يُنشئ زوار فقط كقاعدة أمنية مطلقة
  },
  banned: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

/**
 * دالة مساعدة لمقارنة كلمة المرور المدخلة مع الرمز المشفر المخزن
 * @param {string} password - كلمة المرور المدخلة من واجهة تسجيل الدخول
 * @returns {Promise<boolean>} - تطابق كلمة المرور من عدمه
 */
User.prototype.validPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = User;