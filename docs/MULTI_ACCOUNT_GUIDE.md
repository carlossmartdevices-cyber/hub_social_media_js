# Multi-Account Support Guide

## Overview

The Social Media Content Hub now supports managing multiple X (Twitter) accounts through the Telegram bot! You can add, manage, and switch between multiple X accounts easily.

## Features

### ✅ Multiple Accounts Per Platform
- Add unlimited X (Twitter) accounts
- Each account has a unique name and identifier
- Securely encrypted credentials

### ✅ Default Account Management
- Mark one account as default for posting
- Easily switch default accounts
- First account is automatically set as default

### ✅ Telegram Bot Integration
- Interactive account management through Telegram
- Step-by-step account setup wizard
- Inline keyboards for easy navigation

---

## Using the Telegram Bot

### 📱 Available Commands

| Command | Description |
|---------|-------------|
| `/xaccounts` | View all your X (Twitter) accounts |
| `/addxaccount` | Add a new X account (6-step wizard) |
| `/setdefaultx` | Change which account is the default |
| `/deletexaccount` | Delete an X account |
| `/cancel` | Cancel ongoing operation |

---

## How to Add an X Account

### Step 1: Start the Wizard
Send `/addxaccount` to the Telegram bot

### Step 2: Account Name
Provide a friendly name for your account:
```
Examples:
- "Personal"
- "Business"
- "Marketing Team"
- "Client ABC"
```

### Step 3: Username
Enter your X username (without @ symbol):
```
Example: johndoe
(NOT @johndoe)
```

### Step 4-7: API Credentials
You'll be asked for:
1. API Key
2. API Secret
3. Access Token
4. Access Token Secret

#### Where to Get X API Credentials

1. Go to [X Developer Portal](https://developer.twitter.com)
2. Navigate to Projects & Apps
3. Create a new App or select existing
4. Go to "Keys and tokens" tab
5. Generate/Copy:
   - API Key (Consumer Key)
   - API Secret (Consumer Secret)
   - Access Token
   - Access Token Secret

**Important**: Keep these credentials secure! Never share them.

### Step 8: Confirmation
Once completed, you'll receive a confirmation:
```
✅ X Account Added Successfully!

Account Name: Personal
Username: @johndoe
Default: Yes ⭐

Your X account is now ready to use!
```

---

## Managing Your Accounts

### View All Accounts

Command: `/xaccounts`

Response shows:
```
🐦 Your X (Twitter) Accounts

1. ✅ Personal ⭐
   @johndoe
   ID: a1b2c3d4

2. ✅ Business
   @mycompany
   ID: e5f6g7h8

[📝 Edit Personal] [⭐ Default]
[📝 Edit Business] [⭐ Set Default]
[➕ Add New X Account]
```

Legend:
- ✅ = Active account
- ⭐ = Default account
- ❌ = Inactive account

### Set Default Account

**Option 1**: Use command
```
/setdefaultx
```
Then select from the list

**Option 2**: From `/xaccounts` view
Click the "⭐ Set Default" button next to any account

### Delete an Account

**Option 1**: Use command
```
/deletexaccount
```
Then select the account to delete

**Option 2**: Inline keyboard (coming soon)

---

## Database Schema

### Updated Tables

#### `platform_credentials` Table

**New Columns**:
- `account_name` VARCHAR(255) NOT NULL - Friendly name
- `account_identifier` VARCHAR(255) NOT NULL - Username/handle
- `is_default` BOOLEAN DEFAULT false - Is this the default account?

**Removed Constraint**:
- ❌ `UNIQUE(user_id, platform)` - Removed to allow multiple accounts

**New Constraint**:
- ✅ `UNIQUE(user_id, platform, account_identifier)` - Prevents duplicate accounts

#### `posts` Table

**New Column**:
- `platform_account_ids` JSONB DEFAULT '{}' - Maps platform to specific account ID

Example:
```json
{
  "twitter": "account-uuid-here",
  "instagram": "another-account-uuid"
}
```

---

## Migration Guide

### Running the Migration

```bash
# Option 1: Manual SQL
psql -U postgres -d content_hub < src/database/migrations/002_multi_account_support.sql

# Option 2: Using Node.js migration runner
npm run db:migrate
```

### What the Migration Does

1. **Removes old constraint** that limited to one account per platform
2. **Adds new columns**:
   - `account_name` - User-friendly name
   - `account_identifier` - Username/handle
   - `is_default` - Default account flag
3. **Updates existing data**:
   - Sets account names to "{Platform} Account"
   - Generates unique identifiers
   - Marks all existing accounts as default
4. **Creates new indexes** for faster lookups
5. **Adds new column to posts table** for account selection

### Backward Compatibility

✅ **Fully backward compatible**

- Existing accounts are automatically migrated
- Old API endpoints still work
- Existing credentials remain encrypted and functional

---

## API Usage

### Get User's X Accounts

```typescript
import platformAccountService from './services/PlatformAccountService';

const accounts = await platformAccountService.getUserPlatformAccounts(
  userId,
  'twitter'
);
```

### Add New Account

```typescript
const account = await platformAccountService.addAccount(
  userId,
  'twitter',
  'Personal Account',  // account name
  'johndoe',           // username
  {
    apiKey: '...',
    apiSecret: '...',
    accessToken: '...',
    accessSecret: '...'
  },
  true  // set as default
);
```

### Get Default Account

```typescript
const defaultAccount = await platformAccountService.getDefaultAccount(
  userId,
  'twitter'
);

// Use credentials
const credentials = defaultAccount.credentials;
```

### Set Account as Default

```typescript
const success = await platformAccountService.setAsDefault(
  accountId,
  userId
);
```

### Delete Account

```typescript
const success = await platformAccountService.deleteAccount(
  accountId,
  userId
);
```

---

## Security Considerations

### 🔒 Credentials Encryption

All account credentials are:
- **Encrypted** using AES-256-CBC
- **Salted** with unique salt per encryption
- **Stored securely** in the database
- **Never logged** or exposed in plain text

### 🔒 Access Control

- Users can only access their own accounts
- All database queries include `user_id` filter
- Service layer validates user ownership

### 🔒 Bot Security

- User states stored in memory only
- States cleared after completion or errors
- Credentials never echoed back in messages
- Secure credential transmission via Telegram

---

## Troubleshooting

### "Account already exists" Error

**Cause**: You're trying to add an account with the same username

**Solution**: Each username can only be added once per user

### Can't Set Default Account

**Cause**: Usually means account doesn't exist or doesn't belong to you

**Solution**:
1. Check `/xaccounts` to see your accounts
2. Verify you're selecting the correct account
3. Try again or contact support

### Credentials Not Working

**Cause**: Invalid API credentials

**Solution**:
1. Verify credentials in X Developer Portal
2. Ensure App has correct permissions
3. Regenerate tokens if needed
4. Delete and re-add the account with correct credentials

### Migration Failed

**Cause**: Database schema conflicts

**Solution**:
```bash
# Check current schema
psql -U postgres -d content_hub -c "\d platform_credentials"

# If migration already ran
# Check if columns exist:
# - account_name
# - account_identifier
# - is_default

# If they exist, migration is complete
```

---

## Future Enhancements

### Coming Soon 🚀

- [ ] Edit account credentials
- [ ] Bulk account import
- [ ] Account health monitoring
- [ ] Usage statistics per account
- [ ] Schedule posts to specific accounts
- [ ] Multi-account posting (same post to multiple accounts)
- [ ] Account groups/teams

---

## Examples

### Example 1: Personal & Business Accounts

```
User: /xaccounts

Bot:
🐦 Your X (Twitter) Accounts

1. ✅ Personal ⭐
   @john_personal

2. ✅ Business
   @johndoe_biz

[Default: Personal will be used for all posts unless specified]
```

### Example 2: Adding Second Account

```
User: /addxaccount

Bot: Step 1/6: What would you like to name this account?

User: Business

Bot: Step 2/6: What is your X username?

User: johndoe_biz

Bot: Step 3/6: Enter your X API Key

User: xyz123...

[Continue through steps 4-6]

Bot: ✅ X Account Added Successfully!
     Account Name: Business
     Username: @johndoe_biz
     Default: No
```

### Example 3: Switching Default Account

```
User: /setdefaultx

Bot: Select which account should be the default:
     [⭐ Personal (@john_personal)]
     [Business (@johndoe_biz)]

User: [Clicks "Business"]

Bot: ✅ Default X account updated successfully!
```

---

## Support

### Questions?

- View all commands: `/help`
- Check system status: `/status`
- Report issues: GitHub Issues

### Need Help?

1. Check this documentation
2. Review error messages carefully
3. Verify your X API credentials
4. Contact support with error details

---

**Last Updated**: 2025-11-15
**Version**: 2.0
**Feature**: Multi-Account Support
