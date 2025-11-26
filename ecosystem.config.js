require('dotenv').config();

module.exports = {
  apps: [
    {
      name: "social-hub",
      script: "dist/index.js",
      env: {
        NODE_ENV: process.env.NODE_ENV || "production",
        PORT: process.env.PORT || "33010",
        API_URL: process.env.API_URL || "https://pnptv.app"
      }
    },
    {
      name: "twitter-auth",
      script: "dist/platforms/twitter/TwitterAdapter.js",
      env: {
        NODE_ENV: process.env.NODE_ENV || "production"
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
