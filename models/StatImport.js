const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StatImport = sequelize.define('StatImport', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  matchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Matches', // اسم جدول المباريات الفعلي في قاعدة البيانات
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rawExtractedData: {
    type: DataTypes.JSONB, // استخدام JSONB لتخزين البيانات المعقدة بكفاءة في PostgreSQL
    allowNull: false,
    comment: 'البيانات الخام المستخرجة من نموذج Gemini مباشرة دون تعديل'
  },
  correctedData: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'بيانات الإحصائيات بعد مراجعتها وتعديلها من قِبل المسؤول والموافقة عليها'
  },
  status: {
    type: DataTypes.ENUM('pending_review', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending_review'
  }
}, {
  tableName: 'StatImports',
  timestamps: true // يتكفل بإنشاء وإدارة حقلي createdAt و updatedAt تلقائياً
});

// تعريف العلاقات البرمجية (Associations)
StatImport.associate = (models) => {
  if (models.Match) {
    StatImport.belongsTo(models.Match, {
      foreignKey: 'matchId',
      as: 'match'
    });
  }
};

module.exports = StatImport;