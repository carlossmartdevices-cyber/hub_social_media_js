const { TwitterApi } = require('twitter-api-v2');
const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const path = require('path');

class TwitterAuthManager {
  constructor() {
    this.app = express();
    this.port = process.env.TWITTER_AUTH_PORT || 3001;
    this.baseUrl = process.env.TWITTER_AUTH_BASE_URL || 'https://pnptv.app';
    this.callbackUrl = `${this.baseUrl}/auth/twitter/callback`;
    
    // Store pending auth sessions (in production, use Redis or database)
    this.pendingAuths = new Map();
    
    // Initialize Twitter client for authentication (OAuth 1.0a requires CONSUMER credentials)
    if (!process.env.TWITTER_CONSUMER_KEY || !process.env.TWITTER_CONSUMER_SECRET) {
      throw new Error('TWITTER_CONSUMER_KEY and TWITTER_CONSUMER_SECRET are required for authentication');
    }
    
    this.twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_CONSUMER_KEY,
      appSecret: process.env.TWITTER_CONSUMER_SECRET,
    });
    
    this.setupRoutes();
  }

  setupRoutes() {
    this.app.use(express.json());
    this.app.use(express.static('public'));

    // Start authentication process
    this.app.get('/auth/twitter/start', async (req, res) => {
      try {
        const { accountName } = req.query;
        
        if (!accountName) {
          return res.status(400).json({ error: 'accountName parameter is required' });
        }

        // Generate request token
        const authLink = await this.twitterClient.generateAuthLink(this.callbackUrl, {
          linkMode: 'authorize' // Use 'authorize' for re-authentication
        });

        // Store the auth session
        const sessionId = crypto.randomUUID();
        this.pendingAuths.set(sessionId, {
          accountName,
          oauth_token: authLink.oauth_token,
          oauth_token_secret: authLink.oauth_token_secret,
          createdAt: new Date(),
        });

        // Clean up old sessions (older than 15 minutes)
        this.cleanupOldSessions();

        res.json({
          authUrl: authLink.url,
          sessionId,
          accountName,
          expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        });
      } catch (error) {
        console.error('Error starting Twitter auth:', error);
        res.status(500).json({ error: 'Failed to start authentication process' });
      }
    });

    // Handle callback from Twitter
    this.app.get('/auth/twitter/callback', async (req, res) => {
      try {
        const { oauth_token, oauth_verifier, denied } = req.query;

        if (denied) {
          return res.send(`
            <html>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h2>❌ Authentication Cancelled</h2>
                <p>You cancelled the authentication process.</p>
                <button onclick="window.close()">Close Window</button>
              </body>
            </html>
          `);
        }

        if (!oauth_token || !oauth_verifier) {
          return res.status(400).send('Missing required parameters');
        }

        // Find the pending auth session
        let authSession = null;
        for (const [sessionId, session] of this.pendingAuths.entries()) {
          if (session.oauth_token === oauth_token) {
            authSession = { sessionId, ...session };
            break;
          }
        }

        if (!authSession) {
          return res.status(400).send('Invalid or expired authentication session');
        }

        // Exchange for access token
        const client = new TwitterApi({
          appKey: process.env.TWITTER_CONSUMER_KEY,
          appSecret: process.env.TWITTER_CONSUMER_SECRET,
          accessToken: oauth_token,
          accessSecret: authSession.oauth_token_secret,
        });

        const { client: loggedClient, accessToken, accessSecret } = await client.login(oauth_verifier);

        // Get user info
        const userInfo = await loggedClient.v2.me();

        // Save the credentials
        const accountData = {
          accountName: authSession.accountName,
          username: userInfo.data.username,
          userId: userInfo.data.id,
          displayName: userInfo.data.name,
          accessToken,
          accessSecret,
          createdAt: new Date(),
          lastUsed: new Date(),
        };

        await this.saveAccountCredentials(accountData);

        // Clean up the pending auth
        this.pendingAuths.delete(authSession.sessionId);

        res.send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>✅ Authentication Successful!</h2>
              <p><strong>Account:</strong> ${authSession.accountName}</p>
              <p><strong>Twitter Username:</strong> @${userInfo.data.username}</p>
              <p><strong>Display Name:</strong> ${userInfo.data.name}</p>
              <p>Your Twitter account has been successfully connected to the bot.</p>
              <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: #1da1f2; color: white; border: none; border-radius: 5px; cursor: pointer;">Close Window</button>
            </body>
          </html>
        `);

      } catch (error) {
        console.error('Error handling Twitter callback:', error);
        res.status(500).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>❌ Authentication Failed</h2>
              <p>There was an error processing your authentication.</p>
              <p>Error: ${error.message}</p>
              <button onclick="window.close()">Close Window</button>
            </body>
          </html>
        `);
      }
    });

    // List authenticated accounts
    this.app.get('/accounts', async (req, res) => {
      try {
        const accounts = await this.getAuthenticatedAccounts();
        res.json(accounts);
      } catch (error) {
        console.error('Error getting accounts:', error);
        res.status(500).json({ error: 'Failed to get accounts' });
      }
    });

    // Remove account
    this.app.delete('/accounts/:accountName', async (req, res) => {
      try {
        const { accountName } = req.params;
        await this.removeAccount(accountName);
        res.json({ message: 'Account removed successfully' });
      } catch (error) {
        console.error('Error removing account:', error);
        res.status(500).json({ error: 'Failed to remove account' });
      }
    });

    // Test posting to account
    this.app.post('/test/:accountName', async (req, res) => {
      try {
        const { accountName } = req.params;
        const { message } = req.body;

        if (!message) {
          return res.status(400).json({ error: 'Message is required' });
        }

        const result = await this.testPost(accountName, message);
        res.json(result);
      } catch (error) {
        console.error('Error testing post:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }

  async saveAccountCredentials(accountData) {
    const credentialsDir = path.join(__dirname, '../../credentials');
    if (!fs.existsSync(credentialsDir)) {
      // Create credentials directory with restricted permissions
      fs.mkdirSync(credentialsDir, { recursive: true, mode: 0o700 });
    }

    const filePath = path.join(credentialsDir, 'twitter_accounts.json');
    
    let accounts = {};
    if (fs.existsSync(filePath)) {
      try {
        accounts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (error) {
        console.error('Error reading existing accounts:', error);
      }
    }

    accounts[accountData.accountName] = accountData;

    // Write file with restrictive permissions (owner read/write)
    try {
      fs.writeFileSync(filePath, JSON.stringify(accounts, null, 2), { mode: 0o600 });
      // Ensure file permissions are enforced on platforms where mode may be ignored
      try { fs.chmodSync(filePath, 0o600); } catch (e) {/* ignore */}
      console.log(`Saved credentials for account: ${accountData.accountName} (@${accountData.username})`);
    } catch (err) {
      console.error('Failed to save account credentials:', err);
      throw err;
    }
  }

  async getAuthenticatedAccounts() {
    const filePath = path.join(__dirname, '../../credentials/twitter_accounts.json');
    
    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const accounts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      // Return accounts without sensitive data
      return Object.values(accounts).map(account => ({
        accountName: account.accountName,
        username: account.username,
        displayName: account.displayName,
        userId: account.userId,
        createdAt: account.createdAt,
        lastUsed: account.lastUsed,
      }));
    } catch (error) {
      console.error('Error reading accounts:', error);
      return [];
    }
  }

  async getAccountCredentials(accountName) {
    const filePath = path.join(__dirname, '../../credentials/twitter_accounts.json');
    
    if (!fs.existsSync(filePath)) {
      throw new Error('No authenticated accounts found');
    }

    try {
      const accounts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const account = accounts[accountName];
      
      if (!account) {
        throw new Error(`Account '${accountName}' not found`);
      }

      return account;
    } catch (error) {
      throw new Error(`Failed to get credentials for '${accountName}': ${error.message}`);
    }
  }

  async removeAccount(accountName) {
    const filePath = path.join(__dirname, '../../credentials/twitter_accounts.json');
    
    if (!fs.existsSync(filePath)) {
      throw new Error('No authenticated accounts found');
    }

    try {
      const accounts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (!accounts[accountName]) {
        throw new Error(`Account '${accountName}' not found`);
      }

      delete accounts[accountName];
      fs.writeFileSync(filePath, JSON.stringify(accounts, null, 2));
      console.log(`Removed account: ${accountName}`);
    } catch (error) {
      throw new Error(`Failed to remove account '${accountName}': ${error.message}`);
    }
  }

  async testPost(accountName, message) {
    const credentials = await this.getAccountCredentials(accountName);
    
    const client = new TwitterApi({
      appKey: process.env.TWITTER_CONSUMER_KEY,
      appSecret: process.env.TWITTER_CONSUMER_SECRET,
      accessToken: credentials.accessToken,
      accessSecret: credentials.accessSecret,
    });

    const result = await client.v2.tweet(message);
    
    // Update last used timestamp
    credentials.lastUsed = new Date();
    await this.saveAccountCredentials(credentials);

    return {
      success: true,
      tweetId: result.data.id,
      text: result.data.text,
      account: credentials.username,
    };
  }

  cleanupOldSessions() {
    const now = new Date();
    for (const [sessionId, session] of this.pendingAuths.entries()) {
      if (now - session.createdAt > 15 * 60 * 1000) { // 15 minutes
        this.pendingAuths.delete(sessionId);
      }
    }
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`Twitter Auth Server running on port ${this.port}`);
      console.log(`Base URL: ${this.baseUrl}`);
      console.log(`\nTo authenticate a Twitter account:`);
      console.log(`GET ${this.baseUrl}/auth/twitter/start?accountName=your_account_name`);
      console.log(`\nTo list accounts:`);
      console.log(`GET ${this.baseUrl}/accounts`);
    });
  }
}

module.exports = TwitterAuthManager;