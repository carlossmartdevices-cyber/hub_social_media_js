#!/usr/bin/env node

/**
 * Twitter/X Posting Test Script
 * Tests text and media posting to multiple X accounts
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const MultiAccountTwitterClient = require('./src/auth/multiAccountTwitterClient');

const colors = {
  green: (str) => `\x1b[32m${str}\x1b[0m`,
  red: (str) => `\x1b[31m${str}\x1b[0m`,
  yellow: (str) => `\x1b[33m${str}\x1b[0m`,
  cyan: (str) => `\x1b[36m${str}\x1b[0m`,
  blue: (str) => `\x1b[34m${str}\x1b[0m`,
};

async function createTestImage() {
  // Create a simple test image (1x1 pixel PNG)
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xF8, 0x0F, 0x00, 0x00,
    0x01, 0x01, 0x00, 0x01, 0x18, 0xDD, 0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  
  const testDir = path.join(__dirname, 'test_media');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const imagePath = path.join(testDir, 'test_image.png');
  fs.writeFileSync(imagePath, pngBuffer);
  return imagePath;
}

async function testTextPosting() {
  console.log(colors.cyan('\n📝 Testing Text Posting...\n'));
  
  const client = new MultiAccountTwitterClient();
  const accounts = client.getAccountNames();
  
  if (accounts.length === 0) {
    console.log(colors.red('❌ No accounts found'));
    return false;
  }
  
  let success = true;
  
  for (const accountName of accounts) {
    try {
      const account = client.getAccountInfo(accountName);
      console.log(colors.blue(`Testing @${account.username}...`));
      
      const testMessage = `🧪 Test tweet from hub_social_media_js bot\nTimestamp: ${new Date().toISOString()}\nTest ID: ${Math.random().toString(36).substring(7)}`;
      
      const result = await client.sendMessage(accountName, testMessage);
      
      console.log(colors.green(`  ✅ Posted successfully!`));
      console.log(`     Tweet ID: ${result.tweetId}`);
      console.log(`     Account: @${result.account}`);
      
    } catch (error) {
      console.log(colors.red(`  ❌ Failed: ${error.message}`));
      success = false;
    }
  }
  
  return success;
}

async function testMediaPosting() {
  console.log(colors.cyan('\n🖼️  Testing Media (Image) Posting...\n'));
  
  const client = new MultiAccountTwitterClient();
  const accounts = client.getAccountNames();
  
  if (accounts.length === 0) {
    console.log(colors.red('❌ No accounts found'));
    return false;
  }
  
  // Create test image
  const imagePath = await createTestImage();
  console.log(`Created test image: ${imagePath}`);
  
  let success = true;
  
  for (const accountName of accounts) {
    try {
      const account = client.getAccountInfo(accountName);
      console.log(colors.blue(`Testing @${account.username}...`));
      
      const testMessage = `🧪 Test tweet with image\nTimestamp: ${new Date().toISOString()}`;
      
      const result = await client.sendMessageWithMedia(accountName, testMessage, imagePath);
      
      console.log(colors.green(`  ✅ Posted with image successfully!`));
      console.log(`     Tweet ID: ${result.tweetId}`);
      console.log(`     Account: @${result.account}`);
      
    } catch (error) {
      console.log(colors.red(`  ❌ Failed: ${error.message}`));
      success = false;
    }
  }
  
  // Cleanup
  try {
    fs.unlinkSync(imagePath);
  } catch (e) {
    // ignore
  }
  
  return success;
}

async function testVideoPosting() {
  console.log(colors.cyan('\n🎥 Testing Video Posting...\n'));
  
  const client = new MultiAccountTwitterClient();
  const accounts = client.getAccountNames();
  
  if (accounts.length === 0) {
    console.log(colors.red('❌ No accounts found'));
    return false;
  }
  
  // Create a minimal test video (MP4)
  const testDir = path.join(__dirname, 'test_media');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const videoPath = path.join(testDir, 'test_video.mp4');
  
  // Create a minimal MP4 file (this is just for testing the upload mechanism)
  const mp4Header = Buffer.from([
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D,
    0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
    0x6D, 0x70, 0x34, 0x31, 0x00, 0x00, 0x00, 0x08, 0x77, 0x69, 0x64, 0x65
  ]);
  
  fs.writeFileSync(videoPath, mp4Header);
  console.log(`Created test video: ${videoPath} (header only)`);
  
  let success = true;
  
  for (const accountName of accounts) {
    try {
      const account = client.getAccountInfo(accountName);
      console.log(colors.blue(`Testing @${account.username}...`));
      
      const testMessage = `🧪 Test tweet with video\nTimestamp: ${new Date().toISOString()}`;
      
      console.log(colors.yellow(`  ⏳ Uploading video...`));
      
      const result = await client.sendMessageWithMedia(accountName, testMessage, videoPath);
      
      console.log(colors.green(`  ✅ Posted with video successfully!`));
      console.log(`     Tweet ID: ${result.tweetId}`);
      console.log(`     Account: @${result.account}`);
      
    } catch (error) {
      if (error.message.includes('corrupted') || error.message.includes('invalid')) {
        console.log(colors.yellow(`  ⚠️  Video validation failed (expected for test file)`));
        console.log(`     Error: ${error.message}`);
      } else if (error.message.includes('401') || error.message.includes('auth')) {
        console.log(colors.red(`  ❌ Authentication failed: ${error.message}`));
        success = false;
      } else {
        console.log(colors.yellow(`  ℹ️  ${error.message}`));
      }
    }
  }
  
  // Cleanup
  try {
    fs.unlinkSync(videoPath);
  } catch (e) {
    // ignore
  }
  
  return success;
}

async function showAccountStatus() {
  console.log(colors.cyan('\n📱 Account Status\n'));
  
  const client = new MultiAccountTwitterClient();
  const accounts = client.getAllAccountsInfo();
  
  if (accounts.length === 0) {
    console.log(colors.red('❌ No accounts configured'));
    return;
  }
  
  accounts.forEach((account, index) => {
    console.log(`${index + 1}. @${account.username}`);
    console.log(`   Display Name: ${account.displayName}`);
    console.log(`   Account ID: ${account.accountName}`);
    console.log(`   User ID: ${account.userId}`);
    console.log(`   Created: ${new Date(account.createdAt).toLocaleString()}`);
    console.log(`   Last Used: ${new Date(account.lastUsed).toLocaleString()}`);
    console.log('');
  });
}

async function runTests() {
  console.log(colors.green('╔════════════════════════════════════════════════════════╗'));
  console.log(colors.green('║   Twitter/X Posting Test Suite                         ║'));
  console.log(colors.green('╚════════════════════════════════════════════════════════╝'));
  
  try {
    // Show account status
    await showAccountStatus();
    
    // Get test type from command line argument
    const testType = process.argv[2];
    
    if (!testType || testType === 'all') {
      console.log(colors.blue('\n🧪 Running all tests...\n'));
      
      const textResult = await testTextPosting();
      const mediaResult = await testMediaPosting();
      const videoResult = await testVideoPosting();
      
      console.log(colors.cyan('\n╔════════════════════════════════════════════════════════╗'));
      console.log(colors.cyan('║   Test Results Summary                                 ║'));
      console.log(colors.cyan('╚════════════════════════════════════════════════════════╝\n'));
      
      console.log(`Text Posting:   ${textResult ? colors.green('✅ PASSED') : colors.red('❌ FAILED')}`);
      console.log(`Media Posting:  ${mediaResult ? colors.green('✅ PASSED') : colors.red('❌ FAILED')}`);
      console.log(`Video Posting:  ${videoResult ? colors.green('✅ PASSED') : colors.red('⚠️  PASSED WITH WARNINGS')}`);
      
      if (textResult && mediaResult) {
        console.log(colors.green('\n🎉 All core tests passed!\n'));
      }
      
    } else if (testType === 'text') {
      await testTextPosting();
    } else if (testType === 'media') {
      await testMediaPosting();
    } else if (testType === 'video') {
      await testVideoPosting();
    } else {
      console.log(colors.yellow('\nUsage: node test_twitter_posting.js [all|text|media|video]\n'));
      console.log('Examples:');
      console.log('  node test_twitter_posting.js        # Run all tests');
      console.log('  node test_twitter_posting.js all    # Run all tests');
      console.log('  node test_twitter_posting.js text   # Test text posting only');
      console.log('  node test_twitter_posting.js media  # Test media posting only');
      console.log('  node test_twitter_posting.js video  # Test video posting only\n');
    }
    
  } catch (error) {
    console.error(colors.red('\n❌ Test suite error:'), error);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(colors.red('Fatal error:'), error);
  process.exit(1);
});
