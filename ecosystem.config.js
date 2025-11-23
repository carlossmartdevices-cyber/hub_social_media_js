module.exports = {
  apps: [
    {
      name: "social-hub",
      script: "dist/index.js",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "twitter-auth",
      script: "dist/platforms/twitter/TwitterAdapter.js",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
