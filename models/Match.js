/**
 * ANADOL League - Match Model
 * تعريف جدول المباريات وحالاتها والإحصائيات التفصيلية للمباراة في قاعدة البيانات باستخدام Sequelize.
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
    },

    // ==========================================
    // إحصائيات المباراة التفصيلية (تفصيل الفريقين)
    // ==========================================
    
    // التسديدات
    shotsHome: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    shotsAway: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    shotsOnTargetHome: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    shotsOnTargetAway: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },

    // الأخطاء والتسلل
    foulsHome: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    foulsAway: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    offsidesHome: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    offsidesAway: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },

    // الضربات الركنية والحرة
    cornersHome: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    cornersAway: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    freeKicksHome: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    freeKicksAway: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },

    // التمريرات والتمريرات الناجحة
    passesHome: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    passesAway: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    passesCompletedHome: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    passesCompletedAway: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },

    // العرضيات وافتكاك الكرة
    crossesHome: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    crossesAway: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    interceptionsHome: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    interceptionsAway: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },

    // التدخلات والتصديات
    tacklesHome: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    tacklesAway: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    savesHome: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    savesAway: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    tableName: 'matches',
    timestamps: true
});

module.exports = Match;
