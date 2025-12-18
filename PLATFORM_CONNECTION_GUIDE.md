# Platform Connection Guide

Complete guide to connecting and managing multiple social media platforms in the Hub Social Media application.

## Overview

The Hub Social Media platform allows you to connect multiple accounts from different social media platforms. Once connected, you can:

- Manage all your social accounts from one dashboard
- Post to multiple platforms simultaneously
- Schedule content across different platforms
- Monitor engagement metrics from all accounts
- Switch between accounts when publishing content

## Supported Platforms

### Twitter (X) - OAuth 2.0 ✅
- **Status**: Fully implemented with OAuth 2.0
- **Authentication**: Secure OAuth flow
- **Multiple Accounts**: Yes, support for multiple Twitter accounts
- **Features**: Post, schedule, monitor engagement

### Instagram - Coming Soon
- **Status**: Infrastructure ready, OAuth implementation in progress
- **Expected**: OAuth 2.0 with Instagram Graph API
- **Multiple Accounts**: Yes

### Facebook - Coming Soon
- **Status**: Infrastructure ready, OAuth implementation in progress
- **Expected**: OAuth 2.0 with Facebook Graph API
- **Multiple Accounts**: Yes

### LinkedIn - Coming Soon
- **Status**: Infrastructure ready
- **Multiple Accounts**: Yes

### Telegram - Supported
- **Status**: Bot token authentication available
- **Multiple Accounts**: Yes, multiple channels supported

## How to Connect Platforms

### Step 1: Navigate to Settings

1. Click on your profile icon or menu
2. Select **Settings**
3. You'll see the **Connected Accounts** section

### Step 2: Click "Connect" Button

1. In the **Quick Connect** section, find the platform you want to connect
2. Click the **Connect** button for that platform
3. You'll be redirected to the platform's authorization page

### Step 3: Authorize Access

#### For Twitter (X):
1. You'll be redirected to Twitter's authorization page
2. Review the requested permissions
3. Click **Authorize** to grant access
4. You'll be redirected back to the app

#### For Other Platforms:
- Similar OAuth flow with platform-specific authorization pages

### Step 4: Confirm Connection

Once authorized:
- The account will appear in your **Connected Accounts** list
- Status will show as **Active** (green checkmark)
- Last verified timestamp will be displayed

## Managing Connected Accounts

### View Connected Accounts

All your connected accounts are displayed in a list showing:
- **Platform**: Which social media platform
- **Account Name**: Your reference name for this account
- **Account ID**: The username/handle on that platform
- **Status**: Active/Inactive indicator
- **Last Verified**: When credentials were last validated

### Test Account Connection

To verify your account credentials are still valid:

1. Find the account in your Connected Accounts list
2. Click the **Test** button
3. Wait for the verification to complete
4. You'll see a success or error message

### Disconnect Account

To remove a connected account:

1. Find the account in your Connected Accounts list
2. Click the **Trash icon** on the right
3. Confirm deletion
4. The account will be removed from your list

### Set as Default Account

If you have multiple accounts for the same platform:

1. The account used most recently will be set as default
2. When publishing, the default account will be pre-selected
3. You can still choose any connected account when creating posts

## Technical Details

### Database Schema

Connected accounts are stored in the `platform_credentials` table:

```sql
CREATE TABLE platform_credentials (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  platform VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_identifier VARCHAR(255) NOT NULL,
  credentials TEXT NOT NULL (encrypted),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  last_validated TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Encryption

All credentials are encrypted using AES-256 encryption before storage:
- Stored in the `credentials` column as encrypted JSON
- Decrypted only when needed for API calls
- Never logged or exposed in error messages

### API Endpoints

#### List All Connected Accounts
```
GET /api/platform-accounts
Response: Array of connected accounts for current user
```

#### Add New Account
```
POST /api/platform-accounts
Body: {
  platform: string,
  accountName: string,
  accountIdentifier: string,
  credentials: object
}
```

#### Update Account
```
PATCH /api/platform-accounts/:id
Body: {
  accountName?: string,
  credentials?: object,
  isActive?: boolean
}
```

#### Delete Account
```
DELETE /api/platform-accounts/:id
```

#### Test Account Credentials
```
POST /api/platform-accounts/:id/test
Response: { success: true, message: "Account credentials are valid" }
```

#### Get OAuth Authorization URL
```
GET /oauth/:platform/auth-url
Response: { authUrl: "https://..." }
```

#### OAuth Callback
```
GET /oauth/:platform/callback
Automatically handles token exchange and account creation
```

## Troubleshooting

### "Failed to connect account" Error

**Cause**: OAuth authorization failed
**Solution**:
1. Check that you're authorizing the correct account
2. Verify you have the necessary permissions on that account
3. Try disconnecting and reconnecting
4. Clear browser cache and try again

### "Credentials test failed" Error

**Cause**: Stored credentials are no longer valid
**Solution**:
1. The account may have changed credentials on the platform
2. Your app authorization may have been revoked
3. Disconnect and reconnect the account
4. For platforms with token expiration (Twitter), refresh the token

### Account shows as "Inactive"

**Cause**: Credentials were invalid during validation
**Solution**:
1. Click the **Test** button to verify
2. If it fails, disconnect and reconnect
3. Check that the account still exists on the platform
4. Verify your internet connection

### Multiple Accounts for Same Platform

**Behavior**: You can connect as many accounts as you want
**Usage**: When creating a post, select which account to use
**Default**: Most recently used account is pre-selected

## Security Considerations

### Credential Storage
- All credentials are encrypted with 256-bit AES encryption
- Keys are derived from the application's ENCRYPTION_KEY
- Credentials are never logged or exposed
- Each credential set is independent

### Token Management
- OAuth tokens are stored encrypted
- Refresh tokens are used to obtain new access tokens
- Expired tokens are automatically refreshed
- Invalid tokens trigger re-authentication

### Permission Scopes
- Each platform requests only necessary permissions
- You can revoke permissions at any time on the platform
- Revoking permissions requires reconnecting the account

### Audit Trail
- All account connections are logged with timestamp
- Account actions are tracked for security
- Suspicious activity triggers alerts

## Advanced Usage

### Connecting via API

If you need to add accounts programmatically:

```javascript
const response = await fetch('/api/platform-accounts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    platform: 'twitter',
    accountName: 'My Business Account',
    accountIdentifier: '@mybusiness',
    credentials: {
      apiKey: '...',
      apiSecret: '...',
      accessToken: '...',
      accessTokenSecret: '...'
    }
  })
});
```

### Getting Account Credentials

```javascript
// Fetch all accounts
const response = await fetch('/api/platform-accounts', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const accounts = await response.json();

// Filter by platform
const twitterAccounts = accounts.filter(a => a.platform === 'twitter');

// Get default account
const defaultAccount = accounts.find(a => a.isDefault);
```

### Batch Operations

When publishing to multiple accounts:

1. Iterate through selected accounts
2. For each account, call the appropriate platform API
3. Use the stored credentials to authenticate
4. Track success/failure for each account
5. Display results to user

## Getting Platform Credentials

### Twitter (X)

1. Go to [https://developer.twitter.com](https://developer.twitter.com)
2. Create a developer account if you don't have one
3. Create a new app or select existing app
4. Go to "Keys and tokens" tab
5. Copy:
   - API Key (Consumer Key)
   - API Secret (Consumer Secret)
   - Access Token
   - Access Token Secret
6. Ensure you have the right permissions set (Read, Write, Direct Messages)

### Instagram (Coming Soon)

1. Go to [https://developers.facebook.com](https://developers.facebook.com)
2. Create a Facebook app
3. Add Instagram Graph API to your app
4. Get your access token
5. Get your Instagram Business Account ID

### Facebook (Coming Soon)

1. Go to [https://developers.facebook.com](https://developers.facebook.com)
2. Create a Facebook app
3. Add Facebook Login to your app
4. Get your access token
5. Get your Page ID

### LinkedIn (Coming Soon)

1. Go to [https://www.linkedin.com/developers](https://www.linkedin.com/developers)
2. Create a LinkedIn app
3. Get your Client ID and Client Secret
4. Set up OAuth redirect URI

### Telegram

1. Go to [https://t.me/botfather](https://t.me/botfather)
2. Create a new bot: `/newbot`
3. Follow the prompts
4. Copy the bot token provided
5. Set up webhooks if needed

## FAQ

**Q: Can I connect multiple accounts for the same platform?**
A: Yes! You can connect as many accounts as you want for each platform.

**Q: What happens if I revoke authorization on the platform?**
A: The credentials will become invalid. You'll need to reconnect when you try to use that account.

**Q: Are my credentials secure?**
A: Yes, all credentials are encrypted with 256-bit AES encryption and never exposed.

**Q: Can I export my connected accounts?**
A: Currently no, but you can view all connected accounts in the Settings page.

**Q: How often are credentials validated?**
A: Credentials are validated when you click "Test" and occasionally when used for publishing.

**Q: What if a platform disconnects my app?**
A: You'll need to reconnect by going through the OAuth flow again.

**Q: Can I schedule posts to multiple platforms?**
A: Yes, when creating a post, you can select multiple accounts and schedule for all of them.

**Q: How many accounts can I connect?**
A: Technically unlimited, but performance may vary with very large numbers.

## Support

For issues with platform connections:

1. Check the troubleshooting section above
2. Verify your internet connection
3. Clear browser cache and cookies
4. Try reconnecting the account
5. Contact support if issues persist

---

**Last Updated**: December 18, 2025
