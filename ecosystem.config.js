module.exports = {
  apps: [
    {
      name: 'hub-backend-production',
      script: 'dist/index.js',
      cwd: '/root/hub_social_media_js',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      error_file: '/root/.pm2/logs/hub-backend-error.log',
      out_file: '/root/.pm2/logs/hub-backend-out.log'
    },
    {
      name: 'hub-frontend-production',
      script: 'npm',
      args: 'run start',
      cwd: '/root/hub_social_media_js/client',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/root/.pm2/logs/hub-frontend-error.log',
      out_file: '/root/.pm2/logs/hub-frontend-out.log'
    }
  ]
};
