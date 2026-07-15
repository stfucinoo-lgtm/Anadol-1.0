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
    allowNull: false,
    references: {
      model: 'BlogPosts', // ربط التعليق بالمقال المستهدف
      key: 'id'
    },
    onDelete: 'CASCADE' // حذف التعليقات تلقائياً عند حذف المقال المقترن بها
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users', // ربط التعليق بالمستخدم الذي قام بنشره
      key: 'id'
    },
    onDelete: 'CASCADE' // حذف التعليقات في حال حذف حساب المستخدم نهائياً
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'نص التعليق المدون بواسطة الزائر أو العضو'
  }
}, {
  tableName: 'Comments',
  timestamps: true // يتكفل بإنشاء حقل createdAt المطابق لعقد البيانات لتسجيل تاريخ كتابة التعليق
});

// تعريف العلاقات البرمجية للتعليقات
Comment.associate = (models) => {
  // علاقة التعليق بالمقال
  if (models.BlogPost) {
    Comment.belongsTo(models.BlogPost, {
      foreignKey: 'blogPostId',
      as: 'post'
    });
  }
  // علاقة التعليق بالمستخدم (الكاتب) لجلب تفاصيل حسابه تلقائياً عند العرض
  if (models.User) {
    Comment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  }
};

module.exports = Comment;