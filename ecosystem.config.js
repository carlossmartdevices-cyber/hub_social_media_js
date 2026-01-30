const path = require('path');

const baseDir = path.resolve(__dirname);
const logDir =
  process.env.PM2_LOG_DIR ||
  path.join(process.env.HOME || '/tmp', '.pm2', 'logs');

module.exports = {
  apps: [
    {
      name: 'hub-backend-production',
      script: path.join(baseDir, 'dist', 'index.js'),
      cwd: baseDir,
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 8080,
      },
      error_file: path.join(logDir, 'hub-backend-error.log'),
      out_file: path.join(logDir, 'hub-backend-out.log'),
    },
    {
      name: 'hub-frontend-production',
      script: 'npm',
      args: 'run start',
      cwd: path.join(baseDir, 'client'),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.FRONTEND_PORT || 3000,
      },
      error_file: path.join(logDir, 'hub-frontend-error.log'),
      out_file: path.join(logDir, 'hub-frontend-out.log'),
    },
  ],
};
