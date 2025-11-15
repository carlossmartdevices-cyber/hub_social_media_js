#!/usr/bin/env node

/**
 * Twitter Token Validator
 * Tests if stored credentials are valid
 */

require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');
const path = require('path');

// Simple color utility
const colors = {
  green: (str) => `\x1b[32m${str}\x1b[0m`,
  red: (str) => `\x1b[31m${str}\x1b[0m`,
  yellow: (str) => `\x1b[33m${str}\x1b[0m`,
  cyan: (str) => `\x1b[36m${str}\x1b[0m`,
};

const credentialsFile = path.join(__dirname, 'credentials', 'twitter_accounts.json');

async function testAccount(accountName, credentials) {
  try {
    console.log(colors.cyan(`\n🔍 Testing @${credentials.username} (${accountName})...`));
    
    const client = new TwitterApi({
      appKey: process.env.TWITTER_CONSUMER_KEY,
      appSecret: process.env.TWITTER_CONSUMER_SECRET,
      accessToken: credentials.accessToken,
      accessSecret: credentials.accessSecret,
    });
    
    // Try to get user info (this validates the token)
    const user = await client.v2.me();
    
    console.log(colors.green(`  ✅ Token is valid!`));
    console.log(`     Username: @${user.data.username}`);
    console.log(`     Name: ${user.data.name}`);
    console.log(`     ID: ${user.data.id}`);
    
    return true;
  } catch (error) {
    if (error.message.includes('401') || error.message.includes('Invalid or expired')) {
      console.log(colors.red(`  ❌ Token is EXPIRED or INVALID`));
      console.log(`     Error: ${error.message}`);
    } else {
      console.log(colors.yellow(`  ⚠️  Error testing token: ${error.message}`));
    }
    return false;
  }
}

async function validateAllTokens() {
  console.log(colors.green('╔════════════════════════════════════════════════════════╗'));
  console.log(colors.green('║   Twitter Token Validator                              ║'));
  console.log(colors.green('╚════════════════════════════════════════════════════════╝'));
  
  if (!fs.existsSync(credentialsFile)) {
    console.log(colors.red('\n❌ No credentials file found'));
    process.exit(1);
  }
  
  try {
    const credentials = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));
    
    if (Object.keys(credentials).length === 0) {
      console.log(colors.red('\n❌ No accounts found in credentials'));
      process.exit(1);
    }
    
    console.log(colors.cyan('\nValidating Twitter credentials...\n'));
    
    let validCount = 0;
    let expiredCount = 0;
    
    for (const [accountName, cred] of Object.entries(credentials)) {
      const isValid = await testAccount(accountName, cred);
      if (isValid) {
        validCount++;
      } else {
        expiredCount++;
      }
    }
    
    console.log(colors.cyan('\n╔════════════════════════════════════════════════════════╗'));
    console.log(colors.cyan('║   Validation Summary                                   ║'));
    console.log(colors.cyan('╚════════════════════════════════════════════════════════╝\n'));
    
    console.log(`Valid Tokens:   ${colors.green(validCount)}`);
    console.log(`Expired Tokens: ${colors.red(expiredCount)}`);
    console.log(`Total Accounts: ${Object.keys(credentials).length}\n`);
    
    if (expiredCount > 0) {
      console.log(colors.yellow('⚠️  Some tokens are expired. To refresh them:\n'));
      console.log('1. Start the auth server:');
      console.log(colors.cyan('   node src/auth/authServer.js\n'));
      console.log('2. Open your browser:');
      console.log(colors.cyan('   http://localhost:3001\n'));
      console.log('3. Click "Refresh Account List"');
      console.log('4. Re-authenticate the expired accounts\n');
    } else {
      console.log(colors.green('✅ All tokens are valid!\n'));
    }
    
  } catch (error) {
    console.error(colors.red('\n❌ Error reading credentials:'), error.message);
    process.exit(1);
  }
}

validateAllTokens().catch(error => {
  console.error(colors.red('❌ Validation failed:'), error);
  process.exit(1);
});
