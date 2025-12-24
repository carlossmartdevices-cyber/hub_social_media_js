# Adding New OAuth 2.0 Social Media Platforms

This guide explains how to add support for new social media platforms using OAuth 2.0. The process is modular and requires updates to 4 main areas.

## Quick Overview

Adding a new OAuth 2.0 platform requires:
1. **Configuration** - Add environment variables
2. **Platform Metadata** - Register platform in oauth2Config.ts
3. **OAuth Service** - Implement OAuth flow
4. **Controller** - Add platform routing

---

## Step-by-Step Guide

### Step 1: Configuration Setup

#### 1.1 Add Environment Variables

Add these variables to your `.env` file:

```env
# Facebook OAuth 2.0 (Example)
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
FACEBOOK_REDIRECT_URI=http://localhost:8080/api/oauth/facebook/callback
```

#### 1.2 Update config/index.ts

Add platform configuration in `src/config/index.ts`:

```typescript
platforms: {
  // ... existing platforms ...
  facebook: {
    clientId: process.env.FACEBOOK_CLIENT_ID || '',
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    redirectUri: process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:8080/api/oauth/facebook/callback',
  },
},
```

**Note:** The Platform enum in `src/core/content/types.ts` should already include your platform.

---

### Step 2: Register Platform Metadata

#### 2.1 Update oauth2Config.ts

Add metadata for your platform in `src/utils/oauth2Config.ts`:

```typescript
const OAUTH2_PLATFORM_METADATA: Record<string, Omit<OAuth2PlatformConfig, 'oauth2Available'>> = {
  // ... existing platforms ...

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
};
```

**Scope Reference:**
- For each platform, include scopes needed for your use case
- Common scopes: user profile, content publishing, analytics
- Check platform documentation for exact scope names

---

### Step 3: Implement OAuth Flow

#### 3.1 Create OAuth Methods in OAuth2Service

Add to `src/services/OAuth2Service.ts`:

```typescript
/**
 * Get Facebook OAuth 2.0 authorization URL
 */
public getFacebookAuthURL(userId: string, returnUrl?: string): string {
  // Validate OAuth 2.0 configuration
  const credentials = getOAuth2Credentials(Platform.FACEBOOK);
  if (!credentials) {
    throw new Error(
      'Facebook OAuth 2.0 is not configured. Please set FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET, and FACEBOOK_REDIRECT_URI.'
    );
  }

  const state = this.generateState();

  // Store state temporarily
  this.stateStore.set(state, {
    userId,
    platform: 'facebook',
    codeVerifier: '', // Facebook doesn't use PKCE, but we store it for consistency
    returnUrl,
  });

  // Clean up old states after 10 minutes
  setTimeout(() => {
    this.stateStore.delete(state);
  }, 10 * 60 * 1000);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: credentials.clientId,
    redirect_uri: credentials.redirectUri,
    scope: 'pages_manage_posts,pages_read_engagement,pages_read_user_content',
    state,
  });

  logger.info('Generated Facebook OAuth URL:', {
    clientId: credentials.clientId.substring(0, 10) + '...',
    redirectUri: credentials.redirectUri,
    userId,
  });

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
}

/**
 * Handle Facebook OAuth 2.0 callback
 */
public async handleFacebookCallback(
  code: string,
  state: string
): Promise<{ userId: string; returnUrl?: string; accountInfo: any }> {
  // Verify state
  const oauthState = this.stateStore.get(state);
  if (!oauthState) {
    throw new Error('Invalid or expired state parameter');
  }

  // Clean up state
  this.stateStore.delete(state);

  try {
    const userUuid = oauthState.userId;

    // Get validated credentials
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

    // Get user info from Facebook
    const userResponse = await axios.get(
      'https://graph.facebook.com/me?fields=id,name,email,picture.width(256).height(256)',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
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
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
    };

    const encryptedCredentials = EncryptionService.encrypt(JSON.stringify(accountCredentials));

    // Check if account already exists
    const existingAccount = await database.query(
      `SELECT id FROM platform_credentials
       WHERE user_id = $1 AND platform = 'facebook' AND account_identifier = $2`,
      [userUuid, accountIdentifier]
    );

    if (existingAccount.rows.length > 0) {
      // Update existing account
      await database.query(
        `UPDATE platform_credentials
         SET credentials = $1, is_active = true, last_validated = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [encryptedCredentials, existingAccount.rows[0].id]
      );

      logger.info('Facebook account updated', {
        userId: userUuid,
        accountIdentifier: accountIdentifier.substring(0, 3) + '***',
      });
    } else {
      // Create new account
      await database.query(
        `INSERT INTO platform_credentials
         (user_id, platform, account_name, account_identifier, credentials, is_active)
         VALUES ($1, 'facebook', $2, $3, $4, true)`,
        [userUuid, accountName, accountIdentifier, encryptedCredentials]
      );

      logger.info('Facebook account connected', {
        userId: userUuid,
        accountIdentifier: accountIdentifier.substring(0, 3) + '***',
      });
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
    logger.error('Facebook OAuth callback error:', error.response?.data || error.message);
    throw new Error(`Failed to connect Facebook account: ${error.response?.data?.error_description || error.message}`);
  }
}
```

---

### Step 4: Add Platform Routing

#### 4.1 Update OAuth2Controller

Add to `src/api/controllers/OAuth2Controller.ts` in the `getAuthUrl()` switch statement:

```typescript
case Platform.FACEBOOK:
  const fbAuthUrl = oauth2Service.getFacebookAuthURL(userId, returnUrl);
  res.json({
    success: true,
    authUrl: fbAuthUrl,
  });
  break;

case Platform.INSTAGRAM:
  const igAuthUrl = oauth2Service.getInstagramAuthURL(userId, returnUrl);
  res.json({
    success: true,
    authUrl: igAuthUrl,
  });
  break;

case Platform.LINKEDIN:
  const liAuthUrl = oauth2Service.getLinkedInAuthURL(userId, returnUrl);
  res.json({
    success: true,
    authUrl: liAuthUrl,
  });
  break;
```

#### 4.2 Add Callback Routes (Optional)

If your platform requires a dedicated callback handler, add to `src/api/routes/oauth.ts`:

```typescript
// Facebook OAuth callback
router.get('/facebook/callback', oauth2Controller.facebookCallback.bind(oauth2Controller));

// Instagram OAuth callback
router.get('/instagram/callback', oauth2Controller.instagramCallback.bind(oauth2Controller));
```

And implement the callback methods in the controller:

```typescript
async facebookCallback(req: Request, res: Response): Promise<void> {
  try {
    const { code, state, error } = req.query;

    if (error) {
      res.redirect(`/accounts?oauth_error=${encodeURIComponent(error as string)}`);
      return;
    }

    const result = await oauth2Service.handleFacebookCallback(code as string, state as string);
    res.redirect(
      `${result.returnUrl || '/accounts'}?oauth_success=true&account=${encodeURIComponent(result.accountInfo.name)}`
    );
  } catch (error: any) {
    logger.error('Facebook callback error:', error);
    res.redirect(`/accounts?oauth_error=${encodeURIComponent(error.message)}`);
  }
}
```

---

## Platform-Specific Implementation Notes

### Facebook
- **API Version:** v18.0 (update as needed)
- **Token Lifespan:** 60 days (long-lived)
- **Scopes:** `pages_manage_posts`, `pages_read_engagement`
- **Required:** Page ID for posting (not user ID)
- **Documentation:** https://developers.facebook.com/docs/facebook-login/overview

### Instagram
- **Inheritance:** Uses Facebook Graph API
- **Token Lifespan:** 60 days (long-lived)
- **Scopes:** `instagram_basic`, `instagram_content_publish`
- **Required:** Instagram Business Account linked to Facebook Page
- **Documentation:** https://developers.instagram.com/docs/instagram-api/overview

### LinkedIn
- **API Version:** LinkedIn API v2
- **Token Lifespan:** 1 year (can be refreshed)
- **Scopes:** `w_member_social`, `r_liteprofile`
- **Required:** LinkedIn Company Page access
- **Documentation:** https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication

### YouTube
- **API:** Google OAuth 2.0 (shared with Google Cloud)
- **Token Lifespan:** 1 hour access + refresh token
- **Scopes:** `https://www.googleapis.com/auth/youtube.upload`
- **Required:** YouTube Data API v3 enabled
- **Documentation:** https://developers.google.com/youtube/v3/docs

### TikTok
- **Token Lifespan:** 30 days
- **Scopes:** `video.upload`, `user.info.basic`
- **Required:** Business Account
- **Documentation:** https://developers.tiktok.com/doc/

---

## Testing Your Implementation

### 1. Verify Configuration
```bash
# Check server logs for OAuth 2.0 status
npm start | grep "OAuth 2.0"
```

You should see:
```
✅ OAuth 2.0 Configured (2/6):
   ✓ X (TWITTER)
   ✓ FACEBOOK
```

### 2. Test API Endpoint
```bash
curl http://localhost:8080/api/oauth/config
```

Response should include your new platform.

### 3. Test Authorization URL
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/oauth/facebook/auth-url
```

Should return a valid Facebook OAuth URL.

### 4. Test in Frontend
- Navigate to `/accounts`
- New platform should show "Add" button
- Click "Add" and verify redirect to platform login

---

## Common Issues & Troubleshooting

### Platform not showing in config endpoint
**Problem:** `GET /api/oauth/config` doesn't include your platform

**Solutions:**
1. Check environment variables are set (not empty strings)
2. Verify `REDIRECT_URI` is exactly correct
3. Restart server after changing env vars
4. Check `OAUTH2_PLATFORM_METADATA` has your platform

### "OAuth 2.0 not configured" error
**Problem:** Getting error even though env vars are set

**Solutions:**
1. Ensure all three are set: `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI`
2. No spaces or quotes in env values
3. Check for typos in env variable names
4. Restart Node process

### Authorization fails
**Problem:** User can't authorize even though config looks correct

**Solutions:**
1. Verify `REDIRECT_URI` matches platform's registered redirect
2. Check `CLIENT_ID` and `CLIENT_SECRET` are correct
3. Verify scopes are valid for your app
4. Check browser console for errors
5. Look at server logs for detailed error

### Token exchange fails
**Problem:** Getting 401/403 when exchanging code for token

**Solutions:**
1. Verify client credentials again
2. Check token endpoint URL is correct
3. Ensure code hasn't expired (usually 10 minutes)
4. Verify request format (JSON vs URL-encoded)

---

## Reference: Platform Configuration Template

```typescript
// 1. Add to Platform enum (src/core/content/types.ts)
export enum Platform {
  // ... existing platforms ...
  CUSTOM_PLATFORM = 'custom_platform',
}

// 2. Add to config (src/config/index.ts)
custom_platform: {
  clientId: process.env.CUSTOM_PLATFORM_CLIENT_ID || '',
  clientSecret: process.env.CUSTOM_PLATFORM_CLIENT_SECRET || '',
  redirectUri: process.env.CUSTOM_PLATFORM_REDIRECT_URI || 'http://localhost:8080/api/oauth/custom_platform/callback',
},

// 3. Add metadata (src/utils/oauth2Config.ts)
[Platform.CUSTOM_PLATFORM]: {
  id: Platform.CUSTOM_PLATFORM,
  name: 'Custom Platform',
  oauth2Scopes: ['scope1', 'scope2'],
  authorizationEndpoint: 'https://api.customplatform.com/oauth/authorize',
},

// 4. Implement OAuth methods (src/services/OAuth2Service.ts)
public getCustomPlatformAuthURL(userId: string, returnUrl?: string): string { ... }
public async handleCustomPlatformCallback(code: string, state: string) { ... }

// 5. Add controller case (src/api/controllers/OAuth2Controller.ts)
case Platform.CUSTOM_PLATFORM:
  const cpAuthUrl = oauth2Service.getCustomPlatformAuthURL(userId, returnUrl);
  res.json({ success: true, authUrl: cpAuthUrl });
  break;
```

---

## Environment Variables Reference

Complete list of supported platforms and their environment variables:

```env
# Twitter (X)
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
TWITTER_REDIRECT_URI=http://localhost:8080/api/oauth/twitter/callback

# Facebook
FACEBOOK_CLIENT_ID=your_app_id
FACEBOOK_CLIENT_SECRET=your_app_secret
FACEBOOK_REDIRECT_URI=http://localhost:8080/api/oauth/facebook/callback

# Instagram (uses Facebook)
INSTAGRAM_CLIENT_ID=your_app_id
INSTAGRAM_CLIENT_SECRET=your_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:8080/api/oauth/instagram/callback

# LinkedIn
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:8080/api/oauth/linkedin/callback

# YouTube
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:8080/api/oauth/youtube/callback

# TikTok
TIKTOK_CLIENT_ID=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
TIKTOK_REDIRECT_URI=http://localhost:8080/api/oauth/tiktok/callback
```

---

## Next Steps

After adding a new platform:

1. ✅ Test OAuth flow end-to-end
2. ✅ Update frontend to show new platform (accounts page already dynamic)
3. ✅ Implement publishing for the platform (if needed)
4. ✅ Add metrics collection (if needed)
5. ✅ Document platform-specific features/limitations

For publishing to new platforms, see `src/platforms/` directory and extend the PlatformAdapter base class.
