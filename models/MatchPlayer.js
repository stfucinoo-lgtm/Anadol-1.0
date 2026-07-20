const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MatchPlayer = sequelize.define('MatchPlayer', {
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
  rating: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 1.0,
      max: 10.0
    },
    comment: 'تقييم اللاعب في هذه المباراة المحددة من 1.0 إلى 10.0'
  },
  isStarting: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'يحدد ما إذا كان اللاعب أساسياً في اللقاء (true) أم احتياطياً على مقاعد البدلاء (false)'
  },
  position: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'رمز مركز اللاعب في تشكيلة المباراة (مثلاً: GK, CB, CM, ST)'
  },
  positionX: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    },
    comment: 'موضع اللاعب الأفقي على الملعب التفاعلي كنسبة مئوية (0-100)'
  },
  positionY: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    },
    comment: 'موضع اللاعب العمودي على الملعب التفاعلي كنسبة مئوية (0-100)'
  }
}, {
  tableName: 'match_players',
  timestamps: true
});

module.exports = MatchPlayer;
