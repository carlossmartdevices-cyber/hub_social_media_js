# OAuth 2.0 Quick Start Guide

## Adding a New Platform in 5 Minutes

### The 4-Step Process

```
1. Config  → Add env variables
2. Metadata → Register in oauth2Config.ts
3. Service → Implement auth flow in OAuth2Service
4. Route   → Add case to OAuth2Controller
```

---

## Step-by-Step Example: Facebook

### Step 1: Environment Variables
```bash
# .env
FACEBOOK_CLIENT_ID=123456789
FACEBOOK_CLIENT_SECRET=your_secret
FACEBOOK_REDIRECT_URI=http://localhost:8080/api/oauth/facebook/callback
```

### Step 2: Update `src/config/index.ts`
```typescript
facebook: {
  clientId: process.env.FACEBOOK_CLIENT_ID || '',
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
  redirectUri: process.env.FACEBOOK_REDIRECT_URI || '...',
},
```

### Step 3: Update `src/utils/oauth2Config.ts`
```typescript
[Platform.FACEBOOK]: {
  id: Platform.FACEBOOK,
  name: 'Facebook',
  oauth2Scopes: ['pages_manage_posts', 'pages_read_engagement'],
  authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
},
```

### Step 4: Add to `src/services/OAuth2Service.ts`

**Method 1: Get Authorization URL**
```typescript
public getFacebookAuthURL(userId: string, returnUrl?: string): string {
  const credentials = getOAuth2Credentials(Platform.FACEBOOK);
  if (!credentials) throw new Error('Facebook OAuth not configured');

  const state = this.generateState();
  this.stateStore.set(state, { userId, platform: 'facebook', codeVerifier: '', returnUrl });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: credentials.clientId,
    redirect_uri: credentials.redirectUri,
    scope: 'pages_manage_posts,pages_read_engagement',
    state,
  });

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
}
```

**Method 2: Handle Callback**
```typescript
public async handleFacebookCallback(code: string, state: string) {
  const oauthState = this.stateStore.get(state);
  if (!oauthState) throw new Error('Invalid state');
  this.stateStore.delete(state);

  const credentials = getOAuth2Credentials(Platform.FACEBOOK);
  if (!credentials) throw new Error('Facebook OAuth not configured');

  // Exchange code for token
  const tokenResponse = await axios.post(
    'https://graph.facebook.com/v18.0/oauth/access_token',
    {
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      redirect_uri: credentials.redirectUri,
      code,
    }
  );

  // Get user info
  const userResponse = await axios.get(
    'https://graph.facebook.com/me?fields=id,name,email',
    { headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` } }
  );

  // Store in platform_credentials table
  const encryptedCreds = EncryptionService.encrypt(JSON.stringify({
    accessToken: tokenResponse.data.access_token,
    userId: userResponse.data.id,
    username: userResponse.data.name,
  }));

  await database.query(
    `INSERT INTO platform_credentials (user_id, platform, account_name, account_identifier, credentials, is_active)
     VALUES ($1, 'facebook', $2, $3, $4, true)`,
    [oauthState.userId, userResponse.data.name, `fb_${userResponse.data.id}`, encryptedCreds]
  );

  return { userId: oauthState.userId, returnUrl: oauthState.returnUrl, accountInfo: userResponse.data };
}
```

### Step 5: Add to `src/api/controllers/OAuth2Controller.ts`
```typescript
// In getAuthUrl() method switch statement
case Platform.FACEBOOK:
  const fbAuthUrl = oauth2Service.getFacebookAuthURL(userId, returnUrl);
  res.json({ success: true, authUrl: fbAuthUrl });
  break;
```

### Step 6: Test
```bash
# Restart server
npm start

# Check logs for Facebook in OAuth status
# Navigate to /accounts and click "Add" on Facebook card
```

---

## Supported Platforms Status

| Platform | OAuth 2.0 | PKCE | Refresh Token | Status |
|----------|-----------|------|---------------|--------|
| Twitter/X | ✅ | ✅ | ✅ | **Implemented** |
| Facebook | ⚠️ | ❌ | ❌ | Template Ready |
| Instagram | ⚠️ | ❌ | ❌ | Template Ready |
| LinkedIn | ⚠️ | ❌ | ✅ | Template Ready |
| YouTube | ⚠️ | ❌ | ✅ | Template Ready |
| TikTok | ⚠️ | ❌ | ❌ | Template Ready |

✅ = Fully Implemented
⚠️ = Template & Code Examples Available
❌ = Not Needed for Platform

---

## Key Locations

| File | Purpose |
|------|---------|
| `src/config/index.ts` | Platform credentials from env vars |
| `src/utils/oauth2Config.ts` | Platform metadata & detection |
| `src/services/OAuth2Service.ts` | OAuth 2.0 implementation |
| `src/api/controllers/OAuth2Controller.ts` | API endpoints |
| `src/api/routes/oauth.ts` | Route definitions |
| `docs/ADDING_OAUTH2_PLATFORMS.md` | Complete guide |
| `docs/OAUTH2_IMPLEMENTATION_EXAMPLES.md` | Code examples |

---

## Common Tasks

### Check Which Platforms Are Configured
```bash
curl http://localhost:8080/api/oauth/config | jq
```

**Expected Response:**
```json
{
  "success": true,
  "platforms": [
    {
      "id": "twitter",
      "name": "X (Twitter)",
      "oauth2Available": true,
      "oauth2Scopes": ["tweet.read", "tweet.write", ...],
      "authorizationEndpoint": "https://twitter.com/i/oauth2/authorize"
    }
  ]
}
```

### Get Authorization URL
```bash
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://localhost:8080/api/oauth/facebook/auth-url | jq
```

### View Server OAuth Status
```bash
npm start | grep -A 20 "OAuth 2.0 Configuration Status"
```

### Clear OAuth Cache (Frontend)
```javascript
localStorage.removeItem('oauth2_config');
location.reload();
```

---

## Troubleshooting

### Platform Not Showing in Config
- [ ] Env vars set? Check `.env` file
- [ ] All three variables set (CLIENT_ID, SECRET, REDIRECT_URI)?
- [ ] No empty strings? Check `echo $FACEBOOK_CLIENT_ID`
- [ ] Server restarted after env change?

### "OAuth not configured" Error
- [ ] Client ID/Secret valid?
- [ ] Redirect URI matches exactly?
- [ ] Check server logs for detailed error

### Authorization Fails
- [ ] Redirect URI registered in platform's app settings?
- [ ] Client ID/Secret correct?
- [ ] Correct scopes for your app?

### Frontend Doesn't Show Button
- [ ] Check `/api/oauth/config` returns your platform
- [ ] Clear browser cache: `localStorage.removeItem('oauth2_config')`
- [ ] Check browser console for JS errors

---

## What Happens After OAuth

When a user clicks "Add" on a platform:

```
1. Frontend sends GET /api/oauth/{platform}/auth-url
2. Backend returns authorization URL from platform
3. User redirected to platform login
4. User approves permissions
5. Platform redirects back to /api/oauth/{platform}/callback
6. Backend exchanges code for access token
7. Backend stores encrypted credentials in platform_credentials table
8. User sees account in /accounts page
```

---

## User Flow: Login via X (Twitter)

When a user logs in via X:

```
1. User clicks "Login with X" on /login
2. Redirects to Twitter authorization
3. User approves, Twitter redirects back
4. Backend creates/updates user in users table
5. Backend AUTOMATICALLY adds X account to platform_credentials
6. User can immediately use X account for publishing
```

✅ **X account is auto-added on login via X**

---

## Database: platform_credentials Table

```sql
CREATE TABLE platform_credentials (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  platform VARCHAR(50) NOT NULL,           -- 'twitter', 'facebook', etc
  account_name VARCHAR(255) NOT NULL,      -- Display name
  account_identifier VARCHAR(255) NOT NULL, -- @username or ID
  credentials TEXT NOT NULL,               -- Encrypted JSON with access_token
  is_active BOOLEAN DEFAULT true,
  last_validated TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

Encrypted `credentials` JSON example:
```json
{
  "accessToken": "token_here",
  "refreshToken": "refresh_token_if_supported",
  "expiresAt": "2025-01-20T12:00:00Z",
  "userId": "123456",
  "username": "@john_doe"
}
```

---

## Environment Variables Template

Add these to your `.env` file for each platform you want to support:

```bash
# Twitter (X) - ALREADY CONFIGURED
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
TWITTER_REDIRECT_URI=http://localhost:8080/api/oauth/twitter/callback

# Facebook - READY TO ADD
FACEBOOK_CLIENT_ID=your_app_id
FACEBOOK_CLIENT_SECRET=your_app_secret
FACEBOOK_REDIRECT_URI=http://localhost:8080/api/oauth/facebook/callback

# Instagram - READY TO ADD
INSTAGRAM_CLIENT_ID=your_app_id
INSTAGRAM_CLIENT_SECRET=your_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:8080/api/oauth/instagram/callback

# LinkedIn - READY TO ADD
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:8080/api/oauth/linkedin/callback

# YouTube - READY TO ADD
YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:8080/api/oauth/youtube/callback

# TikTok - READY TO ADD
TIKTOK_CLIENT_ID=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
TIKTOK_REDIRECT_URI=http://localhost:8080/api/oauth/tiktok/callback
```

---

## Next Steps

1. ✅ Read [ADDING_OAUTH2_PLATFORMS.md](./ADDING_OAUTH2_PLATFORMS.md) for complete guide
2. ✅ Review [OAUTH2_IMPLEMENTATION_EXAMPLES.md](./OAUTH2_IMPLEMENTATION_EXAMPLES.md) for code examples
3. ✅ Choose a platform to add (Facebook recommended as first)
4. ✅ Follow 5-step process above
5. ✅ Test in UI at `/accounts`

---

## Getting Help

- **Platform Documentation:** Check official OAuth docs (links in examples)
- **Server Logs:** Always check `npm start` output for detailed errors
- **Browser Console:** Check for JavaScript errors
- **API Response:** Use `curl` to test endpoints directly

```bash
# Test OAuth config endpoint
curl http://localhost:8080/api/oauth/config | jq

# Test auth URL generation (requires valid JWT)
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:8080/api/oauth/facebook/auth-url | jq
```
