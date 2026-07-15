const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AppSettings = sequelize.define('AppSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  maintenanceMode: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'مؤشر تفعيل وضع الصيانة لجميع زوار المنصة'
  }
}, {
  tableName: 'app_settings',
  timestamps: true
});

module.exports = AppSettings;