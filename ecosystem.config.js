require('dotenv').config();

module.exports = {
  apps: [
    {
      name: "social-hub",
      script: "dist/index.js",
      disable_trace: true,
      env: {
        NODE_ENV: process.env.NODE_ENV || "production",
        PORT: process.env.PORT || "8080",
        API_URL: process.env.API_URL || "https://clickera.app",
        DB_HOST: "localhost",
        DB_PORT: "55432",
        REDIS_HOST: "localhost",
        REDIS_PORT: "6379"
      }
    },
    {
      name: "twitter-auth",
      script: "dist/platforms/twitter/TwitterAdapter.js",
      disable_trace: true,
      env: {
        NODE_ENV: process.env.NODE_ENV || "production",
        DB_HOST: "localhost",
        DB_PORT: "55432",
        REDIS_HOST: "localhost",
        REDIS_PORT: "6379"
      }
    },
    {
      name: "clickera-client",
      script: "npm",
      args: "start",
      cwd: "./client",
      env: {
        NODE_ENV: "production",
        PORT: "3000"
      }
    }
  ]
};
