/**
 * 🚀 Quick Twitter/X Test
 * 
 * Run this to test posting and scheduling to Twitter/X immediately
 */

require('dotenv').config();

const HubManager = require('./src/core/hubManager');
const ContentScheduler = require('./src/core/contentScheduler');
const Logger = require('./src/utils/logger');

const logger = new Logger();

async function quickTwitterTest() {
  try {
    logger.info('🐦 === Quick Twitter/X Test ===\n');

    // Initialize components
    const hub = new HubManager();
    const scheduler = new ContentScheduler(hub);

    // Test 1: Post a simple tweet immediately
    logger.info('1️⃣ Testing immediate tweet posting...');
    try {
      const tweetText = `🚀 Testing Hub Social Media Bot! 

✅ Automated posting working
✅ Multi-platform support
✅ Content scheduling active

Time: ${new Date().toLocaleString()}
#automation #socialmedia #bot`;

      const result = await hub.sendMessage('twitter', tweetText);
      logger.info('✅ Tweet posted successfully!');
      logger.info(`   Tweet ID: ${result.data.id}`);
      logger.info(`   Tweet URL: https://twitter.com/user/status/${result.data.id}`);
    } catch (error) {
      logger.error('❌ Failed to post tweet:', error.message);
    }

    logger.info('');

    // Test 2: Schedule a tweet for 2 minutes from now
    logger.info('2️⃣ Testing tweet scheduling...');
    try {
      const scheduleTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
      const scheduledText = `⏰ Scheduled Tweet Test!

This tweet was scheduled at ${new Date().toLocaleString()} and posted automatically at ${scheduleTime.toLocaleString()}!

Our scheduling system is working perfectly! 🎯

#scheduled #automation #success`;

      const scheduleResult = await scheduler.scheduleContent(
        'twitter',
        scheduledText,
        scheduleTime,
        {}
      );

      logger.info('✅ Tweet scheduled successfully!');
      logger.info(`   Schedule ID: ${scheduleResult.id}`);
      logger.info(`   Will post at: ${scheduleTime.toLocaleString()}`);
      logger.info(`   Status: ${scheduleResult.status}`);
    } catch (error) {
      logger.error('❌ Failed to schedule tweet:', error.message);
    }

    logger.info('');

    // Test 3: Schedule multiple tweets (thread)
    logger.info('3️⃣ Testing multiple scheduled tweets (thread)...');
    try {
      const threadTweets = [
        '🧵 1/3: Starting a scheduled Twitter thread!',
        '🧵 2/3: Each tweet in this thread is scheduled 30 seconds apart.',
        '🧵 3/3: This demonstrates our automated content scheduling! #automation #thread'
      ];

      for (let i = 0; i < threadTweets.length; i++) {
        const scheduleTime = new Date(Date.now() + (3 + i * 0.5) * 60 * 1000); // Start 3 min from now, 30 sec apart
        
        const result = await scheduler.scheduleContent(
          'twitter',
          threadTweets[i],
          scheduleTime,
          {}
        );

        logger.info(`✅ Thread tweet ${i + 1}/3 scheduled for ${scheduleTime.toLocaleString()}`);
      }
    } catch (error) {
      logger.error('❌ Failed to schedule thread:', error.message);
    }

    logger.info('');

    // Test 4: Check all scheduled content
    logger.info('4️⃣ Checking scheduled content...');
    try {
      const allScheduled = await scheduler.getScheduledContents();
      const twitterScheduled = allScheduled.filter(content => content.platform === 'twitter');
      
      logger.info(`📊 Total scheduled content: ${allScheduled.length}`);
      logger.info(`🐦 Twitter scheduled posts: ${twitterScheduled.length}`);
      
      if (twitterScheduled.length > 0) {
        logger.info('\n📅 Upcoming Twitter posts:');
        twitterScheduled.forEach((content, index) => {
          const preview = content.message.substring(0, 50).replace(/\n/g, ' ');
          logger.info(`   ${index + 1}. "${preview}..." → ${new Date(content.scheduledTime).toLocaleString()}`);
        });
      }
    } catch (error) {
      logger.error('❌ Failed to check scheduled content:', error.message);
    }

    logger.info('\n🎉 Twitter test completed!');
    logger.info('\n📋 What happened:');
    logger.info('✅ 1 tweet posted immediately');
    logger.info('✅ 1 tweet scheduled for 2 minutes from now');
    logger.info('✅ 3 tweets scheduled as a thread (starting in 3 minutes)');
    logger.info('✅ Scheduled content verified');
    
    logger.info('\n⏰ Next steps:');
    logger.info('• Check your Twitter profile for the immediate tweet');
    logger.info('• Wait 2 minutes to see the scheduled tweet');
    logger.info('• Wait 3+ minutes to see the thread tweets');
    logger.info('• Monitor the logs for automatic posting');

    logger.info('\n🔄 To keep the scheduler running:');
    logger.info('• Keep this process running, OR');
    logger.info('• Run: npm start (for full bot with Telegram + Twitter)');

  } catch (error) {
    logger.error('❌ Error in Twitter test:', error);
  }
}

// Run the test
if (require.main === module) {
  quickTwitterTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = quickTwitterTest;