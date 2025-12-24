# Platform Implementation Checklist

Use this checklist when adding a new OAuth 2.0 social media platform.

---

## Pre-Implementation

- [ ] Platform developer account created
- [ ] App/Project created in platform's developer console
- [ ] OAuth 2.0 credentials obtained (Client ID, Client Secret)
- [ ] Redirect URI whitelisted in platform settings
- [ ] Scopes identified and documented
- [ ] API documentation reviewed
- [ ] Token lifespan and refresh policy understood

---

## Configuration (30 minutes)

### Environment Variables
- [ ] `.env` file updated with:
  - `{PLATFORM}_CLIENT_ID`
  - `{PLATFORM}_CLIENT_SECRET`
  - `{PLATFORM}_REDIRECT_URI`
- [ ] Variables are non-empty strings
- [ ] Variables do not contain quotes or spaces

### config/index.ts
- [ ] Added platform config:
  ```typescript
  {platform_name}: {
    clientId: process.env.{PLATFORM}_CLIENT_ID || '',
    clientSecret: process.env.{PLATFORM}_CLIENT_SECRET || '',
    redirectUri: process.env.{PLATFORM}_REDIRECT_URI || '...',
  },
  ```
- [ ] Config structure matches existing platforms
- [ ] Default redirect URI set correctly

---

## Metadata Registration (15 minutes)

### oauth2Config.ts
- [ ] Added platform to `OAUTH2_PLATFORM_METADATA`:
  ```typescript
  [Platform.{PLATFORM}]: {
    id: Platform.{PLATFORM},
    name: 'Display Name',
    oauth2Scopes: ['scope1', 'scope2'],
    authorizationEndpoint: 'https://...',
  },
  ```
- [ ] Display name matches platform official name
- [ ] Scopes are correct for intended use
- [ ] Authorization endpoint URL verified
- [ ] Token endpoint URL documented (for reference)

---

## OAuth2Service Implementation (2-3 hours)

### Authorization URL Method
- [ ] Method named `get{Platform}AuthURL()`
- [ ] Accepts `userId` and optional `returnUrl`
- [ ] Gets credentials via `getOAuth2Credentials()`
- [ ] Validates credentials exist
- [ ] Generates state parameter
- [ ] Stores state in `stateStore`
- [ ] Sets state cleanup timeout (10 minutes)
- [ ] Constructs authorization URL correctly
- [ ] Includes all required parameters
- [ ] Returns absolute URL
- [ ] Logs auth URL generation

### Callback Handler Method
- [ ] Method named `handle{Platform}Callback()`
- [ ] Accepts `code` and `state` parameters
- [ ] Verifies state parameter exists
- [ ] Deletes state from store
- [ ] Gets credentials via `getOAuth2Credentials()`
- [ ] Exchanges code for access token via HTTP POST
- [ ] Handles token response properly
- [ ] Retrieves user info from platform API
- [ ] Extracts user ID and username
- [ ] Creates `accountIdentifier` (consistent format)
- [ ] Encrypts credentials before storage
- [ ] Checks if account already exists
- [ ] Either updates or inserts into `platform_credentials`
- [ ] Returns `{ userId, returnUrl, accountInfo }`
- [ ] Has proper error handling
- [ ] Logs success and errors

### Credential Storage
- [ ] Stores required fields:
  - `accessToken` (always)
  - `refreshToken` (if supported)
  - `expiresAt` (if time-limited)
  - `userId` (platform user ID)
  - `username` (display name)
- [ ] Additional platform-specific fields if needed
- [ ] EncryptionService used for encryption
- [ ] Stored in `platform_credentials` table
- [ ] `user_id` set correctly
- [ ] `platform` name matches exactly
- [ ] `account_identifier` unique per platform
- [ ] `is_active` set to true
- [ ] Handles duplicate account updates

### Error Handling
- [ ] Invalid/missing state → clear error message
- [ ] Missing credentials → helpful error
- [ ] Network errors → logged and handled
- [ ] Invalid auth code → user-friendly error
- [ ] Token exchange failure → detailed logging
- [ ] Database errors → caught and logged

---

## Controller Integration (15 minutes)

### OAuth2Controller.ts
- [ ] Added case in `getAuthUrl()` switch:
  ```typescript
  case Platform.{PLATFORM}:
    const authUrl = oauth2Service.get{Platform}AuthURL(userId, returnUrl);
    res.json({ success: true, authUrl });
    break;
  ```
- [ ] Platform enum value used correctly
- [ ] Auth URL method called properly
- [ ] Response format matches other platforms
- [ ] Error handling consistent with other platforms

### Optional: Callback Controller
- [ ] Callback method added if needed:
  ```typescript
  async {platform}Callback(req: Request, res: Response)
  ```
- [ ] Extracts `code` and `state` from query
- [ ] Calls `oauth2Service.handle{Platform}Callback()`
- [ ] Handles errors appropriately
- [ ] Redirects to frontend with success/error params
- [ ] Includes account info in redirect URL

---

## Routing (10 minutes)

### oauth.ts
- [ ] Callback route added (if not using generic):
  ```typescript
  router.get('/{platform}/callback', oauth2Controller.{platform}Callback.bind(...));
  ```
- [ ] Route placed after config route
- [ ] Route pattern matches platform name
- [ ] Controller method binding correct

---

## Frontend Updates (Automatic)

- [ ] Platform metadata used from `/api/oauth/config`
- [ ] Accounts page automatically shows new platform
- [ ] "Add" button appears (if configured)
- [ ] "Not configured" badge appears (if not configured)
- [ ] No code changes needed (dynamic detection)

---

## Testing (1-2 hours)

### Configuration Testing
- [ ] `npm start` shows platform in OAuth 2.0 status logs
- [ ] `GET /api/oauth/config` includes platform
- [ ] Platform shows `oauth2Available: true`

### API Testing
- [ ] Get auth URL endpoint works:
  ```bash
  curl -H "Authorization: Bearer JWT" \
    http://localhost:8080/api/oauth/{platform}/auth-url
  ```
- [ ] Returns valid authorization URL
- [ ] URL redirects to platform login

### Authorization Flow Testing
- [ ] [ ] Click platform "Add" button in `/accounts`
- [ ] [ ] Redirect to platform login works
- [ ] [ ] Can authorize with test account
- [ ] [ ] Callback received without errors
- [ ] [ ] Account appears in `/accounts` list
- [ ] [ ] Server logs show success messages

### Error Testing
- [ ] [ ] Invalid credentials → clear error message
- [ ] [ ] Revoke permission → graceful error
- [ ] [ ] Close browser during auth → state expires properly
- [ ] [ ] Network error → proper error handling

### Database Testing
- [ ] [ ] Account stored in `platform_credentials` table
- [ ] [ ] Credentials are encrypted
- [ ] [ ] Account metadata correct
- [ ] [ ] Can retrieve account later

---

## Security Review

- [ ] State parameter validated
- [ ] PKCE used (if supported by platform)
- [ ] Credentials encrypted before storage
- [ ] No credentials logged
- [ ] HTTPS used for all API calls
- [ ] Client secret never exposed to frontend
- [ ] State expires after timeout
- [ ] Proper error messages (no info leakage)
- [ ] Rate limiting considered (if applicable)

---

## Documentation

### Code Comments
- [ ] Method purposes documented
- [ ] Complex logic explained
- [ ] Parameter descriptions included
- [ ] Return value documented
- [ ] Error cases documented

### Code Examples
- [ ] Added to `OAUTH2_IMPLEMENTATION_EXAMPLES.md`
- [ ] Includes full implementation code
- [ ] Explains platform-specific considerations
- [ ] Shows scopes and endpoints used

### Setup Guide
- [ ] Added to `OAUTH2_QUICK_START.md` (if notable)
- [ ] Environment variables listed
- [ ] Step-by-step instructions included
- [ ] Troubleshooting tips provided

---

## Final Verification

- [ ] TypeScript compiles without errors
  ```bash
  npx tsc --noEmit
  ```

- [ ] Server starts without errors
  ```bash
  npm start
  ```

- [ ] OAuth 2.0 status logged at startup

- [ ] Frontend loads without JS errors
  ```bash
  npm run dev  # or dev server command
  ```

- [ ] Platform appears in `/accounts`

- [ ] Full OAuth flow works end-to-end

- [ ] Account persists after logout/login

- [ ] Multiple accounts per user work (if testing)

---

## Git Commit

After all tests pass:

```bash
git add .
git commit -m "feat: Add {Platform} OAuth 2.0 support

Add complete OAuth 2.0 implementation for {Platform}:
- Environment variables configuration
- Platform metadata registration
- Authorization URL generation
- Callback handling and token exchange
- Encrypted credential storage
- Error handling and logging

Changes:
- src/config/index.ts: Added {platform} configuration
- src/utils/oauth2Config.ts: Added platform metadata
- src/services/OAuth2Service.ts: Implemented OAuth flow
- src/api/controllers/OAuth2Controller.ts: Added routing
- docs/: Added implementation examples

Testing:
- ✅ Authorization flow works
- ✅ Account stored in database
- ✅ Credentials properly encrypted
- ✅ Error handling verified
- ✅ TypeScript compilation passes
"
```

---

## Post-Implementation

### Immediate
- [ ] Create GitHub issue for next platform
- [ ] Update team with implementation status
- [ ] Document any platform-specific quirks

### Within 1 Week
- [ ] Implement platform-specific publishing adapter
- [ ] Add metrics collection (if needed)
- [ ] Add to production environment

### Within 1 Month
- [ ] Monitor for issues/bugs
- [ ] Gather user feedback
- [ ] Plan next platform

---

## Platform-Specific Notes

### Facebook
- **Token Lifespan:** 60 days (long-lived)
- **Special:** Business Account required for publishing
- **Link:** https://developers.facebook.com/docs/facebook-login/overview

### Instagram
- **Token Lifespan:** 60 days (long-lived)
- **Special:** Uses Facebook Graph API, requires Facebook App
- **Link:** https://developers.instagram.com/docs/instagram-api/overview

### LinkedIn
- **Token Lifespan:** 1 year (supports refresh)
- **Special:** Company Page access needed for posting
- **Link:** https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication

### YouTube
- **Token Lifespan:** 1 hour (requires refresh token)
- **Special:** Google OAuth 2.0, requires YouTube Data API v3
- **Link:** https://developers.google.com/youtube/v3/docs

### TikTok
- **Token Lifespan:** 30 days
- **Special:** Business Account required
- **Link:** https://developers.tiktok.com/doc/

---

## Troubleshooting During Implementation

| Issue | Solution |
|-------|----------|
| Platform not in config | Check env vars set, restart server |
| "Not configured" error | Verify all three env vars (ID, SECRET, URI) |
| Auth URL generation fails | Check credentials.clientId/Secret format |
| Callback gives 404 | Verify route in oauth.ts matches platform name |
| Token exchange fails | Check redirect URI matches exactly |
| State validation fails | Check state cleanup timeout |
| Credentials not encrypting | Verify EncryptionService is imported |
| Account not storing | Check database connection, table schema |
| Frontend doesn't show button | Clear localStorage, restart dev server |

---

## Estimated Timeline

| Phase | Time | Tasks |
|-------|------|-------|
| Configuration | 30 min | Env vars, config, metadata |
| Implementation | 2-3 hrs | OAuth service, controller |
| Testing | 1-2 hrs | Auth flow, error cases |
| Documentation | 30 min | Examples, comments |
| **Total** | **4-6 hrs** | All phases |

---

## Success Criteria

✅ Platform appears in `/api/oauth/config`
✅ Frontend shows "Add" button
✅ Authorization URL generated correctly
✅ User can authorize on platform
✅ Callback processed without errors
✅ Account appears in `/accounts`
✅ Credentials encrypted and stored
✅ Can re-authenticate
✅ Multiple accounts per platform work
✅ All tests pass
✅ No TypeScript errors
✅ Error messages are helpful
✅ Logs show proper messages
✅ Code is documented

---

## Questions?

Refer to:
- [ADDING_OAUTH2_PLATFORMS.md](./ADDING_OAUTH2_PLATFORMS.md) - Complete guide
- [OAUTH2_IMPLEMENTATION_EXAMPLES.md](./OAUTH2_IMPLEMENTATION_EXAMPLES.md) - Code examples
- [OAUTH2_QUICK_START.md](./OAUTH2_QUICK_START.md) - Quick reference
- Platform's official API documentation

Happy implementing! 🚀
