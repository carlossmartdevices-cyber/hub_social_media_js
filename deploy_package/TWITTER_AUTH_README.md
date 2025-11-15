# Twitter/X Multi-Account Authentication

This system allows the bot to authenticate and post to multiple Twitter/X accounts using OAuth 1.0a.

## Quick Setup

1. **Environment Variables** (add to your `.env` file):
```bash
# Required for Twitter authentication
TWITTER_CONSUMER_KEY=your_consumer_key
TWITTER_CONSUMER_SECRET=your_consumer_secret

# Auth server configuration
TWITTER_AUTH_PORT=3001
TWITTER_AUTH_BASE_URL=https://pnptv.app
```

2. **Start the Authentication Server**:
```bash
node src/auth/authServer.js
```

3. **Open the Web Interface**:
Navigate to `https://pnptv.app` (or your configured base URL)

## How It Works

### 1. Authentication Flow
- User visits `/auth/twitter/start?accountName=your_account_name`
- System generates OAuth request token from Twitter
- User is redirected to Twitter to authorize the app
- Twitter redirects back with verification code
- System exchanges for permanent access tokens
- Credentials are securely stored in `credentials/twitter_accounts.json`

### 2. Multi-Account Client
The `MultiAccountTwitterClient` class manages multiple authenticated accounts:

```javascript
const MultiAccountTwitterClient = require('./src/auth/multiAccountTwitterClient');
const multiTwitter = new MultiAccountTwitterClient();

// Post to specific account
await multiTwitter.sendMessage('main_account', 'Hello World!');

// Post to all accounts
await multiTwitter.sendMessageToAll('Breaking news!');

// Post to multiple accounts
await multiTwitter.sendMessageToMultiple(['account1', 'account2'], 'Update!');

// Post with media
await multiTwitter.sendMessageWithMedia('account1', 'Check this out!', '/path/to/image.jpg');
```

## API Endpoints

### Authentication
- `GET /auth/twitter/start?accountName=name` - Start OAuth flow
- `GET /auth/twitter/callback` - OAuth callback (handled automatically)

### Account Management  
- `GET /accounts` - List all authenticated accounts
- `DELETE /accounts/:accountName` - Remove an account

### Testing
- `POST /test/:accountName` - Send test tweet
  ```json
  { "message": "Test tweet content" }
  ```

## Web Interface Features

- **Account Authentication**: Easy OAuth flow with popup windows
- **Account Management**: View and remove connected accounts
- **Test Posting**: Send test tweets to verify accounts work
- **Real-time Updates**: Automatic refresh of account status
- **Character Counter**: Live tweet length validation

## Security Features

- **Token Storage**: Credentials stored locally in JSON file (use database in production)
- **Session Management**: Temporary auth sessions with 15-minute expiration
- **Error Handling**: Comprehensive error messages and validation
- **Account Isolation**: Each account maintains separate credentials

## Integration with Main Bot

Update your main bot to use the multi-account client:

```javascript
// In your bot initialization
const MultiAccountTwitterClient = require('./src/auth/multiAccountTwitterClient');
this.multiTwitter = new MultiAccountTwitterClient();

// In your posting logic
if (options.twitterAccount) {
  // Post to specific account
  result = await this.multiTwitter.sendMessage(options.twitterAccount, message);
} else {
  // Post to all accounts
  result = await this.multiTwitter.sendMessageToAll(message);
}
```

## Production Considerations

1. **Database Storage**: Replace JSON file with proper database
2. **HTTPS**: Ensure your callback URL uses HTTPS
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Monitoring**: Add logging and monitoring for auth flows
5. **Backup**: Backup your credentials regularly

## Troubleshooting

### Common Issues

1. **"Invalid callback URL"**:
   - Ensure `TWITTER_AUTH_BASE_URL` matches your domain
   - Verify callback URL in Twitter app settings

2. **"App not authorized"**:
   - Check Twitter app permissions (must be "Read and Write")
   - Verify consumer key/secret are correct

3. **"Account not found"**:
   - Run `loadAccounts()` to refresh the client
   - Check if credentials file exists and is readable

### Debug Mode
Set environment variable for detailed logs:
```bash
DEBUG=twitter-auth node src/auth/authServer.js
```

## Twitter App Setup

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/apps)
2. Create a new app or use existing one
3. Set permissions to "Read and Write"
4. Add callback URL: `https://pnptv.app/auth/twitter/callback`
5. Copy Consumer Key and Consumer Secret to your `.env` file

## File Structure

```
src/auth/
├── twitterAuth.js           # Main OAuth 1.0a flow handler
├── authServer.js           # Express server for authentication
├── multiAccountTwitterClient.js  # Multi-account Twitter client
public/
├── index.html             # Web interface for account management
credentials/
├── twitter_accounts.json  # Stored account credentials (auto-created)
```