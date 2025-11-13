require('dotenv').config();

module.exports = {
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: process.env.DB_PORT || 5432,
  dbName: process.env.DB_NAME || 'hub_social_media',
  dbUser: process.env.DB_USER || 'admin',
  dbPassword: process.env.DB_PASSWORD || ''
};