# Troubleshooting X/Twitter Login Issues

## Common Error: "auth login failed"

This guide helps diagnose and fix authentication issues with X/Twitter login.

## 1. Check Database Connectivity

The most common issue is database connection problems:

```bash
# Test database connection
psql -h localhost -p 55433 -U postgres -d content_hub

# If connection fails, check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL if needed
sudo systemctl restart postgresql
```

## 2. Verify Twitter/X OAuth Configuration

Check if all required environment variables are set:

```bash
# Check Twitter OAuth 2.0 credentials
echo "TWITTER_CLIENT_ID: $TWITTER_CLIENT_ID"
echo "TWITTER_CLIENT_SECRET: $TWITTER_CLIENT_SECRET"
echo "TWITTER_REDIRECT_URI: $TWITTER_REDIRECT_URI"

# Check if credentials are valid (should not be empty)
if [ -z "$TWITTER_CLIENT_ID" ] || [ -z "$TWITTER_CLIENT_SECRET" ]; then
    echo "❌ Twitter OAuth 2.0 credentials are missing!"
else
    echo "✅ Twitter OAuth 2.0 credentials are configured"
fi
```

## 3. Check API and Client URLs

Ensure the frontend is pointing to the correct API URL:

```bash
# Check client configuration
cat client/.env.local

# Should contain:
# NEXT_PUBLIC_API_URL=http://localhost:8080 (development)
# or
# NEXT_PUBLIC_API_URL=https://yourdomain.com (production)
```

## 4. Test the OAuth Flow Manually

You can test the OAuth flow step by step:

```bash
# 1. Get the OAuth authorization URL
curl -X GET "http://localhost:8080/auth/x/login"

# 2. Visit the returned authUrl in your browser
# 3. After Twitter authentication, you should be redirected back to your app
```

## 5. Check for Rate Limiting

The authentication endpoints have rate limits:
- 5 login attempts per 15 minutes
- 3 registration attempts per hour

If you're rate limited, wait 15 minutes or check the response headers:
```bash
curl -I "http://localhost:8080/auth/login"
# Look for X-RateLimit-* headers
```

## 6. Verify JWT Configuration

Check if JWT secrets are properly configured:

```bash
echo "JWT_SECRET: $JWT_SECRET"
echo "JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET"

# Secrets should be at least 32 characters long
if [ ${#JWT_SECRET} -lt 32 ] || [ ${#JWT_REFRESH_SECRET} -lt 32 ]; then
    echo "❌ JWT secrets are too short!"
else
    echo "✅ JWT secrets are properly configured"
fi
```

## 7. Check Application Logs

Look for specific authentication errors:

```bash
# Check recent error logs
tail -100 ./logs/error.log | grep -i "auth\|twitter\|x\|oauth"

# Check combined logs
tail -100 ./logs/combined.log | grep -i "auth\|twitter\|x\|oauth"
```

## 8. Test with Different Browsers

Sometimes browser extensions or cached data can interfere:
- Try Chrome Incognito mode
- Try Firefox Private Window
- Clear browser cache and cookies

## 9. Verify Twitter API Status

Check if Twitter's API is operational:
- Visit https://developer.twitter.com/en/status
- Check for any API outages or issues

## 10. Check Redirect URIs

Ensure your Twitter app has the correct redirect URIs configured:
- Development: `http://localhost:8080/api/auth/x/callback`
- Production: `https://yourdomain.com/api/auth/x/callback`

## Debugging the OAuth Flow

If you need to debug the OAuth flow in detail:

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Restart the application
npm run dev

# Then attempt the login and check logs
```

## Common Solutions

### Solution 1: Database Connection Fix
```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Wait a few seconds, then test
psql -h localhost -p 55433 -U postgres -d content_hub
```

### Solution 2: Verify Twitter App Configuration
1. Go to https://developer.twitter.com/
2. Navigate to your app
3. Check "Authentication Settings"
4. Ensure OAuth 2.0 is enabled
5. Verify redirect URIs match your configuration

### Solution 3: Clear Redis Cache
If OAuth states are cached incorrectly:
```bash
# Connect to Redis
redis-cli

# Clear OAuth cache
KEYS "oauth2:state:*" | xargs DEL
```

### Solution 4: Test with Postman
Use Postman to test the API endpoints:
1. `GET /auth/x/login` - Should return authUrl
2. Visit the authUrl in browser
3. After Twitter auth, should redirect to callback

## Contact Support

If you've tried all these steps and still have issues, please provide:
- Exact error message
- Browser console logs
- Server logs (from `./logs/error.log`)
- Screenshot of the error

This will help diagnose the specific issue you're experiencing.
