const TwitterAuthManager = require('./twitterAuth');

// Create and start the authentication server
async function startAuthServer() {
  try {
    const authManager = new TwitterAuthManager();
    authManager.start();
  } catch (error) {
    console.error('Failed to start Twitter auth server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down Twitter auth server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down Twitter auth server...');
  process.exit(0);
});

if (require.main === module) {
  startAuthServer();
}

module.exports = { TwitterAuthManager };