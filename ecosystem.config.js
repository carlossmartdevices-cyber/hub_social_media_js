module.exports = {
  apps: [
    {
      name: "social-hub",
      script: "src/index.ts",
      interpreter: "./node_modules/.bin/ts-node",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "twitter-auth",
      script: "src/platforms/twitter/TwitterAdapter.ts",
      interpreter: "./node_modules/.bin/ts-node",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
