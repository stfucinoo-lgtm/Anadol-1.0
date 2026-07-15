const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'معرّف المسؤول الذي قام بالعملية'
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'اسم المستخدم لتبسيط العرض المباشر في الواجهة الإدارية'
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'نوع الإجراء المتخذ مثل delete_record أو update_record'
  },
  tableName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'اسم الجدول المستهدف في العملية'
  },
  recordId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'معرّف السجل المتأثر داخل الجدول'
  },
  oldValue: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'القيم السابقة للحقول قبل التعديل'
  },
  newValue: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'القيم الجديدة للحقول بعد التعديل'
  }
}, {
  tableName: 'audit_log',
  timestamps: true,
  updatedAt: false // سجل التدقيق للقراءة والتسجيل فقط، لا يعدل بعد إنشائه
});

module.exports = AuditLog;