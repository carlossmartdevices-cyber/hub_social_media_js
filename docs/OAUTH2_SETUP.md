# OAuth2 Setup Guide for X (Twitter)

This guide explains how to set up and use OAuth2 authentication to allow users to connect their X (Twitter) accounts to the platform.

## Overview

The OAuth2 implementation allows users to:
- Connect multiple X/Twitter accounts
- Securely store account credentials
- Post to X on behalf of connected accounts
- Manage and disconnect accounts

## Architecture

### Backend Components

1. **OAuth2Controller** (`src/api/controllers/OAuth2Controller.ts`)
   - Handles OAuth authorization flow
   - Manages callback processing
   - Token refresh functionality

2. **OAuth2Service** (`src/services/OAuth2Service.ts`)
   - Generates OAuth URLs with PKCE
   - Exchanges authorization codes for tokens
   - Manages state validation
   - Stores credentials securely

3. **PlatformAccountController** (`src/api/controllers/PlatformAccountController.ts`)
   - Lists connected accounts
   - Manages account lifecycle (add/update/delete)
   - Tests account credentials

### Frontend Components

1. **Accounts Page** (`client/src/app/accounts/page.tsx`)
   - Displays all connected social media accounts
   - Provides "Add Account" buttons for each platform
   - Shows connection status
   - Allows disconnecting accounts

## API Endpoints

### 1. Get OAuth Authorization URL
```
GET /api/oauth/:platform/auth-url
```
**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `returnUrl` (optional): URL to redirect after OAuth completion

**Response:**
```json
{
  "success": true,
  "authUrl": "https://twitter.com/i/oauth2/authorize?...",
  "message": "Redirect user to this URL to authorize"
}
```

### 2. OAuth Callback (Twitter redirects here)
```
GET /api/oauth/twitter/callback
```
**Query Parameters:**
- `code`: Authorization code from Twitter
- `state`: CSRF protection token

**Response:** Redirects to frontend with success/error parameters

### 3. List Connected Accounts
```
GET /api/platform-accounts
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": "uuid",
    "platform": "twitter",
    "accountName": "My Twitter Account",
    "accountId": "@username",
    "isConnected": true,
    "profileUrl": "https://twitter.com/username",
    "lastValidated": "2025-01-15T10:30:00Z",
    "createdAt": "2025-01-10T08:00:00Z"
  }
]
```

### 4. Delete Account
```
DELETE /api/platform-accounts/:id
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

### 5. Refresh Token
```
POST /api/oauth/twitter/refresh/:accountId
```
**Headers:** `Authorization: Bearer <token>`

## Environment Configuration

### Required Environment Variables

```bash
# OAuth 2.0 credentials from Twitter Developer Portal
TWITTER_CLIENT_ID=your_client_id_here
TWITTER_CLIENT_SECRET=your_client_secret_here
TWITTER_REDIRECT_URI=https://yourdomain.com/api/oauth/twitter/callback

# API URL (used for OAuth redirects)
API_URL=https://yourdomain.com
```

### Getting Twitter OAuth Credentials

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app or select existing app
3. Navigate to "User authentication settings"
4. Set up OAuth 2.0:
   - **App permissions**: Read and Write
   - **Type of App**: Web App
   - **Callback URLs**: Add your redirect URI (e.g., `https://yourdomain.com/api/oauth/twitter/callback`)
   - **Website URL**: Your application URL
5. Copy the **Client ID** and **Client Secret**
6. Add them to your `.env` file

### Important Notes

- The `TWITTER_REDIRECT_URI` must match **exactly** what's configured in Twitter Developer Portal
- For local development, use: `http://localhost:33010/api/oauth/twitter/callback`
- For production, use your actual domain: `https://clickera.app/api/oauth/twitter/callback`
- You may need to add both URLs to Twitter's allowed callback URLs

## OAuth Flow

### Step-by-Step Process

1. **User clicks "Add Account"** on the frontend
   ```javascript
   // Frontend calls
   GET /api/oauth/twitter/auth-url
   ```

2. **Backend generates OAuth URL** with PKCE
   - Creates code verifier and challenge
   - Generates state token for CSRF protection
   - Stores state temporarily (10 min expiry)
   - Returns authorization URL

3. **User is redirected to Twitter**
   - User logs into Twitter (if not already)
   - Reviews app permissions
   - Authorizes the application

4. **Twitter redirects back to callback**
   ```
   GET /api/oauth/twitter/callback?code=xxx&state=yyy
   ```

5. **Backend processes callback**
   - Validates state token
   - Exchanges code for access token
   - Fetches user info from Twitter
   - Encrypts and stores credentials
   - Redirects user back to frontend

6. **Frontend shows success**
   - Account appears in connected accounts list
   - User can now post to this account

## Security Features

### PKCE (Proof Key for Code Exchange)
- Protects against authorization code interception
- Uses SHA-256 code challenge
- No client secret exposed to frontend

### State Validation
- Random state token prevents CSRF attacks
- State expires after 10 minutes
- Validated before token exchange

### Credential Encryption
- All tokens encrypted before storage
- Uses AES-256-GCM encryption
- Encryption key from `ENCRYPTION_KEY` env var

### Multi-Account Support
- Users can connect multiple X accounts
- Each account stored separately
- Unique constraint on (user_id, platform, account_identifier)

## Database Schema

```sql
CREATE TABLE platform_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_identifier VARCHAR(255) NOT NULL,
  credentials TEXT NOT NULL, -- Encrypted JSON
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  last_validated TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, platform, account_identifier)
);
```

### Encrypted Credentials Format (Twitter)

```json
{
  "accessToken": "xxx",
  "refreshToken": "yyy",
  "expiresAt": "2025-01-20T10:30:00Z",
  "userId": "twitter_user_id",
  "username": "twitter_username"
}
```

## Frontend Integration

### Using the Accounts Page

1. Navigate to `/accounts` in your application
2. Find the X (Twitter) card
3. Click "Add" button
4. Complete OAuth flow
5. Account appears in the list

### Example Frontend Code

```typescript
// Get OAuth URL
const connectTwitter = async () => {
  const response = await api.get('/oauth/twitter/auth-url');
  window.location.href = response.data.authUrl;
};

// List accounts
const fetchAccounts = async () => {
  const accounts = await api.get('/platform-accounts');
  setAccounts(accounts.data);
};

// Disconnect account
const disconnectAccount = async (accountId: string) => {
  await api.delete(`/platform-accounts/${accountId}`);
  fetchAccounts(); // Refresh list
};
```

## Troubleshooting

### "Invalid redirect URI" error
- Check `TWITTER_REDIRECT_URI` matches Twitter Developer Portal settings exactly
- Ensure protocol (http/https) matches
- Verify no trailing slash differences

### "Invalid or expired state parameter"
- State tokens expire after 10 minutes
- User may have taken too long to authorize
- Try the flow again

### "Failed to connect Twitter account"
- Check Twitter API credentials are correct
- Verify Twitter app has correct permissions (Read and Write)
- Check network connectivity
- Review server logs for detailed error

### Tokens expiring
- Access tokens expire (usually 2 hours)
- Use the refresh endpoint to get new tokens
- Refresh tokens are long-lived (but can be revoked)

## Testing

### Manual Testing

1. Create a test user account
2. Navigate to `/accounts` page
3. Click "Add" on X (Twitter)
4. Complete OAuth flow
5. Verify account appears in list
6. Try posting with the connected account
7. Test disconnecting the account

### Automated Testing

```bash
# Run integration tests
npm run test:integration

# Test OAuth endpoints specifically
npm test -- oauth
```

## Extending to Other Platforms

The OAuth system is designed to be extensible. To add another platform:

1. **Update OAuth2Service**
   ```typescript
   public getInstagramAuthURL(userId: string, returnUrl?: string): string {
     // Similar to Twitter implementation
   }
   ```

2. **Add Controller Methods**
   ```typescript
   async authorizeInstagram(req: AuthRequest, res: Response) {
     // Platform-specific implementation
   }
   ```

3. **Add Routes**
   ```typescript
   router.get('/instagram/authorize', ...);
   router.get('/instagram/callback', ...);
   ```

4. **Update Frontend**
   - Platform will automatically appear in accounts page
   - "Add" button will call `/oauth/instagram/auth-url`

## Support

For issues or questions:
- Check server logs: `docker-compose logs -f api`
- Review Twitter API documentation
- Open a GitHub issue

## Resources

- [Twitter OAuth 2.0 Documentation](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
- [OAuth 2.0 with PKCE](https://oauth.net/2/pkce/)
- [Twitter API v2](https://developer.twitter.com/en/docs/twitter-api)
