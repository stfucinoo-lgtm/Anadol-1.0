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
        type: DataTypes.TEXT, // استخدام TEXT لدعم أطول الروابط وصور Base64
        allowNull: true
    },
    primaryColor: {
        type: DataTypes.STRING(7),
        allowNull: true,
        defaultValue: '#00ff87'
    },
    stadium: {
        type: DataTypes.STRING,
        allowNull: true
    },
    foundedYear: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'teams',
    timestamps: true
});

module.exports = Team;
