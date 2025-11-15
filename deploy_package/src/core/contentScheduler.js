const schedule = require('node-schedule');
const ContentRepository = require('../database/repository');

class ContentScheduler {
  constructor(hubManager) {
    this.hubManager = hubManager;
    this.repository = new ContentRepository();
    this.jobs = new Map(); // Track scheduled jobs for cancellation
    
    // Auto-restore scheduled jobs on initialization
    this.restoreScheduledJobs().catch(error => {
      console.log('[SCHEDULER] Warning: Failed to restore jobs on startup:', error.message);
    });
  }

  async scheduleContent(platform, message, scheduledTime, options = {}) {
    console.log(`[SCHEDULER] Scheduling new content for ${platform} at ${scheduledTime}`);
    console.log(`[SCHEDULER] Content preview: "${message.substring(0, 50)}..."`);
    console.log(`[SCHEDULER] Has media: ${!!options.hasMedia}, Media path: ${options.mediaPath || 'none'}`);

    // Save to database first and get the content ID
    const savedContent = await this.repository.saveScheduledContent(platform, message, scheduledTime, options);
    console.log(`[SCHEDULER] Saved to database with ID: ${savedContent.id}`);

    // Schedule the job
    const job = schedule.scheduleJob(scheduledTime, async () => {
      console.log(`[SCHEDULER] ⏰ EXECUTING scheduled job ${savedContent.id} for ${platform}`);
      try {
        if (options.hasMedia && options.mediaPath) {
          // Handle media content
          console.log(`[SCHEDULER] Posting scheduled media content to ${platform}`);
          await this.postScheduledMediaContent(platform, message, options);
        } else {
          // Handle text-only content  
          console.log(`[SCHEDULER] Posting scheduled text content to ${platform}`);
          await this.hubManager.sendMessage(platform, message, options);
        }
        await this.repository.updateContentStatus(savedContent.id, 'sent');
        console.log(`[SCHEDULER] ✅ Job ${savedContent.id} completed successfully`);
      } catch (error) {
        console.log(`[SCHEDULER] ❌ Job ${savedContent.id} failed:`, error.message);
        await this.repository.updateContentStatus(savedContent.id, 'failed');
        throw error;
      } finally {
        this.jobs.delete(savedContent.id);
      }
    });

    // Store job reference for potential cancellation
    this.jobs.set(savedContent.id, job);
    console.log(`[SCHEDULER] Job scheduled successfully. Active jobs: ${this.jobs.size}`);

    return savedContent;
  }

  async postScheduledMediaContent(platform, message, options) {
    const fs = require('fs');
    
    // Check if media file still exists
    if (!fs.existsSync(options.mediaPath)) {
      throw new Error(`Media file not found: ${options.mediaPath}`);
    }

    try {
      if (platform === 'twitter') {
        // Use Twitter API client for media posts
        const TwitterAPIClient = require('../platforms/twitter/apiClient');
        const twitterClient = new TwitterAPIClient();
        
        if (message && message.trim()) {
          await twitterClient.sendMessageWithMedia(message, options.mediaPath);
        } else {
          // If no caption, post media only with a default message
          await twitterClient.sendMessageWithMedia('📅 Scheduled post', options.mediaPath);
        }
        
      } else if (platform === 'telegram') {
        // Use Telegram API for media posts
        const TelegramMessageManager = require('../platforms/telegram/messageManager');
        const telegramManager = new TelegramMessageManager();
        
        const chatId = process.env.TELEGRAM_DEFAULT_CHAT_ID;
        if (chatId) {
          if (options.mediaType === 'photo') {
            await telegramManager.sendPhoto(chatId, options.mediaPath, { caption: message });
          } else if (options.mediaType === 'video') {
            await telegramManager.sendVideo(chatId, options.mediaPath, { caption: message });
          } else {
            await telegramManager.sendDocument(chatId, options.mediaPath, { caption: message });
          }
        } else {
          throw new Error('Telegram chat ID not configured');
        }
        
      } else {
        throw new Error(`Media scheduling not supported for platform: ${platform}`);
      }
      
      console.log(`[SCHEDULER] Successfully posted scheduled media to ${platform}`);
      
    } finally {
      // Clean up the scheduled media file
      try {
        fs.unlinkSync(options.mediaPath);
        console.log(`[SCHEDULER] Cleaned up media file: ${options.mediaPath}`);
      } catch (cleanupError) {
        console.log(`[SCHEDULER] Warning: Could not clean up media file:`, cleanupError.message);
      }
    }
  }

  async cancelScheduledContent(contentId) {
    const job = this.jobs.get(contentId);
    if (job) {
      job.cancel();
      this.jobs.delete(contentId);
      await this.repository.updateContentStatus(contentId, 'cancelled');
      return true;
    }
    return false;
  }

  async getScheduledContents() {
    return this.repository.getScheduledContents();
  }

  async restoreScheduledJobs() {
    console.log('[SCHEDULER] Restoring scheduled jobs from database...');
    
    try {
      // Get all pending scheduled content from database
      const pendingJobs = await this.repository.getPendingScheduledContents();

      console.log(`[SCHEDULER] Found ${pendingJobs.length} pending jobs to restore`);

      let restoredCount = 0;
      for (const content of pendingJobs) {
        try {
          const scheduledTime = new Date(content.scheduledTime);
          console.log(`[SCHEDULER] Restoring job ${content.id} for ${scheduledTime}`);

          // Parse options from metadata
          let options = {};
          if (content.metadata) {
            try {
              options = JSON.parse(content.metadata);
            } catch (e) {
              console.log(`[SCHEDULER] Warning: Could not parse metadata for job ${content.id}`);
            }
          }

          // Schedule the restored job
          const job = schedule.scheduleJob(scheduledTime, async () => {
            console.log(`[SCHEDULER] Executing restored job ${content.id} for ${content.platform}`);
            try {
              if (options.hasMedia && options.mediaPath) {
                // Handle media content
                await this.postScheduledMediaContent(content.platform, content.message, options);
              } else {
                // Handle text-only content  
                await this.hubManager.sendMessage(content.platform, content.message, options);
              }
              await this.repository.updateContentStatus(content.id, 'sent');
              console.log(`[SCHEDULER] Job ${content.id} completed successfully`);
            } catch (error) {
              console.log(`[SCHEDULER] Job ${content.id} failed:`, error.message);
              await this.repository.updateContentStatus(content.id, 'failed');
            } finally {
              this.jobs.delete(content.id);
            }
          });

          // Store job reference for potential cancellation
          this.jobs.set(content.id, job);
          restoredCount++;

        } catch (error) {
          console.log(`[SCHEDULER] Failed to restore job ${content.id}:`, error.message);
        }
      }

      console.log(`[SCHEDULER] Successfully restored ${restoredCount} scheduled jobs`);
      return restoredCount;

    } catch (error) {
      console.log('[SCHEDULER] Error restoring scheduled jobs:', error.message);
      throw error;
    }
  }
}

module.exports = ContentScheduler;