const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');
const path = require('path');

class MultiAccountTwitterClient {
  constructor() {
    this.accountsCache = new Map();
    this.loadAccounts();
  }

  loadAccounts() {
    const filePath = path.join(__dirname, '../../credentials/twitter_accounts.json');
    
    if (!fs.existsSync(filePath)) {
      console.log('No Twitter accounts file found. Use the auth server to authenticate accounts.');
      return;
    }

    try {
      const accounts = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Clear cache before loading
      this.accountsCache.clear();

      for (const [accountName, credentials] of Object.entries(accounts)) {
        const client = new TwitterApi({
          appKey: process.env.TWITTER_CONSUMER_KEY,
          appSecret: process.env.TWITTER_CONSUMER_SECRET,
          accessToken: credentials.accessToken,
          accessSecret: credentials.accessSecret,
        });

        this.accountsCache.set(accountName, {
          client: client.readWrite,
          credentials,
        });
      }

      console.log(`Loaded ${this.accountsCache.size} Twitter accounts:`,
        Array.from(this.accountsCache.keys()).join(', '));

      // Watch the credentials file so new accounts added by the auth server are picked up automatically
      fs.watchFile(filePath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs) {
          console.log('Detected change in twitter_accounts.json — reloading accounts');
          this.reloadAccounts();
        }
      });
    } catch (error) {
      console.error('Error loading Twitter accounts:', error);
    }
  }

  getAccountNames() {
    return Array.from(this.accountsCache.keys());
  }

  getAccount(accountName) {
    const account = this.accountsCache.get(accountName);
    if (!account) {
      throw new Error(`Twitter account '${accountName}' not found. Available accounts: ${this.getAccountNames().join(', ')}`);
    }
    return account;
  }

  async sendMessage(accountName, message, options = {}) {
    const account = this.getAccount(accountName);
    
    try {
      const result = await account.client.v2.tweet(message);
      
      // Update last used timestamp
      account.credentials.lastUsed = new Date();
      this.updateAccountCredentials(accountName, account.credentials);
      
      return {
        success: true,
        tweetId: result.data.id,
        text: result.data.text,
        account: account.credentials.username,
        accountName,
      };
    } catch (error) {
      throw new Error(`Failed to post to @${account.credentials.username} (${accountName}): ${error.message}`);
    }
  }

  async sendMessageWithMedia(accountName, message, mediaPath, options = {}) {
    const account = this.getAccount(accountName);
    
    try {
      // Upload media first
      const mediaId = await account.client.v1.uploadMedia(mediaPath);

      // Tweet with media
      const result = await account.client.v2.tweet({
        text: message,
        media: { media_ids: [mediaId] }
      });

      // Update last used timestamp
      account.credentials.lastUsed = new Date();
      this.updateAccountCredentials(accountName, account.credentials);

      return {
        success: true,
        tweetId: result.data.id,
        text: result.data.text,
        account: account.credentials.username,
        accountName,
        hasMedia: true,
      };
    } catch (error) {
      throw new Error(`Failed to post media to @${account.credentials.username} (${accountName}): ${error.message}`);
    }
  }

  async sendMessageToAll(message, options = {}) {
    const results = [];
    const errors = [];

    for (const accountName of this.getAccountNames()) {
      try {
        const result = await this.sendMessage(accountName, message, options);
        results.push(result);
      } catch (error) {
        errors.push({ accountName, error: error.message });
      }
    }

    return {
      success: results.length > 0,
      results,
      errors,
      totalAccounts: this.getAccountNames().length,
      successCount: results.length,
      errorCount: errors.length,
    };
  }

  async sendMessageToMultiple(accountNames, message, options = {}) {
    const results = [];
    const errors = [];

    for (const accountName of accountNames) {
      try {
        const result = await this.sendMessage(accountName, message, options);
        results.push(result);
      } catch (error) {
        errors.push({ accountName, error: error.message });
      }
    }

    return {
      success: results.length > 0,
      results,
      errors,
      requestedAccounts: accountNames.length,
      successCount: results.length,
      errorCount: errors.length,
    };
  }

  getAccountInfo(accountName) {
    const account = this.getAccount(accountName);
    return {
      accountName,
      username: account.credentials.username,
      displayName: account.credentials.displayName,
      userId: account.credentials.userId,
      createdAt: account.credentials.createdAt,
      lastUsed: account.credentials.lastUsed,
    };
  }

  getAllAccountsInfo() {
    return this.getAccountNames().map(name => this.getAccountInfo(name));
  }

  updateAccountCredentials(accountName, credentials) {
    const filePath = path.join(__dirname, '../../credentials/twitter_accounts.json');
    
    try {
      let accounts = {};
      if (fs.existsSync(filePath)) {
        accounts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
      
      accounts[accountName] = credentials;
      fs.writeFileSync(filePath, JSON.stringify(accounts, null, 2), { mode: 0o600 });
      try { fs.chmodSync(filePath, 0o600); } catch (e) {/* ignore */}
      
      // Update cache
      if (this.accountsCache.has(accountName)) {
        this.accountsCache.get(accountName).credentials = credentials;
      }
    } catch (error) {
      console.error('Error updating account credentials:', error);
    }
  }

  reloadAccounts() {
    this.accountsCache.clear();
    this.loadAccounts();
  }
}

module.exports = MultiAccountTwitterClient;