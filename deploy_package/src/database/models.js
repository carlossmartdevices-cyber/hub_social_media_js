const { Sequelize, DataTypes } = require('sequelize');
const dbConnection = require('./dbConnection');

const ScheduledContent = dbConnection.define('ScheduledContent', {
  platform: DataTypes.STRING,
  message: DataTypes.TEXT,
  scheduledTime: DataTypes.DATE,
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  },
  metadata: DataTypes.TEXT
});

module.exports = { ScheduledContent };