const schedule = require('node-schedule');
const ContentRepository = require('../database/repository');

class ContentScheduler {
  constructor(hubManager) {
    this.hubManager = hubManager;
    this.repository = new ContentRepository();
    this.jobs = new Map(); // Track scheduled jobs for cancellation
  }

  async scheduleContent(platform, message, scheduledTime, options = {}) {
    // Save to database first and get the content ID
    const savedContent = await this.repository.saveScheduledContent(platform, message, scheduledTime, options);

    // Schedule the job
    const job = schedule.scheduleJob(scheduledTime, async () => {
      try {
        await this.hubManager.sendMessage(platform, message, options);
        await this.repository.updateContentStatus(savedContent.id, 'sent');
      } catch (error) {
        await this.repository.updateContentStatus(savedContent.id, 'failed');
        throw error;
      } finally {
        this.jobs.delete(savedContent.id);
      }
    });

    // Store job reference for potential cancellation
    this.jobs.set(savedContent.id, job);

    return savedContent;
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
}

module.exports = ContentScheduler;