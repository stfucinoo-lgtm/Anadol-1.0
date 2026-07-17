const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BlogPost = sequelize.define('BlogPost', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'عنوان المقال الرياضي أو التحليل الفني'
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'الرابط اللطيف المعبر عن عنوان المقال للتصفح السهل'
  },
  authorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users', // تم تصحيحها للأحرف الصغيرة لتطابق جدول المستخدمين الفعلي
      key: 'id'
    },
    onDelete: 'RESTRICT' // يمنع حذف الكاتب طالما لديه مقالات منشورة كإجراء تدقيقي وحفظ أرشيفي
  },
  featuredImageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'رابط الصورة البارزة أو الملخص المصور للمباراة'
  },
  excerpt: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'مقتطف موجز وسريع يظهر في صفحة قائمة المقالات التلخيصية'
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'المحتوى التحريري الكامل للمقال بما يشمل النصوص والتحليلات العميقة'
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'تاريخ وساعة نشر المقال الرسمي للجمهور'
  }
}, {
  tableName: 'BlogPosts',
  timestamps: true // يقوم بإنشاء وإدارة حقلي createdAt و updatedAt
});

// تعريف العلاقات البرمجية للمقالات
BlogPost.associate = (models) => {
  // علاقة كاتب المقال (مستخدم)
  if (models.User) {
    BlogPost.belongsTo(models.User, {
      foreignKey: 'authorId',
      as: 'author'
    });
  }
  // علاقة التعليقات المرتبطة بالمقال
  if (models.Comment) {
    BlogPost.hasMany(models.Comment, {
      foreignKey: 'blogPostId',
      as: 'comments',
      onDelete: 'CASCADE' // عند حذف مقال، تُحذف جميع التعليقات التابعة له تلقائياً
    });
  }
};

module.exports = BlogPost;
