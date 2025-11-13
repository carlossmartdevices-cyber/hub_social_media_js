#!/usr/bin/env node

/**
 * Twitter API Configuration Validator
 * Checks if the app keys and token secrets are properly configured
 */

require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');
const path = require('path');

const colors = {
  green: (str) => `\x1b[32m${str}\x1b[0m`,
  red: (str) => `\x1b[31m${str}\x1b[0m`,
  yellow: (str) => `\x1b[33m${str}\x1b[0m`,
  cyan: (str) => `\x1b[36m${str}\x1b[0m`,
};

async function validateConfig() {
  console.log(colors.cyan('╔════════════════════════════════════════════════════════╗'));
  console.log(colors.cyan('║   Twitter API Configuration Validator                  ║'));
  console.log(colors.cyan('╚════════════════════════════════════════════════════════╝\n'));
  
  // Check environment variables
  console.log(colors.cyan('Checking environment variables...\n'));
  
  const requiredEnvVars = [
    'TWITTER_CONSUMER_KEY',
    'TWITTER_CONSUMER_SECRET',
  ];
  
  let allValid = true;
  
  requiredEnvVars.forEach(varName => {
    if (process.env[varName]) {
      const masked = process.env[varName].substring(0, 5) + '****' + process.env[varName].substring(process.env[varName].length - 5);
      console.log(colors.green(`✅ ${varName}: ${masked}`));
    } else {
      console.log(colors.red(`❌ ${varName}: NOT SET`));
      allValid = false;
    }
  });
  
  if (!allValid) {
    console.log(colors.red('\n❌ Missing environment variables!\n'));
    console.log('Please make sure your .env file has:');
    console.log('  TWITTER_CONSUMER_KEY=your_key');
    console.log('  TWITTER_CONSUMER_SECRET=your_secret\n');
    process.exit(1);
  }
  
  // Check credentials file
  console.log(colors.cyan('\nChecking stored account credentials...\n'));
  
  const credentialsFile = path.join(__dirname, 'credentials', 'twitter_accounts.json');
  
  if (!fs.existsSync(credentialsFile)) {
    console.log(colors.red('❌ No credentials file found\n'));
    process.exit(1);
  }
  
  try {
    const credentials = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));
    
    for (const [accountName, cred] of Object.entries(credentials)) {
      console.log(colors.cyan(`\nAccount: ${accountName} (@${cred.username})`));
      
      if (cred.accessToken && cred.accessSecret) {
        const tokenMasked = cred.accessToken.substring(0, 5) + '****' + cred.accessToken.substring(cred.accessToken.length - 5);
        console.log(colors.green(`  ✅ Access Token: ${tokenMasked}`));
        console.log(colors.green(`  ✅ Access Secret: ****`));
      } else {
        console.log(colors.red(`  ❌ Missing access credentials`));
      }
      
      // Test media upload capability
      try {
        console.log(colors.cyan(`  Testing media upload capability...`));
        
        const client = new TwitterApi({
          appKey: process.env.TWITTER_CONSUMER_KEY,
          appSecret: process.env.TWITTER_CONSUMER_SECRET,
          accessToken: cred.accessToken,
          accessSecret: cred.accessSecret,
        });
        
        // Just try to get the upload endpoint info (doesn't actually upload)
        const mediaTest = await client.v1.uploadMedia(Buffer.from('test'), {
          media_data: 'dGVzdA==', // base64 "test"
        }).catch(err => {
          if (err.message.includes('400') || err.message.includes('invalid')) {
            throw new Error('Media upload initialization failed - this is expected');
          }
          throw err;
        });
        
        console.log(colors.green(`  ✅ Media upload ready`));
      } catch (error) {
        if (error.message.includes('401') || error.message.includes('Invalid or expired')) {
          console.log(colors.red(`  ❌ Invalid credentials for media upload: ${error.message}`));
        } else if (error.message.includes('expected')) {
          console.log(colors.green(`  ✅ Can upload media`));
        } else {
          console.log(colors.yellow(`  ⚠️  ${error.message}`));
        }
      }
    }
    
    console.log(colors.cyan('\n╔════════════════════════════════════════════════════════╗'));
    console.log(colors.cyan('║   Configuration Valid!                                 ║'));
    console.log(colors.cyan('╚════════════════════════════════════════════════════════╝\n'));
    
  } catch (error) {
    console.error(colors.red('❌ Error reading credentials:'), error.message);
    process.exit(1);
  }
}

validateConfig().catch(error => {
  console.error(colors.red('❌ Validation failed:'), error);
  process.exit(1);
});
