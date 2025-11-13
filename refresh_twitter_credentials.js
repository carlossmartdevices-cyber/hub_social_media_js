#!/usr/bin/env node

/**
 * Twitter Credentials Refresh Utility
 * 
 * This script helps you re-authenticate X/Twitter accounts when tokens expire.
 * 
 * Usage:
 *   1. Run the auth server: node src/auth/authServer.js
 *   2. In another terminal, run this script: node refresh_twitter_credentials.js
 *   3. Follow the browser prompts to re-authenticate
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const colors = require('colors');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const credentialsFile = path.join(__dirname, 'credentials', 'twitter_accounts.json');

// Load current credentials
function loadCredentials() {
  if (!fs.existsSync(credentialsFile)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));
  } catch (error) {
    console.error('Error loading credentials:', error.message);
    return {};
  }
}

// Display menu
function showMenu() {
  console.log(colors.cyan('\n📱 Twitter Credentials Refresh Utility\n'));
  console.log(colors.yellow('Current Accounts:'));
  
  const credentials = loadCredentials();
  const accounts = Object.keys(credentials);
  
  if (accounts.length === 0) {
    console.log(colors.red('  No accounts configured yet.\n'));
  } else {
    accounts.forEach((accountName, index) => {
      const account = credentials[accountName];
      const tokenStatus = isTokenExpired(account) ? 
        colors.red('❌ EXPIRED') : 
        colors.green('✅ VALID');
      
      console.log(
        `  ${index + 1}. ${account.displayName} (@${account.username}) - ${tokenStatus}`
      );
      console.log(`     Account ID: ${account.accountName}`);
      console.log(`     Created: ${new Date(account.createdAt).toLocaleString()}`);
      console.log(`     Last Used: ${new Date(account.lastUsed).toLocaleString()}`);
    });
  }
  
  console.log(colors.cyan('\nOptions:'));
  console.log('  1. Re-authenticate an existing account');
  console.log('  2. Add a new account');
  console.log('  3. Remove an account');
  console.log('  4. View authentication server URL');
  console.log('  5. Exit\n');
}

function isTokenExpired(account) {
  // Tokens created more than 6 months ago might be expired
  const createdDate = new Date(account.createdAt);
  const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
  return createdDate < sixMonthsAgo;
}

function showAuthUrl() {
  console.log(colors.yellow('\n🔐 Twitter Authentication Server URL:\n'));
  console.log(colors.cyan('http://localhost:3001\n'));
  console.log(colors.green('Steps to re-authenticate:\n'));
  console.log('  1. Make sure the auth server is running:');
  console.log(colors.cyan('     node src/auth/authServer.js\n'));
  console.log('  2. Open this URL in your browser:');
  console.log(colors.cyan('     http://localhost:3001\n'));
  console.log('  3. Click "Authenticate New Account"');
  console.log('  4. Enter a friendly name for the account');
  console.log('  5. Follow the Twitter OAuth flow');
  console.log('  6. The account will be automatically added to credentials\n');
}

function showMenu2() {
  showMenu();
  
  rl.question(colors.yellow('Choose an option (1-5): '), (choice) => {
    switch (choice.trim()) {
      case '1':
        reAuthenticateAccount();
        break;
      case '2':
        addNewAccount();
        break;
      case '3':
        removeAccount();
        break;
      case '4':
        showAuthUrl();
        setTimeout(() => showMenu2(), 3000);
        break;
      case '5':
        console.log(colors.green('\n✅ Goodbye!\n'));
        rl.close();
        break;
      default:
        console.log(colors.red('\n❌ Invalid option. Please try again.\n'));
        setTimeout(() => showMenu2(), 1000);
    }
  });
}

function reAuthenticateAccount() {
  const credentials = loadCredentials();
  const accounts = Object.keys(credentials);
  
  if (accounts.length === 0) {
    console.log(colors.red('\n❌ No accounts found.\n'));
    setTimeout(() => showMenu2(), 1000);
    return;
  }
  
  console.log(colors.cyan('\nSelect account to re-authenticate:\n'));
  accounts.forEach((accountName, index) => {
    const account = credentials[accountName];
    console.log(`  ${index + 1}. @${account.username} (${account.displayName})`);
  });
  
  rl.question(colors.yellow('\nEnter account number: '), (num) => {
    const idx = parseInt(num) - 1;
    if (idx >= 0 && idx < accounts.length) {
      const accountName = accounts[idx];
      console.log(colors.yellow(`\n🔄 Re-authenticating @${credentials[accountName].username}...\n`));
      console.log(colors.cyan('1. Make sure the auth server is running: node src/auth/authServer.js'));
      console.log(colors.cyan('2. Open: http://localhost:3001'));
      console.log(colors.cyan('3. Click "Refresh Account List"'));
      console.log(colors.cyan('4. Select the account and re-authenticate\n'));
    } else {
      console.log(colors.red('\n❌ Invalid selection.\n'));
    }
    setTimeout(() => showMenu2(), 2000);
  });
}

function addNewAccount() {
  console.log(colors.cyan('\n➕ Adding New Account\n'));
  console.log(colors.yellow('1. Make sure the auth server is running: node src/auth/authServer.js'));
  console.log(colors.yellow('2. Open: http://localhost:3001'));
  console.log(colors.yellow('3. Click "Authenticate New Account"'));
  console.log(colors.yellow('4. Enter a friendly name and follow the OAuth flow\n'));
  
  setTimeout(() => showMenu2(), 3000);
}

function removeAccount() {
  const credentials = loadCredentials();
  const accounts = Object.keys(credentials);
  
  if (accounts.length === 0) {
    console.log(colors.red('\n❌ No accounts found.\n'));
    setTimeout(() => showMenu2(), 1000);
    return;
  }
  
  console.log(colors.cyan('\nSelect account to remove:\n'));
  accounts.forEach((accountName, index) => {
    const account = credentials[accountName];
    console.log(`  ${index + 1}. @${account.username} (${account.displayName})`);
  });
  
  rl.question(colors.yellow('\nEnter account number: '), (num) => {
    const idx = parseInt(num) - 1;
    if (idx >= 0 && idx < accounts.length) {
      const accountName = accounts[idx];
      rl.question(colors.red(`\nAre you sure you want to remove @${credentials[accountName].username}? (yes/no): `), (confirm) => {
        if (confirm.toLowerCase() === 'yes') {
          delete credentials[accountName];
          fs.writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2), { mode: 0o600 });
          console.log(colors.green(`\n✅ Account removed successfully!\n`));
        } else {
          console.log(colors.yellow('\n⚠️ Cancelled.\n'));
        }
        setTimeout(() => showMenu2(), 1000);
      });
    } else {
      console.log(colors.red('\n❌ Invalid selection.\n'));
      setTimeout(() => showMenu2(), 1000);
    }
  });
}

// Start the utility
console.clear();
console.log(colors.green('╔════════════════════════════════════════════════════════╗'));
console.log(colors.green('║   Twitter Credentials Refresh Utility                  ║'));
console.log(colors.green('╚════════════════════════════════════════════════════════╝\n'));

showMenu2();
