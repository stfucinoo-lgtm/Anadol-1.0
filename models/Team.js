/**
 * ANADOL League - Team Model
 * تعريف جدول الفرق في قاعدة البيانات باستخدام Sequelize.
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Team = sequelize.define('Team', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    crestUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: true // التأكد من صحة الرابط المدخل لشعار النادي
        }
    },
    primaryColor: {
        type: DataTypes.STRING(7), // تخزين اللون بصيغة الـ Hex مثل #00ff87
        allowNull: true,
        defaultValue: '#00ff87'
    },
    stadium: {
        type: DataTypes.STRING,
        allowNull: true
    },
    foundedYear: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            isInt: true,
            min: 1800,
            max: new Date().getFullYear()
        }
    }
}, {
    tableName: 'teams',
    timestamps: true // يوفر حقول التحديث والتسجيل التلقائية
});

module.exports = Team;