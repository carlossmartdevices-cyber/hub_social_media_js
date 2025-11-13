const { Sequelize, DataTypes } = require('sequelize');
const dbConnection = require('./dbConnection');

const ScheduledContent = dbConnection.define('ScheduledContent', {
  platform: DataTypes.STRING,
  message: DataTypes.TEXT,
  scheduledTime: {
    type: DataTypes.DATE,
    field: 'scheduled_time'  // Map to database column name
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  },
  metadata: DataTypes.TEXT
}, {
  tableName: 'scheduled_contents',  // Explicit table name
  underscored: true,  // Use snake_case for auto-generated fields
  timestamps: true,   // Enable timestamps
  createdAt: 'created_at',  // Map createdAt to created_at
  updatedAt: 'updated_at'   // Map updatedAt to updated_at
});

module.exports = { ScheduledContent };