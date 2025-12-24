# Social Media Login Page Setup

## Overview

The Social Media Login page is a comprehensive, user-friendly interface for connecting to all supported social media platforms in one place. It provides a beautiful, organized way to manage multi-platform social media accounts.

## Features

### 📱 Supported Platforms

The Social Login page supports connections to 7 major social media platforms:

1. **X (Twitter)**
   - Real-time posting
   - Video sharing
   - Thread support
   - Analytics integration

2. **Instagram**
   - Feed posts
   - Reels
   - Stories
   - IGTV

3. **Facebook**
   - Feed posts
   - Groups
   - Pages
   - Live video

4. **TikTok**
   - Short videos
   - Drafts
   - Scheduled posts
   - Analytics

5. **YouTube**
   - Video uploads
   - Premieres
   - Shorts
   - Live streaming

6. **LinkedIn**
   - Professional posts
   - Video content
   - Company pages
   - Articles

7. **Telegram**
   - Channel posts
   - Bot automation
   - Broadcast
   - Groups

### ✨ Key Features

- **Beautiful, Modern UI**: Card-based grid layout with hover effects
- **Connection Status**: Real-time display of connected accounts
- **Multi-Account Support**: Connect multiple accounts per platform
- **OAuth Integration**: Secure OAuth 2.0/1.0a flows
- **Success/Error Notifications**: Clear feedback on connection status
- **Platform Stats**: Dashboard showing connection progress
- **Dark Mode Support**: Full dark theme compatibility
- **Mobile Responsive**: Works seamlessly on all devices

## File Location

```
/root/hub_social_media_js/client/src/app/social-login/page.tsx
```

## Architecture

### Component Structure

```typescript
SocialLoginPage
├── Header Section
├── Notification Banners (Error/Success)
├── Connected Accounts Stats
├── Platform Grid
│   └── Platform Cards (7 platforms)
│       ├── Platform Info
│       ├── Features List
│       └── Connect Button
├── Next Steps Section
└── Info Cards (Security, Multi-Account, Management)
```

### State Management

Uses Zustand authentication store (`useAuthStore`) for:
- Access token management
- User authentication verification
- Token refresh

### API Integration

Endpoints used:
- `GET /oauth/:platform/auth-url` - Get OAuth authorization URL
- `GET /platform-accounts` - Fetch connected accounts
- `POST /oauth/twitter/refresh/:accountId` - Refresh tokens (as needed)

## Usage

### Accessing the Page

Users can access the Social Login page through:

1. **Main Navigation**: Click "Social Login" in the sidebar
2. **Direct URL**: Navigate to `/social-login`
3. **Quick Setup**: From the onboarding flow

### Connecting an Account

1. Click the "Login & Connect" button on any platform card
2. User is redirected to platform's OAuth page
3. After authorization, redirected back to `/social-login`
4. Connected account appears with a checkmark
5. Success notification displayed

### Connecting Multiple Accounts

Users can:
- Click "Add" button multiple times per platform
- Connect different accounts for the same platform
- Manage all accounts from the Accounts page

## Security Features

1. **OAuth Authentication**: Industry-standard OAuth 2.0/1.0a flows
2. **PKCE Protection**: For supported platforms (Twitter)
3. **Encrypted Credentials**: All platform credentials stored encrypted
4. **No Plain Text Storage**: Credentials never stored unencrypted
5. **JWT Tokens**: Secure token-based authentication
6. **Rate Limiting**: Protection against brute force attacks

## Integration with Existing Features

### After Connecting Accounts

Users can:
- ✅ Create content in `/posts/create`
- ✅ Schedule posts in `/scheduler`
- ✅ Bulk upload videos in `/bulk-upload`
- ✅ View analytics in `/analytics`
- ✅ Manage all accounts in `/accounts`

### Connection Flow

```
Social Login Page
    ↓
OAuth Provider
    ↓
OAuth Callback
    ↓
Credentials Stored (Encrypted)
    ↓
User Redirected Back
    ↓
Success Notification
    ↓
Account Available for Publishing
```

## Customization

### Adding a New Platform

1. Add platform to `SOCIAL_PLATFORMS` array:

```typescript
{
  id: 'newplatform',
  name: 'New Platform',
  description: 'Description here',
  color: 'text-blue-600',
  bgColor: 'bg-blue-600 hover:bg-blue-700',
  icon: 'icon',
  features: ['Feature 1', 'Feature 2', 'Feature 3'],
}
```

2. Ensure backend OAuth endpoint exists:
   - `GET /oauth/newplatform/auth-url`
   - `GET /oauth/newplatform/callback`

3. Platform adapter exists in `/src/platforms/newplatform/`

### Customizing Colors

Modify the `bgColor` property in platform objects:

```typescript
// Twitter black
bgColor: 'bg-black hover:bg-gray-800'

// Instagram gradient
bgColor: 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500'

// YouTube red
bgColor: 'bg-red-600 hover:bg-red-700'
```

### Adjusting Grid Layout

Change the grid columns in the Platform Grid section:

```typescript
// Current: 3 columns on large screens
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"

// Options:
// lg:grid-cols-2 - 2 columns on large screens
// lg:grid-cols-4 - 4 columns on large screens
```

## Error Handling

The page handles several error scenarios:

1. **Not Authenticated**: Redirects to `/login`
2. **OAuth Failure**: Displays error notification with details
3. **Network Error**: Shows user-friendly error message
4. **API Errors**: Gracefully handles failed requests

## Performance Optimization

- Lazy loading of platform data
- Debounced state updates
- Optimized re-renders with React.memo (if needed)
- Efficient event delegation

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Platform Won't Connect

**Issue**: OAuth flow fails or redirects incorrectly

**Solutions**:
1. Verify API keys in environment variables
2. Check redirect URIs match in platform settings
3. Clear browser cache and cookies
4. Try incognito/private mode

### Account Shows as Not Connected

**Issue**: Connected account doesn't appear

**Solutions**:
1. Refresh the page
2. Clear localStorage (`authStore`)
3. Log out and log back in
4. Check database for account record

### Permission Errors

**Issue**: "Permission denied" when accessing platform

**Solutions**:
1. Verify scopes in OAuth configuration
2. Check user permissions on platform
3. Re-authorize the account

## Related Documentation

- [Authentication Setup](./src/api/controllers/AuthController.ts)
- [OAuth Integration](./src/services/OAuth2Service.ts)
- [Platform Adapters](./src/platforms/)
- [Account Management](./src/services/PlatformAccountService.ts)

## Future Enhancements

- [ ] Add platform-specific advanced settings
- [ ] Batch connect multiple accounts
- [ ] Platform health status indicators
- [ ] OAuth token expiry warnings
- [ ] Account linking (cross-platform profiles)
- [ ] Team collaboration features
- [ ] Account analytics dashboard

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review environment variable configuration
3. Check browser console for error messages
4. Review application logs
5. Contact development team
