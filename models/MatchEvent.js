const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MatchEvent = sequelize.define('MatchEvent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  matchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'matches',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  teamId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'teams',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  playerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'players',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  type: {
    type: DataTypes.ENUM('goal', 'yellow_card', 'red_card', 'substitution', 'shot', 'tackle'),
    allowNull: false
  },
  minute: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 120 // يشمل الأشواط الإضافية المحتملة
    }
  },
  x: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    },
    comment: 'الإحداثي الأفقي على أرض الملعب كنسبة مئوية من 0 إلى 100'
  },
  y: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    },
    comment: 'الإحداثي العمودي على أرض الملعب كنسبة مئوية من 0 إلى 100'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'بيانات إضافية مثل صانع الهدف assistPlayerId أو تفاصيل التبديل'
  }
}, {
  tableName: 'match_events',
  timestamps: true
});

module.exports = MatchEvent;