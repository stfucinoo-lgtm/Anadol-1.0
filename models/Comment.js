const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  blogPostId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'Comments',
  timestamps: true
});

// تعريف العلاقات البرمجية الآمنة لجدول التعليقات
Comment.associate = (models) => {
  if (models.BlogPost) {
    Comment.belongsTo(models.BlogPost, {
      foreignKey: 'blogPostId',
      as: 'post'
    });
  }
  if (models.User) {
    Comment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  }
};

module.exports = Comment;
