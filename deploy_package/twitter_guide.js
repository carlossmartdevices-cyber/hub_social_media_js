/**
 * 🐦 Twitter/X Posting and Scheduling Guide
 * 
 * Complete guide on how to post to X (Twitter) and schedule posts
 * using the Hub Social Media system
 */

const HubManager = require('./src/core/hubManager');
const ContentScheduler = require('./src/core/contentScheduler');
const TwitterAPIClient = require('./src/platforms/twitter/apiClient');
const Logger = require('./src/utils/logger');

const logger = new Logger();

async function twitterExamples() {
  try {
    logger.info('=== 🐦 Twitter/X Posting Guide ===\n');

    // Check if Twitter is configured
    if (!process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_TOKEN_SECRET) {
      logger.error('❌ Twitter OAuth 1.0a credentials not configured!');
      logger.info('Please add these to your .env file:');
      logger.info('TWITTER_ACCESS_TOKEN=your_access_token');
      logger.info('TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret');
      return;
    }

    const hub = new HubManager();
    const scheduler = new ContentScheduler(hub);

    logger.info('✅ Twitter is properly configured with OAuth 1.0a credentials\n');

    // Example 1: Simple Tweet
    logger.info('📝 Example 1: Posting a simple tweet');
    try {
      const result1 = await hub.sendMessage('twitter', 
        'Hello from Hub Social Media! 🚀 Testing our automated posting system. #automation #socialmedia'
      );
      logger.info('✅ Tweet posted successfully!');
      logger.info(`Tweet ID: ${result1.data.id}`);
      logger.info(`Tweet Text: ${result1.data.text}`);
    } catch (error) {
      logger.warn('⚠ Skipping tweet post:', error.message);
    }

    logger.info('\n' + '='.repeat(60) + '\n');

    // Example 2: Tweet with formatting
    logger.info('📝 Example 2: Tweet with special formatting');
    try {
      const tweetText = `🎯 Key Features of our Hub Social Media Bot:

✅ Multi-platform posting
✅ Content scheduling  
✅ Telegram integration
✅ Error handling
✅ Bilingual support

#socialmedia #automation #bot #telegram #twitter`;

      const result2 = await hub.sendMessage('twitter', tweetText);
      logger.info('✅ Formatted tweet posted successfully!');
      logger.info(`Tweet ID: ${result2.data.id}`);
    } catch (error) {
      logger.warn('⚠ Skipping formatted tweet:', error.message);
    }

    logger.info('\n' + '='.repeat(60) + '\n');

    // Example 3: Scheduled Tweet (1 minute from now)
    logger.info('⏰ Example 3: Scheduling a tweet for 1 minute from now');
    try {
      const scheduledTime = new Date(Date.now() + 60000); // 1 minute from now
      const scheduledTweet = `⏰ This is a scheduled tweet posted at ${new Date().toLocaleString()}! 

Our scheduling system is working perfectly. #scheduled #automation`;

      const scheduleResult = await scheduler.scheduleContent(
        'twitter',
        scheduledTweet,
        scheduledTime,
        {}
      );

      logger.info('✅ Tweet scheduled successfully!');
      logger.info(`Scheduled for: ${scheduledTime}`);
      logger.info(`Schedule ID: ${scheduleResult.id}`);
    } catch (error) {
      logger.warn('⚠ Skipping scheduled tweet:', error.message);
    }

    logger.info('\n' + '='.repeat(60) + '\n');

    // Example 4: Multiple scheduled tweets
    logger.info('📅 Example 4: Scheduling multiple tweets (every 30 seconds for 2 minutes)');
    try {
      const now = new Date();
      const tweetSeries = [
        '🧵 Thread 1/4: Welcome to our Twitter automation series!',
        '🧵 Thread 2/4: We can schedule multiple tweets in sequence.',
        '🧵 Thread 3/4: Each tweet is posted automatically at the scheduled time.',
        '🧵 Thread 4/4: This makes content management much easier! #automation'
      ];

      for (let i = 0; i < tweetSeries.length; i++) {
        const scheduleTime = new Date(now.getTime() + (i + 1) * 30000); // Every 30 seconds
        
        const result = await scheduler.scheduleContent(
          'twitter',
          tweetSeries[i],
          scheduleTime,
          {}
        );

        logger.info(`✅ Tweet ${i + 1}/4 scheduled for ${scheduleTime}`);
      }
    } catch (error) {
      logger.warn('⚠ Error in tweet series scheduling:', error.message);
    }

    logger.info('\n' + '='.repeat(60) + '\n');

    // Example 5: Tweet with mentions and hashtags  
    logger.info('🏷️ Example 5: Tweet with mentions and hashtags');
    try {
      const mentionTweet = `Shoutout to the amazing #developer community! 👨‍💻👩‍💻

Building social media automation tools with:
🐦 Twitter API v2
📱 Telegram Bot API  
🗄️ PostgreSQL
⚡ Node.js

#coding #socialmedia #automation #api #nodejs #postgresql`;

      const result5 = await hub.sendMessage('twitter', mentionTweet);
      logger.info('✅ Tweet with mentions and hashtags posted!');
      logger.info(`Tweet ID: ${result5.data.id}`);
    } catch (error) {
      logger.warn('⚠ Skipping mention tweet:', error.message);
    }

    logger.info('\n' + '='.repeat(60) + '\n');

    // Example 6: Check scheduled content
    logger.info('📋 Example 6: Checking scheduled content');
    try {
      const scheduledContent = await scheduler.getScheduledContents();
      logger.info(`📊 Total scheduled content: ${scheduledContent.length}`);
      
      const twitterScheduled = scheduledContent.filter(content => content.platform === 'twitter');
      logger.info(`🐦 Twitter scheduled posts: ${twitterScheduled.length}`);
      
      twitterScheduled.forEach((content, index) => {
        logger.info(`   ${index + 1}. ${content.message.substring(0, 50)}... (${content.scheduledTime})`);
      });
    } catch (error) {
      logger.warn('⚠ Error checking scheduled content:', error.message);
    }

    logger.info('\n' + '='.repeat(60) + '\n');
    logger.info('🎉 Twitter/X posting examples completed!');

  } catch (error) {
    logger.error('Error in Twitter examples:', error);
  }
}

// Comprehensive usage guide
function printUsageGuide() {
  console.log(`
🐦 === TWITTER/X POSTING & SCHEDULING GUIDE === 🐦

📋 PREREQUISITES:
1. Twitter Developer Account
2. OAuth 1.0a credentials (Access Token & Secret)
3. Properly configured .env file

🔑 REQUIRED ENVIRONMENT VARIABLES:
Add these to your .env file:

# Twitter OAuth 1.0a (Required for posting)
TWITTER_CONSUMER_KEY=your_consumer_key
TWITTER_CONSUMER_SECRET=your_consumer_secret  
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret

# Optional: OAuth 2.0 (Read-only)
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
TWITTER_BEARER_TOKEN=your_bearer_token

📝 HOW TO POST TO TWITTER/X:

1. SIMPLE POST:
   const hub = new HubManager();
   await hub.sendMessage('twitter', 'Your tweet text here!');

2. POST WITH HUB MANAGER:
   const hub = new HubManager();
   const result = await hub.sendMessage('twitter', 'Hello Twitter! 🐦');
   console.log('Tweet ID:', result.data.id);

3. DIRECT API CLIENT:
   const twitterClient = new TwitterAPIClient();
   const tweet = await twitterClient.sendMessage('Hello from API!');

⏰ HOW TO SCHEDULE POSTS:

1. SCHEDULE SINGLE POST:
   const scheduler = new ContentScheduler(hub);
   const scheduleTime = new Date(Date.now() + 3600000); // 1 hour from now
   
   await scheduler.scheduleContent(
     'twitter',
     'This is a scheduled tweet!',
     scheduleTime,
     {}
   );

2. SCHEDULE MULTIPLE POSTS:
   const tweets = ['Tweet 1', 'Tweet 2', 'Tweet 3'];
   
   for (let i = 0; i < tweets.length; i++) {
     const scheduleTime = new Date(Date.now() + (i + 1) * 60000); // Every minute
     await scheduler.scheduleContent('twitter', tweets[i], scheduleTime, {});
   }

3. CHECK SCHEDULED CONTENT:
   const scheduled = await scheduler.getScheduledContents();
   const twitterPosts = scheduled.filter(post => post.platform === 'twitter');

🎯 BEST PRACTICES:

✅ Character Limit: Twitter has 280 character limit (auto-adapted)
✅ Rate Limiting: Twitter allows 300 tweets per 3-hour window
✅ Hashtags: Use relevant hashtags for better reach
✅ Mentions: Tag users with @username format
✅ Emojis: Use emojis to make tweets more engaging
✅ Scheduling: Schedule during peak engagement hours
✅ Content: Share valuable, original content

🚫 AVOID:
❌ Spam posting (too many tweets too quickly)
❌ Duplicate content (Twitter may flag it)
❌ Excessive hashtags (max 2-3 per tweet)
❌ Posting without OAuth 1.0a credentials

📊 TWITTER API LIMITS:
• 300 tweets per 3-hour window (per user)
• 50 tweets per day via API
• Media uploads: 5MB images, 512MB videos
• Tweet length: 280 characters

🔧 TROUBLESHOOTING:

Error: "Tweet posting requires OAuth 1.0a credentials"
→ Add TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_TOKEN_SECRET to .env

Error: "Twitter API error: Unauthorized"  
→ Check your credentials are correct and active

Error: "Rate limit exceeded"
→ Wait for rate limit to reset (check headers)

Error: "Duplicate content"
→ Twitter blocks identical tweets, make content unique

🎉 SUCCESS INDICATORS:
✅ Tweet posted successfully
✅ Tweet ID returned
✅ No error messages
✅ Tweet visible on your Twitter profile

📱 TESTING:
1. Run: node twitter_examples.js
2. Check your Twitter profile for posted tweets  
3. Wait for scheduled tweets to post automatically
4. Monitor logs for success/error messages

🔄 AUTOMATION WORKFLOW:
1. Create content
2. Schedule posts using ContentScheduler
3. Bot automatically posts at scheduled times
4. Monitor success in logs and database
5. Track engagement on Twitter

For more examples, run: node twitter_examples.js
For bilingual support, check: BILINGUAL_README.md
For complete documentation, see: TELEGRAM_README.md
  `);
}

// Show configuration status
function checkTwitterConfiguration() {
  console.log('🔍 === TWITTER CONFIGURATION CHECK ===\n');
  
  const requiredVars = [
    'TWITTER_CONSUMER_KEY',
    'TWITTER_CONSUMER_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_TOKEN_SECRET'
  ];
  
  const optionalVars = [
    'TWITTER_CLIENT_ID',
    'TWITTER_CLIENT_SECRET', 
    'TWITTER_BEARER_TOKEN'
  ];
  
  console.log('📋 Required Variables (for posting):');
  requiredVars.forEach(varName => {
    const status = process.env[varName] ? '✅' : '❌';
    const value = process.env[varName] ? 'Configured' : 'Missing';
    console.log(`${status} ${varName}: ${value}`);
  });
  
  console.log('\n📋 Optional Variables (for read-only):');
  optionalVars.forEach(varName => {
    const status = process.env[varName] ? '✅' : '⚪';
    const value = process.env[varName] ? 'Configured' : 'Not set';
    console.log(`${status} ${varName}: ${value}`);
  });
  
  const canPost = requiredVars.every(varName => process.env[varName]);
  console.log(`\n🎯 Posting Status: ${canPost ? '✅ Ready to post!' : '❌ Cannot post - missing credentials'}`);
  
  if (!canPost) {
    console.log('\n🔧 To enable posting, add these to your .env file:');
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        console.log(`${varName}=your_${varName.toLowerCase()}_here`);
      }
    });
  }
}

// Run examples based on command line argument
if (require.main === module) {
  const command = process.argv[2] || 'guide';
  
  switch (command) {
    case 'examples':
    case 'test':
      twitterExamples();
      break;
    case 'config':
    case 'check':
      checkTwitterConfiguration();
      break;
    case 'guide':
    case 'help':
    default:
      printUsageGuide();
      break;
  }
}

module.exports = {
  twitterExamples,
  printUsageGuide,
  checkTwitterConfiguration
};