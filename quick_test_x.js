#!/usr/bin/env node

/**
 * Twitter/X Quick Test Script
 * Simple test for X posting functionality
 */

require('dotenv').config();
const MultiAccountTwitterClient = require('./src/auth/multiAccountTwitterClient');

const colors = {
  green: (str) => `\x1b[32m${str}\x1b[0m`,
  red: (str) => `\x1b[31m${str}\x1b[0m`,
  cyan: (str) => `\x1b[36m${str}\x1b[0m`,
};

async function quickTest() {
  console.log(colors.cyan('\n✅ Twitter/X Quick Test\n'));
  
  try {
    const client = new MultiAccountTwitterClient();
    const accounts = client.getAccountNames();
    
    if (accounts.length === 0) {
      console.log(colors.red('❌ No accounts configured\n'));
      return;
    }
    
    console.log(`Found ${accounts.length} X account(s):\n`);
    
    for (const accountName of accounts) {
      const account = client.getAccountInfo(accountName);
      console.log(`  @${account.username} (${account.displayName})`);
    }
    
    // Test text posting
    console.log(colors.cyan('\n📝 Testing text post...\n'));
    
    const testMsg = `🤖 Bot test at ${new Date().toLocaleTimeString()}`;
    const result = await client.sendMessage(accounts[0], testMsg);
    
    console.log(colors.green(`✅ Successfully posted to @${result.account}!`));
    console.log(`   Tweet: https://x.com/${result.account}/status/${result.tweetId}\n`);
    
  } catch (error) {
    console.log(colors.red(`❌ Error: ${error.message}\n`));
    process.exit(1);
  }
}

quickTest();
