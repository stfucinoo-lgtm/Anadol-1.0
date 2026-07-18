/**
 * ANADOL League - Player Model
 * تعريف جدول اللاعبين وعلاقتهم بالفرق في قاعدة البيانات باستخدام Sequelize.
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Player = sequelize.define('Player', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    teamId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'teams', // يشير إلى اسم جدول الفرق الفعلي في قاعدة البيانات
            key: 'id'
        },
        onDelete: 'CASCADE' // عند حذف الفريق، يُحذف لاعبوه تلقائياً لسلامة البيانات الفنية
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    jerseyNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            isInt: true,
            min: 1,
            max: 99
        }
    },
    position: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    photoUrl: {
        type: DataTypes.TEXT, // تم التغيير من STRING إلى TEXT ليتسع لسلاسل Base64 الطويلة للصور المرفوعة دون حدوث قطع
        allowNull: true
        // تم إزالة التحقق الصارم checkUrl لتسهيل قبول الصور المرفوعة محلياً والروابط الخارجية معاً
    }
}, {
    tableName: 'players',
    timestamps: true
});

module.exports = Player;
