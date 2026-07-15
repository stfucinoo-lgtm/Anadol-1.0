/**
 * ANADOL League - Match Model
 * تعريف جدول المباريات وحالاتها في قاعدة البيانات باستخدام Sequelize.
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Match = sequelize.define('Match', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    homeTeamId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'teams',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    awayTeamId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'teams',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    matchDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    homeScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    awayScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM('not_played_yet', 'being_played_right_now', 'finished'),
        allowNull: false,
        defaultValue: 'not_played_yet'
    },
    possessionHome: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 50, // القيمة الافتراضية المناصفة قبل إدخال الإحصائيات
        validate: {
            min: 0,
            max: 100
        }
    },
    possessionAway: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 50,
        validate: {
            min: 0,
            max: 100
        }
    }
}, {
    tableName: 'matches',
    timestamps: true
});

module.exports = Match;