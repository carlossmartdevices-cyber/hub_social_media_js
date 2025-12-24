# OAuth 2.0 Implementation Examples

Complete working examples for adding popular social media platforms via OAuth 2.0.

---

## Table of Contents
1. [Facebook](#facebook-oauth-20)
2. [LinkedIn](#linkedin-oauth-20)
3. [Instagram](#instagram-oauth-20)
4. [YouTube](#youtube-oauth-20)
5. [TikTok](#tiktok-oauth-20)

---

## Facebook OAuth 2.0

### 1. Setup & Credentials

**Create App:** https://developers.facebook.com/apps

**Required Credentials:**
- App ID (acts as `CLIENT_ID`)
- App Secret (acts as `CLIENT_SECRET`)
- Redirect URI (must be registered in app settings)

### 2. Environment Variables

```env
FACEBOOK_CLIENT_ID=1234567890
FACEBOOK_CLIENT_SECRET=your_app_secret_here
FACEBOOK_REDIRECT_URI=http://localhost:8080/api/oauth/facebook/callback
```

### 3. Update config/index.ts

```typescript
facebook: {
  clientId: process.env.FACEBOOK_CLIENT_ID || '',
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
  redirectUri: process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:8080/api/oauth/facebook/callback',
},
```

### 4. Update oauth2Config.ts

```typescript
[Platform.FACEBOOK]: {
  id: Platform.FACEBOOK,
  name: 'Facebook',
  oauth2Scopes: [
    'pages_manage_posts',
    'pages_read_engagement',
    'pages_read_user_content'
  ],
  authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
},
```

### 5. Implement in OAuth2Service

```typescript
/**
 * Get Facebook OAuth 2.0 authorization URL
 */
public getFacebookAuthURL(userId: string, returnUrl?: string): string {
  const credentials = getOAuth2Credentials(Platform.FACEBOOK);
  if (!credentials) {
    throw new Error('Facebook OAuth 2.0 is not configured');
  }

  const state = this.generateState();

  this.stateStore.set(state, {
    userId,
    platform: 'facebook',
    codeVerifier: '',
    returnUrl,
  });

  setTimeout(() => {
    this.stateStore.delete(state);
  }, 10 * 60 * 1000);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: credentials.clientId,
    redirect_uri: credentials.redirectUri,
    scope: 'pages_manage_posts,pages_read_engagement',
    state,
  });

  logger.info('Generated Facebook OAuth URL');
  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
}

/**
 * Handle Facebook OAuth 2.0 callback
 */
public async handleFacebookCallback(
  code: string,
  state: string
): Promise<{ userId: string; returnUrl?: string; accountInfo: any }> {
  const oauthState = this.stateStore.get(state);
  if (!oauthState) {
    throw new Error('Invalid or expired state parameter');
  }

  this.stateStore.delete(state);

  try {
    const userUuid = oauthState.userId;

    const credentials = getOAuth2Credentials(Platform.FACEBOOK);
    if (!credentials) {
      throw new Error('Facebook OAuth 2.0 credentials are not configured');
    }

    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://graph.facebook.com/v18.0/oauth/access_token',
      {
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        redirect_uri: credentials.redirectUri,
        code,
      }
    );

    const { access_token: accessToken } = tokenResponse.data;

    // Get user info
    const userResponse = await axios.get(
      'https://graph.facebook.com/me?fields=id,name,email,picture.width(256).height(256)',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const facebookUser = userResponse.data;
    const accountIdentifier = `fb_${facebookUser.id}`;
    const accountName = facebookUser.name;

    // Store credentials
    const accountCredentials = {
      accessToken,
      userId: facebookUser.id,
      username: facebookUser.name,
      email: facebookUser.email,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const encryptedCredentials = EncryptionService.encrypt(JSON.stringify(accountCredentials));

    // Check if account exists
    const existingAccount = await database.query(
      `SELECT id FROM platform_credentials
       WHERE user_id = $1 AND platform = 'facebook' AND account_identifier = $2`,
      [userUuid, accountIdentifier]
    );

    if (existingAccount.rows.length > 0) {
      await database.query(
        `UPDATE platform_credentials
         SET credentials = $1, is_active = true, last_validated = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [encryptedCredentials, existingAccount.rows[0].id]
      );
    } else {
      await database.query(
        `INSERT INTO platform_credentials (user_id, platform, account_name, account_identifier, credentials, is_active)
         VALUES ($1, 'facebook', $2, $3, $4, true)`,
        [userUuid, accountName, accountIdentifier, encryptedCredentials]
      );
    }

    return {
      userId: userUuid,
      returnUrl: oauthState.returnUrl,
      accountInfo: {
        name: accountName,
        id: facebookUser.id,
        email: facebookUser.email,
      },
    };
  } catch (error: any) {
    logger.error('Facebook OAuth callback error:', error);
    throw new Error(`Failed to connect Facebook account: ${error.message}`);
  }
}
```

### 6. Add to OAuth2Controller

```typescript
case Platform.FACEBOOK:
  const fbAuthUrl = oauth2Service.getFacebookAuthURL(userId, returnUrl);
  res.json({
    success: true,
    authUrl: fbAuthUrl,
  });
  break;
```

---

## LinkedIn OAuth 2.0

### 1. Setup & Credentials

**Create App:** https://www.linkedin.com/developers/apps

**Required:**
- Client ID
- Client Secret
- Redirect URLs (must be registered in app settings)

### 2. Environment Variables

```env
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:8080/api/oauth/linkedin/callback
```

### 3. Update config/index.ts

```typescript
linkedin: {
  clientId: process.env.LINKEDIN_CLIENT_ID || '',
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
  redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:8080/api/oauth/linkedin/callback',
},
```

### 4. Update oauth2Config.ts

```typescript
[Platform.LINKEDIN]: {
  id: Platform.LINKEDIN,
  name: 'LinkedIn',
  oauth2Scopes: ['w_member_social', 'r_liteprofile'],
  authorizationEndpoint: 'https://www.linkedin.com/oauth/v2/authorization',
},
```

### 5. Implement in OAuth2Service

```typescript
/**
 * Get LinkedIn OAuth 2.0 authorization URL
 */
public getLinkedInAuthURL(userId: string, returnUrl?: string): string {
  const credentials = getOAuth2Credentials(Platform.LINKEDIN);
  if (!credentials) {
    throw new Error('LinkedIn OAuth 2.0 is not configured');
  }

  const state = this.generateState();

  this.stateStore.set(state, {
    userId,
    platform: 'linkedin',
    codeVerifier: '',
    returnUrl,
  });

  setTimeout(() => {
    this.stateStore.delete(state);
  }, 10 * 60 * 1000);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: credentials.clientId,
    redirect_uri: credentials.redirectUri,
    scope: 'w_member_social r_liteprofile',
    state,
  });

  logger.info('Generated LinkedIn OAuth URL');
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

/**
 * Handle LinkedIn OAuth 2.0 callback
 */
public async handleLinkedInCallback(
  code: string,
  state: string
): Promise<{ userId: string; returnUrl?: string; accountInfo: any }> {
  const oauthState = this.stateStore.get(state);
  if (!oauthState) {
    throw new Error('Invalid or expired state parameter');
  }

  this.stateStore.delete(state);

  try {
    const userUuid = oauthState.userId;

    const credentials = getOAuth2Credentials(Platform.LINKEDIN);
    if (!credentials) {
      throw new Error('LinkedIn OAuth 2.0 credentials are not configured');
    }

    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      {
        grant_type: 'authorization_code',
        code,
        redirect_uri: credentials.redirectUri,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token: accessToken, expires_in: expiresIn } = tokenResponse.data;

    // Get user info
    const userResponse = await axios.get('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const linkedinUser = userResponse.data;
    const name = `${linkedinUser.localizedFirstName} ${linkedinUser.localizedLastName}`;
    const accountIdentifier = `in_${linkedinUser.id}`;

    // Store credentials
    const accountCredentials = {
      accessToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      userId: linkedinUser.id,
      username: name,
    };

    const encryptedCredentials = EncryptionService.encrypt(JSON.stringify(accountCredentials));

    // Check if account exists
    const existingAccount = await database.query(
      `SELECT id FROM platform_credentials
       WHERE user_id = $1 AND platform = 'linkedin' AND account_identifier = $2`,
      [userUuid, accountIdentifier]
    );

    if (existingAccount.rows.length > 0) {
      await database.query(
        `UPDATE platform_credentials
         SET credentials = $1, is_active = true, last_validated = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [encryptedCredentials, existingAccount.rows[0].id]
      );
    } else {
      await database.query(
        `INSERT INTO platform_credentials (user_id, platform, account_name, account_identifier, credentials, is_active)
         VALUES ($1, 'linkedin', $2, $3, $4, true)`,
        [userUuid, name, accountIdentifier, encryptedCredentials]
      );
    }

    return {
      userId: userUuid,
      returnUrl: oauthState.returnUrl,
      accountInfo: {
        name,
        id: linkedinUser.id,
      },
    };
  } catch (error: any) {
    logger.error('LinkedIn OAuth callback error:', error);
    throw new Error(`Failed to connect LinkedIn account: ${error.message}`);
  }
}
```

### 6. Add to OAuth2Controller

```typescript
case Platform.LINKEDIN:
  const liAuthUrl = oauth2Service.getLinkedInAuthURL(userId, returnUrl);
  res.json({
    success: true,
    authUrl: liAuthUrl,
  });
  break;
```

---

## Instagram OAuth 2.0

**Note:** Instagram uses Facebook Graph API. You must have a Facebook App with Instagram connected.

### Configuration

```env
INSTAGRAM_CLIENT_ID=your_facebook_app_id
INSTAGRAM_CLIENT_SECRET=your_facebook_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:8080/api/oauth/instagram/callback
```

### Key Differences from Facebook

1. **Requires Business Account:** User must have Instagram Business Account
2. **API Endpoint:** Uses Facebook Graph API v18.0
3. **Scopes:** `instagram_basic`, `instagram_content_publish`

**Implementation is similar to Facebook, but use these scopes and endpoints:**

```typescript
scope: 'instagram_basic,instagram_content_publish'

// Get IG user info
https://graph.instagram.com/me?fields=id,username,name,picture
```

---

## YouTube OAuth 2.0

### 1. Setup & Credentials

**Create Project:** https://console.cloud.google.com/

**Enable APIs:** YouTube Data API v3

**Required:**
- OAuth 2.0 Client ID (Web application type)
- Client Secret
- Redirect URIs

### 2. Environment Variables

```env
YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:8080/api/oauth/youtube/callback
```

### 3. Update config/index.ts

```typescript
youtube: {
  clientId: process.env.YOUTUBE_CLIENT_ID || '',
  clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
  redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:8080/api/oauth/youtube/callback',
},
```

### 4. Update oauth2Config.ts

```typescript
[Platform.YOUTUBE]: {
  id: Platform.YOUTUBE,
  name: 'YouTube',
  oauth2Scopes: ['https://www.googleapis.com/auth/youtube.upload'],
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
},
```

### 5. Key Implementation Details

```typescript
public getYouTubeAuthURL(userId: string, returnUrl?: string): string {
  const credentials = getOAuth2Credentials(Platform.YOUTUBE);
  if (!credentials) {
    throw new Error('YouTube OAuth 2.0 is not configured');
  }

  const state = this.generateState();
  this.stateStore.set(state, {
    userId,
    platform: 'youtube',
    codeVerifier: '',
    returnUrl,
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: credentials.clientId,
    redirect_uri: credentials.redirectUri,
    scope: 'https://www.googleapis.com/auth/youtube.upload',
    state,
    access_type: 'offline', // Important: get refresh token
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Get YouTube channel info
const channelResponse = await axios.get(
  'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
  {
    headers: { Authorization: `Bearer ${accessToken}` },
  }
);

const youtubeChannel = channelResponse.data.items[0];
```

---

## TikTok OAuth 2.0

### 1. Setup & Credentials

**Create App:** https://developers.tiktok.com/

**Required:**
- Client Key (acts as CLIENT_ID)
- Client Secret
- Redirect URIs

### 2. Environment Variables

```env
TIKTOK_CLIENT_ID=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
TIKTOK_REDIRECT_URI=http://localhost:8080/api/oauth/tiktok/callback
```

### 3. Update config/index.ts

```typescript
tiktok: {
  clientId: process.env.TIKTOK_CLIENT_ID || '',
  clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
  redirectUri: process.env.TIKTOK_REDIRECT_URI || 'http://localhost:8080/api/oauth/tiktok/callback',
},
```

### 4. Update oauth2Config.ts

```typescript
[Platform.TIKTOK]: {
  id: Platform.TIKTOK,
  name: 'TikTok',
  oauth2Scopes: ['video.upload', 'user.info.basic'],
  authorizationEndpoint: 'https://www.tiktok.com/auth/authorize/',
},
```

### 5. Key Implementation Details

```typescript
public getTikTokAuthURL(userId: string, returnUrl?: string): string {
  const credentials = getOAuth2Credentials(Platform.TIKTOK);
  if (!credentials) {
    throw new Error('TikTok OAuth 2.0 is not configured');
  }

  const state = this.generateState();
  this.stateStore.set(state, {
    userId,
    platform: 'tiktok',
    codeVerifier: '',
    returnUrl,
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_key: credentials.clientId, // TikTok uses client_key
    redirect_uri: credentials.redirectUri,
    scope: 'video.upload,user.info.basic',
    state,
  });

  return `https://www.tiktok.com/auth/authorize/?${params.toString()}`;
}

// Exchange code for token
const tokenResponse = await axios.post(
  'https://open.tiktok.com/v1/oauth/token/',
  {
    client_key: credentials.clientId,
    client_secret: credentials.clientSecret,
    code,
    grant_type: 'authorization_code',
  }
);
```

---

## Testing Your Implementation

### 1. Verify Configuration
```bash
# Check logs
npm start | grep "OAuth 2.0"
```

### 2. Test API Endpoint
```bash
curl http://localhost:8080/api/oauth/config | jq
```

### 3. Get Authorization URL
```bash
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:8080/api/oauth/facebook/auth-url | jq
```

### 4. Complete Flow
1. Click "Add" on accounts page
2. Approve platform permissions
3. Verify account appears in account list
4. Check server logs for success messages

---

## Common Patterns

### Platform Configuration Checklist

For each new platform, ensure:

- [ ] Environment variables set in `.env`
- [ ] Config added to `src/config/index.ts`
- [ ] Metadata added to `oauth2Config.ts`
- [ ] `getXXXAuthURL()` implemented in OAuth2Service
- [ ] `handleXXXCallback()` implemented in OAuth2Service
- [ ] Case added to `getAuthUrl()` switch in OAuth2Controller
- [ ] Callback route added to `oauth.ts` (if needed)
- [ ] Tested end-to-end with real account

### Error Handling

All implementations should handle:
- Missing/invalid credentials
- Expired state tokens
- Network errors
- Invalid authorization codes
- Token exchange failures

### Security Best Practices

✅ Always validate state parameter
✅ Always encrypt stored credentials
✅ Always use HTTPS for redirects
✅ Always validate scopes before requesting
✅ Always store refresh tokens securely
✅ Always set appropriate token expiration

---

## Next Steps

After implementing a new platform:

1. **Publishing:** Implement platform adapter in `src/platforms/`
2. **Metrics:** Add metrics collection in `src/services/`
3. **Testing:** Create integration tests
4. **Documentation:** Update user-facing docs

For more details, see [ADDING_OAUTH2_PLATFORMS.md](./ADDING_OAUTH2_PLATFORMS.md)
