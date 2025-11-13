#!/bin/bash

#
# Quick Twitter Token Refresh Script
# This script helps you quickly refresh expired X/Twitter tokens
#

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CREDENTIALS_FILE="$SCRIPT_DIR/credentials/twitter_accounts.json"

echo "╔════════════════════════════════════════════════════════╗"
echo "║   Twitter Token Refresh Helper                         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if credentials file exists
if [ ! -f "$CREDENTIALS_FILE" ]; then
  echo "❌ No credentials file found at: $CREDENTIALS_FILE"
  echo ""
  echo "ℹ️  You need to authenticate at least one account first."
  exit 1
fi

echo "📱 Current Twitter Accounts:"
echo ""

# Parse JSON and display accounts
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('$CREDENTIALS_FILE', 'utf8'));
Object.entries(data).forEach(([key, account], index) => {
  console.log('  ' + (index + 1) + '. @' + account.username);
  console.log('     Display: ' + account.displayName);
  console.log('     ID: ' + account.accountName);
  console.log('     Last Used: ' + new Date(account.lastUsed).toLocaleString());
  console.log('');
});
"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║   How to Refresh Expired Tokens                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "If you're getting '401 Invalid or expired token' errors:"
echo ""
echo "Step 1: Start the authentication server in one terminal"
echo "  ➜ node src/auth/authServer.js"
echo ""
echo "Step 2: Open your browser to the auth URL"
echo "  ➜ http://localhost:3001"
echo ""
echo "Step 3: Click 'Refresh Account List' or 'Authenticate New Account'"
echo ""
echo "Step 4: Follow the X/Twitter OAuth flow"
echo ""
echo "Step 5: Your credentials will be automatically updated"
echo ""
echo "Step 6: Restart the bot to use the new tokens"
echo "  ➜ npm run start"
echo ""
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║   Using the Interactive Refresh Tool                   ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Or run the interactive utility:"
echo "  ➜ node refresh_twitter_credentials.js"
echo ""
