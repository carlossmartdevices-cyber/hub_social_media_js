# OAuth2 Social Media Integration Guide

This guide explains how to set up OAuth2 authentication for connecting social media accounts, primarily X (Twitter).

## Overview

The application supports OAuth2 authentication for connecting multiple social media accounts. Currently, **X/Twitter OAuth 2.0** is fully implemented with PKCE (Proof Key for Code Exchange) for enhanced security.

## Features

- ✅ **OAuth 2.0 with PKCE** for X/Twitter
- ✅ **Multiple account support** - Connect multiple X accounts per user
- ✅ **Secure token storage** - Encrypted credentials in PostgreSQL
- ✅ **Automatic token refresh** - Handles token expiration
- ✅ **User-friendly UI** - Modern account management interface

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │─────▶│   Backend    │─────▶│  X OAuth    │
│   (Next.js) │      │  (Node.js)   │      │  Provider   │
└─────────────┘      └──────────────┘      └─────────────┘
       │                     │                      │
       │                     ▼                      │
       │            ┌─────────────────┐             │
       │            │   PostgreSQL    │             │
       │            │  (Encrypted     │             │
       │            │   Credentials)  │             │
       │            └─────────────────┘             │
       │                                            │
       └────────────────────────────────────────────┘
                   (OAuth Callback)
```

## Setup Instructions

### 1. Create X/Twitter Developer App

1. Go to [X Developer Portal](https://developer.x.com/en/portal/dashboard)
2. Create a new **OAuth 2.0** app (not OAuth 1.0a)
3. Configure the following settings:

   **App Settings:**
   - App name: Your app name
   - App description: Brief description
   - Website: Your production URL (e.g., `https://pnptv.app`)

   **OAuth 2.0 Settings:**
   - OAuth 2.0 Client ID: (will be generated)
   - OAuth 2.0 Client Secret: (will be generated)
   - Callback URL / Redirect URI: `https://your-domain.com/api/oauth/twitter/callback`
     - For local dev: `http://localhost:33010/api/oauth/twitter/callback`
     - For production: `https://pnptv.app/hub/api/oauth/twitter/callback`

   **Scopes Required:**
   - `tweet.read` - Read tweets
   - `tweet.write` - Post tweets
   - `users.read` - Read user profile
   - `offline.access` - Get refresh tokens

4. Save your **Client ID** and **Client Secret**

### 2. Configure Environment Variables

Add the following to your `.env` file:

```bash
# OAuth 2.0 (User Authentication - for connecting multiple accounts)
TWITTER_CLIENT_ID=your_client_id_here
TWITTER_CLIENT_SECRET=your_client_secret_here
TWITTER_REDIRECT_URI=https://your-domain.com/api/oauth/twitter/callback
```

**Important Notes:**
- The `TWITTER_REDIRECT_URI` must **exactly match** the callback URL configured in the X Developer Portal
- For production, use your production domain
- For local development, use `http://localhost:33010/api/oauth/twitter/callback`

### 3. Database Setup

The database schema is already configured with the necessary tables:

- `platform_credentials` - Stores encrypted OAuth tokens
- Supports multiple accounts per platform
- Automatic encryption/decryption of sensitive credentials

If you haven't run migrations yet:

```bash
npm run migrate
```

### 4. Start the Application

```bash
# Backend
npm run dev

# Frontend (in another terminal)
cd client
npm run dev
```

### 5. Test OAuth Flow

1. Navigate to `/accounts` in your web app
2. Click **"Add"** next to X (Twitter)
3. You'll be redirected to X's authorization page
4. Approve the app
5. You'll be redirected back with your account connected

## API Endpoints

### Get OAuth Authorization URL

```http
GET /api/oauth/:platform/auth-url
Authorization: Bearer {jwt_token}
```

**Example:**
```bash
curl -X GET "http://localhost:33010/api/oauth/twitter/auth-url" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "authUrl": "https://twitter.com/i/oauth2/authorize?..."
}
```

### OAuth Callback (Handled by backend)

```http
GET /api/oauth/twitter/callback?code={code}&state={state}
```

This endpoint is called by X after user authorization. It:
1. Exchanges the authorization code for access/refresh tokens
2. Retrieves user profile information
3. Stores encrypted credentials in the database
4. Redirects to frontend with success/error message

### List Connected Accounts

```http
GET /api/platform-accounts
Authorization: Bearer {jwt_token}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "platform": "twitter",
    "accountName": "John Doe",
    "accountId": "@johndoe",
    "isConnected": true,
    "profileUrl": "https://twitter.com/johndoe",
    "lastValidated": "2025-01-15T10:30:00Z",
    "createdAt": "2025-01-10T08:00:00Z"
  }
]
```

### Disconnect Account

```http
DELETE /api/platform-accounts/:accountId
Authorization: Bearer {jwt_token}
```

### Refresh Token

```http
POST /api/oauth/twitter/refresh/:accountId
Authorization: Bearer {jwt_token}
```

## Security Features

### 1. PKCE (Proof Key for Code Exchange)
- Generates random code verifier and challenge
- Prevents authorization code interception attacks
- Required for public clients (SPAs, mobile apps)

### 2. State Parameter
- CSRF protection
- Validates OAuth callback authenticity
- Expires after 10 minutes

### 3. Encrypted Storage
- All OAuth tokens encrypted with AES-256
- Encryption key from environment variable
- Decrypted only when needed

### 4. Secure Redirect URIs
- Whitelist-based redirect validation
- No open redirects
- HTTPS required in production

## Frontend Integration

### Connecting an Account

```typescript
import api from '@/lib/api';

const connectTwitter = async () => {
  try {
    // Get authorization URL
    const response = await api.get('/oauth/twitter/auth-url');

    // Redirect to X
    window.location.href = response.data.authUrl;
  } catch (error) {
    console.error('Failed to connect:', error);
  }
};
```

### Listing Accounts

```typescript
import api from '@/lib/api';

const fetchAccounts = async () => {
  try {
    const response = await api.get('/platform-accounts');
    console.log(response.data); // Array of connected accounts
  } catch (error) {
    console.error('Failed to fetch accounts:', error);
  }
};
```

### Disconnecting an Account

```typescript
import api from '@/lib/api';

const disconnectAccount = async (accountId: string) => {
  try {
    await api.delete(`/platform-accounts/${accountId}`);
    console.log('Account disconnected');
  } catch (error) {
    console.error('Failed to disconnect:', error);
  }
};
```

## Troubleshooting

### "Invalid or expired state parameter"

**Problem:** The OAuth state has expired or is invalid.

**Solution:**
- The state expires after 10 minutes. Try the authorization flow again.
- Clear your browser cookies and cache.
- Ensure your system clock is synchronized.

### "Failed to connect Twitter account"

**Problem:** Token exchange failed.

**Solutions:**
- Verify `TWITTER_CLIENT_ID` and `TWITTER_CLIENT_SECRET` are correct
- Ensure `TWITTER_REDIRECT_URI` matches the callback URL in X Developer Portal
- Check that your app has the required scopes enabled
- Review backend logs for detailed error messages

### "OAuth not implemented for platform"

**Problem:** Trying to connect a platform that doesn't support OAuth yet.

**Solution:**
Currently, only X/Twitter supports OAuth2. Other platforms will be added in future updates.

### Callback URL Mismatch

**Problem:** "Invalid redirect_uri" error from X.

**Solution:**
1. Go to X Developer Portal
2. Navigate to your app's settings
3. Update the Callback URL to match your `TWITTER_REDIRECT_URI` exactly
4. Include the protocol (http/https)
5. Save changes and try again

## Adding More Platforms

To add OAuth support for other platforms (Facebook, LinkedIn, etc.):

1. **Create OAuth Service Method** in `src/services/OAuth2Service.ts`:
   ```typescript
   public getLinkedInAuthURL(userId: string, returnUrl?: string): string {
     // Implementation
   }
   ```

2. **Add Controller Method** in `src/api/controllers/OAuth2Controller.ts`:
   ```typescript
   case 'linkedin':
     const authUrl = oauth2Service.getLinkedInAuthURL(userId, returnUrl);
     res.json({ success: true, authUrl });
     break;
   ```

3. **Add Callback Handler**:
   ```typescript
   async linkedInCallback(req: Request, res: Response): Promise<void> {
     // Handle callback
   }
   ```

4. **Update Routes** in `src/api/routes/oauth.ts`

5. **Add Environment Variables** to `.env.example` and config

## Best Practices

1. **Always use HTTPS in production** - OAuth requires secure connections
2. **Rotate secrets regularly** - Update client secrets periodically
3. **Monitor token expiration** - Implement automatic refresh before expiry
4. **Log OAuth events** - Track authorization attempts and failures
5. **Handle errors gracefully** - Provide clear user feedback
6. **Test callback URLs** - Verify redirects work in all environments

## Production Checklist

- [ ] X Developer app created and approved
- [ ] OAuth 2.0 credentials configured
- [ ] Callback URL set to production domain
- [ ] Environment variables set in production
- [ ] HTTPS enabled and configured
- [ ] Encryption key is strong (32+ characters)
- [ ] Database migrations applied
- [ ] Error monitoring configured (Sentry)
- [ ] Rate limiting enabled
- [ ] CORS configured correctly

## Resources

- [X OAuth 2.0 Documentation](https://developer.x.com/en/docs/authentication/oauth-2-0)
- [OAuth 2.0 RFC](https://datatracker.ietf.org/doc/html/rfc6749)
- [PKCE RFC](https://datatracker.ietf.org/doc/html/rfc7636)

## Support

For issues or questions:
- Check backend logs: `tail -f logs/app.log`
- Review X Developer Portal console
- Open an issue on GitHub
- Contact the development team

---

**Last Updated:** 2025-12-17
**Version:** 1.0.0
