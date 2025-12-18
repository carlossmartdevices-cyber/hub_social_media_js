# Platform Connection Implementation Guide

Complete implementation details for the platform connection feature.

## Overview

The platform connection feature allows users to securely connect multiple social media accounts and manage them from a unified dashboard. The system supports:

- Multiple accounts per platform
- Secure OAuth 2.0 authentication
- Encrypted credential storage
- Account status monitoring
- Connection validation and testing

## Architecture

### Backend Components

#### Database Schema
- **Table**: `platform_credentials`
- **Purpose**: Stores encrypted credentials and connection metadata
- **Columns**:
  - `id`: UUID primary key
  - `user_id`: Reference to user
  - `platform`: Platform identifier (twitter, instagram, etc.)
  - `account_name`: User-friendly name
  - `account_identifier`: Platform handle/username
  - `credentials`: Encrypted JSON credentials
  - `is_active`: Connection status
  - `is_default`: Default account flag
  - `last_validated`: Last successful validation timestamp
  - `created_at`, `updated_at`: Timestamps

#### API Endpoints

**List Accounts**
```
GET /api/platform-accounts
Authentication: Required (JWT)
Response: Array of connected accounts
```

**Add Account**
```
POST /api/platform-accounts
Authentication: Required
Body: {
  platform: string,
  accountName: string,
  accountIdentifier: string,
  credentials: object
}
Response: Created account object
```

**Update Account**
```
PATCH /api/platform-accounts/:id
Authentication: Required
Body: Partial account updates
Response: Updated account object
```

**Delete Account**
```
DELETE /api/platform-accounts/:id
Authentication: Required
Response: { success: true }
```

**Test Credentials**
```
POST /api/platform-accounts/:id/test
Authentication: Required
Response: { success: true, message: "Credentials valid" }
```

**OAuth Authorization URL**
```
GET /oauth/:platform/auth-url
Authentication: Required
Response: { authUrl: "https://..." }
```

**OAuth Callback**
```
GET /oauth/:platform/callback
Authentication: Optional (supports Telegram bot)
Response: Redirects to settings with success/error params
```

#### Services

**PlatformAccountService** (`src/services/PlatformAccountService.ts`)
- `getUserPlatformAccounts()`: Get all accounts for a user on a platform
- `getAllUserAccounts()`: Get all accounts across all platforms
- `getAccountById()`: Get specific account with decrypted credentials
- `getDefaultAccount()`: Get default account for a platform
- `addAccount()`: Add new platform account
- `updateAccount()`: Update account details
- `deleteAccount()`: Delete account
- `setAsDefault()`: Mark account as default
- `getAccountsCount()`: Get account count by platform

**PlatformAccountController** (`src/api/controllers/PlatformAccountController.ts`)
- Handles HTTP requests for account management
- Validates platform credentials
- Encrypts/decrypts sensitive data
- Returns formatted responses

#### Encryption

All credentials are encrypted using:
- **Algorithm**: AES-256
- **Mode**: Encryption Service (util/encryption.ts)
- **Storage**: Encrypted JSON in database
- **Decryption**: On-demand when credentials needed for API calls

### Frontend Components

#### PlatformAccountsOAuthEnhanced (`client-vite-backup/src/components/PlatformAccountsOAuthEnhanced.tsx`)

Advanced platform connection management UI with:
- **Tabs**: Overview and Available Platforms
- **Statistics**: Display account counts and status
- **Account Management**: List, test, and disconnect accounts
- **Platform Browser**: View all available platforms
- **OAuth Integration**: One-click platform connection
- **Responsive Design**: Works on mobile and desktop

**Features**:
- Real-time account status (Active/Inactive)
- Account count by platform
- Last validated timestamp
- Profile URL links
- Test connection button
- Delete/disconnect button
- Platform status indicators (available, beta, coming soon)

#### PlatformConnectionDashboard (`client-vite-backup/src/components/PlatformConnectionDashboard.tsx`)

Real-time connection monitoring dashboard with:
- **Summary Cards**: Total, active, and needs attention
- **Platform Health**: Individual platform status cards
- **Recent Activity**: Latest connected accounts
- **Health Tips**: Best practices for maintaining connections

**Features**:
- Color-coded health status (green/yellow/red)
- Activity timeline
- Connection statistics
- Refresh button for real-time updates

#### Settings Page (`client-vite-backup/src/pages/Settings.tsx`)

Integrated settings page that uses the enhanced OAuth component.

## Usage

### For Users

#### Connecting a Platform

1. Navigate to Settings
2. Click "Available Platforms" tab
3. Find desired platform
4. Click "Connect with OAuth"
5. Authorize on platform
6. Return to app with account connected

#### Managing Accounts

1. View all accounts in "Your Accounts" tab
2. Test connection with "Test" button
3. Visit profile with link icon
4. Disconnect with trash icon

#### Monitoring Status

1. Use Platform Connection Dashboard for real-time status
2. Check health indicators for each platform
3. View recent activity and statistics

### For Developers

#### Adding a New Platform

1. **Database Migration**: Add platform to `platform_credentials` table
2. **Platform Adapter**: Create adapter in `src/platforms/adapters/`
3. **OAuth Service**: Implement OAuth flow in `OAuth2Controller`
4. **Credentials Validation**: Add validation in `PlatformAccountController`
5. **Frontend**: Add platform to `PLATFORMS` array in component

#### Platform Adapter Template

```typescript
import { PlatformAdapter } from '../base/PlatformAdapter';

export class InstagramAdapter implements PlatformAdapter {
  async initialize(credentials: Record<string, string>): Promise<void> {
    // Initialize with credentials
  }

  async postContent(content: string): Promise<void> {
    // Post content to platform
  }

  async validateCredentials(): Promise<boolean> {
    // Validate credentials
  }

  async getAccountInfo(): Promise<Record<string, unknown>> {
    // Get account information
  }
}
```

#### OAuth Flow Implementation

```typescript
// 1. Generate authorization URL
const authUrl = await oauth2Service.getAuthUrl(platform, userId);

// 2. Handle callback
const token = await oauth2Service.handleCallback(platform, code);

// 3. Save credentials
await platformAccountService.addAccount(
  userId,
  platform,
  accountName,
  accountIdentifier,
  credentials
);
```

## Security Considerations

### Encryption

- All credentials encrypted before storage
- 256-bit AES encryption
- Key derived from ENCRYPTION_KEY environment variable
- Credentials decrypted only when needed

### Authentication

- JWT tokens required for account management
- OAuth 2.0 for secure platform authorization
- Token refresh support for long-lived tokens

### Authorization

- Users can only access their own accounts
- Database checks verify user ownership
- No cross-user account access

### Data Protection

- Credentials never logged
- Sensitive fields hidden in responses
- SQL injection prevention with parameterized queries
- XSS protection with input validation

## Configuration

### Environment Variables

```env
# Encryption
ENCRYPTION_KEY=your-256-bit-key

# OAuth
TWITTER_CLIENT_ID=xxx
TWITTER_CLIENT_SECRET=xxx
TWITTER_REDIRECT_URI=https://your-app.com/oauth/twitter/callback

# Database
DB_HOST=localhost
DB_NAME=content_hub
DB_USER=postgres
DB_PASSWORD=xxx

# Redis (for session storage)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Configuration File (`src/config/index.ts`)

```typescript
export const oauthConfig = {
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
    redirectUri: process.env.TWITTER_REDIRECT_URI,
  },
  // Add other platforms
};
```

## Database Setup

### Create Table

```sql
CREATE TABLE platform_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_identifier VARCHAR(255) NOT NULL,
  credentials TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  last_validated TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, platform, account_identifier),
  INDEX user_platform (user_id, platform),
  INDEX platform_active (platform, is_active)
);
```

### Create Indexes

```sql
CREATE INDEX idx_platform_credentials_user_id ON platform_credentials(user_id);
CREATE INDEX idx_platform_credentials_platform ON platform_credentials(platform);
CREATE INDEX idx_platform_credentials_is_active ON platform_credentials(is_active);
CREATE INDEX idx_platform_credentials_is_default ON platform_credentials(is_default);
```

## Testing

### Unit Tests

Test individual services and controllers:

```typescript
describe('PlatformAccountService', () => {
  it('should add a new account', async () => {
    const account = await service.addAccount(
      userId,
      'twitter',
      'Test Account',
      '@testaccount',
      { /* credentials */ }
    );
    expect(account).toBeDefined();
    expect(account.platform).toBe('twitter');
  });

  it('should encrypt credentials', () => {
    const encrypted = EncryptionService.encrypt('secret');
    expect(encrypted).not.toBe('secret');
  });
});
```

### Integration Tests

Test complete workflows:

```typescript
describe('Platform Connection Workflow', () => {
  it('should complete OAuth flow', async () => {
    // 1. Get auth URL
    const authUrl = await oauth2Service.getAuthUrl('twitter', userId);

    // 2. Simulate callback
    const token = await oauth2Service.handleCallback('twitter', code);

    // 3. Save account
    await platformAccountService.addAccount(userId, 'twitter', ...);

    // 4. Verify account created
    const accounts = await platformAccountService.getUserPlatformAccounts(userId, 'twitter');
    expect(accounts).toHaveLength(1);
  });
});
```

### E2E Tests

Test complete user flows in browser:

```typescript
describe('Platform Connection E2E', () => {
  it('should connect platform via UI', async () => {
    // Navigate to settings
    await page.goto('/settings');

    // Click connect button
    await page.click('[data-testid="connect-twitter"]');

    // Handle OAuth redirect
    // ...

    // Verify account appears
    const account = await page.waitForSelector('[data-testid="account-twitter"]');
    expect(account).toBeDefined();
  });
});
```

## Troubleshooting

### Common Issues

**Issue**: "Failed to connect account"
- Check OAuth credentials
- Verify redirect URI matches configuration
- Check network connectivity

**Issue**: "Credentials test failed"
- Credentials may be invalid or expired
- Platform may have revoked authorization
- Try reconnecting account

**Issue**: "Account shows as inactive"
- Click Test to verify credentials
- Disconnect and reconnect
- Check platform hasn't changed permissions

**Issue**: "Multiple accounts not working"
- Verify is_default flag for default selection
- Check account_identifier uniqueness
- Clear browser cache

## Performance Optimization

### Caching

- Cache account list with Redis (TTL: 300s)
- Cache platform configuration
- Cache OAuth tokens with expiry

### Queries

- Use indexes on frequently queried columns
- Batch queries when possible
- Lazy load credentials

### Rate Limiting

- Apply rate limiting to OAuth endpoints
- Throttle credential validation requests
- Implement exponential backoff for failures

## Monitoring and Logging

### Key Metrics

- Number of connected accounts
- OAuth success/failure rate
- Credential validation rate
- Average connection time

### Logging

```typescript
logger.info('Platform account added', {
  userId,
  platform,
  accountIdentifier,
  timestamp: new Date(),
});

logger.error('OAuth flow failed', {
  platform,
  error: errorMessage,
  userId,
});
```

## Future Enhancements

1. **Multiple Credential Types**: Support different authentication methods
2. **Batch Operations**: Connect multiple accounts at once
3. **Scheduled Validation**: Auto-validate credentials periodically
4. **Analytics Dashboard**: Advanced metrics and usage tracking
5. **Auto-Reconnection**: Automatic reconnection on token refresh
6. **Account Switching**: Quick account switcher in publish UI
7. **Permission Scopes**: Display and manage specific permissions
8. **Audit Trail**: Complete history of account changes

## References

- [OAuth 2.0 Specification](https://tools.ietf.org/html/rfc6749)
- [Twitter API Documentation](https://developer.twitter.com/en/docs)
- [Facebook Graph API](https://developers.facebook.com/docs/graph-api)
- [LinkedIn API](https://docs.microsoft.com/en-us/linkedin/shared/api-reference/api-reference)
- [Telegram Bot API](https://core.telegram.org/bots/api)

---

**Last Updated**: December 18, 2025
