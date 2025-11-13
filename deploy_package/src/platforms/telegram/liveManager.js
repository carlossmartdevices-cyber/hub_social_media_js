const TelegramAPIClient = require('./apiClient');
const TelegramMessageManager = require('./messageManager');
const Logger = require('../../utils/logger');

class TelegramLiveManager {
  constructor() {
    this.apiClient = new TelegramAPIClient();
    this.messageManager = new TelegramMessageManager();
    this.logger = new Logger();
    this.activeLiveStreams = new Map(); // Track active live streams
  }

  async startLiveStream(chatId, options = {}) {
    try {
      const {
        title = 'Live Stream',
        description = '',
        autoPin = true,
        notifySubscribers = true,
        createInviteLink = false
      } = options;

      // Check if chat exists and bot has permissions
      const chatInfo = await this.apiClient.getChatInfo(chatId);
      
      if (!chatInfo) {
        throw new Error(`Chat ${chatId} not found or bot doesn't have access`);
      }

      // Send live stream announcement
      const result = await this.apiClient.startLive({
        chatId,
        title,
        description
      });

      // Pin the announcement message if requested
      if (autoPin && result.messageId) {
        try {
          await this.apiClient.pinMessage(chatId, result.messageId, !notifySubscribers);
        } catch (pinError) {
          this.logger.warn(`Could not pin live stream message in chat ${chatId}`, pinError);
        }
      }

      // Create invite link if requested
      let inviteLink = null;
      if (createInviteLink) {
        try {
          const linkResult = await this.apiClient.createChatInviteLink(chatId, {
            name: `Live Stream: ${title}`,
            memberLimit: 99999 // Maximum allowed
          });
          inviteLink = linkResult.invite_link;
        } catch (linkError) {
          this.logger.warn(`Could not create invite link for chat ${chatId}`, linkError);
        }
      }

      // Store live stream info
      const liveStreamInfo = {
        chatId,
        title,
        description,
        startTime: new Date(),
        messageId: result.messageId,
        inviteLink,
        status: 'active',
        participantCount: 0
      };

      this.activeLiveStreams.set(chatId, liveStreamInfo);

      this.logger.info(`Live stream started in Telegram chat ${chatId}: ${title}`);

      return {
        success: true,
        liveStreamId: chatId,
        messageId: result.messageId,
        inviteLink,
        chatInfo: {
          id: chatInfo.id,
          title: chatInfo.title || chatInfo.first_name,
          type: chatInfo.type
        }
      };

    } catch (error) {
      this.logger.error(`Failed to start live stream in Telegram chat ${chatId}`, error);
      throw error;
    }
  }

  async endLiveStream(chatId, options = {}) {
    try {
      const { sendEndMessage = true, unpinAnnouncement = true } = options;

      const liveStreamInfo = this.activeLiveStreams.get(chatId);
      
      if (!liveStreamInfo) {
        throw new Error(`No active live stream found for chat ${chatId}`);
      }

      // Send end message
      if (sendEndMessage) {
        const duration = this.formatDuration(new Date() - liveStreamInfo.startTime);
        const endMessage = `🔴 <b>Live Stream Ended</b>\n\n` +
                          `<b>Title:</b> ${liveStreamInfo.title}\n` +
                          `<b>Duration:</b> ${duration}\n\n` +
                          `<i>Thank you for watching!</i>`;

        await this.messageManager.sendTextMessage(chatId, endMessage, {
          parseMode: 'HTML'
        });
      }

      // Unpin announcement if requested
      if (unpinAnnouncement && liveStreamInfo.messageId) {
        try {
          await this.apiClient.unpinMessage(chatId, liveStreamInfo.messageId);
        } catch (unpinError) {
          this.logger.warn(`Could not unpin live stream message in chat ${chatId}`, unpinError);
        }
      }

      // Update status and remove from active streams
      liveStreamInfo.status = 'ended';
      liveStreamInfo.endTime = new Date();
      this.activeLiveStreams.delete(chatId);

      this.logger.info(`Live stream ended in Telegram chat ${chatId}`);

      return {
        success: true,
        liveStreamId: chatId,
        duration: liveStreamInfo.endTime - liveStreamInfo.startTime,
        endTime: liveStreamInfo.endTime
      };

    } catch (error) {
      this.logger.error(`Failed to end live stream in Telegram chat ${chatId}`, error);
      throw error;
    }
  }

  async updateLiveStreamInfo(chatId, updates = {}) {
    try {
      const liveStreamInfo = this.activeLiveStreams.get(chatId);
      
      if (!liveStreamInfo) {
        throw new Error(`No active live stream found for chat ${chatId}`);
      }

      const { title, description, participantCount } = updates;

      // Update local info
      if (title) liveStreamInfo.title = title;
      if (description) liveStreamInfo.description = description;
      if (participantCount !== undefined) liveStreamInfo.participantCount = participantCount;

      // Update the announcement message if title or description changed
      if ((title || description) && liveStreamInfo.messageId) {
        const updatedMessage = `🔴 <b>Live Stream Active</b>\n\n` +
                              `<b>Title:</b> ${liveStreamInfo.title}\n` +
                              (liveStreamInfo.description ? `<b>Description:</b> ${liveStreamInfo.description}\n` : '') +
                              `<b>Participants:</b> ${liveStreamInfo.participantCount}\n\n` +
                              `<i>Join the live stream now!</i>`;

        try {
          await this.messageManager.editMessage(chatId, liveStreamInfo.messageId, updatedMessage, {
            parseMode: 'HTML'
          });
        } catch (editError) {
          this.logger.warn(`Could not update live stream message in chat ${chatId}`, editError);
        }
      }

      this.activeLiveStreams.set(chatId, liveStreamInfo);

      this.logger.info(`Live stream info updated for Telegram chat ${chatId}`);

      return {
        success: true,
        liveStreamInfo: { ...liveStreamInfo }
      };

    } catch (error) {
      this.logger.error(`Failed to update live stream info for Telegram chat ${chatId}`, error);
      throw error;
    }
  }

  async getLiveStreamInfo(chatId) {
    try {
      const liveStreamInfo = this.activeLiveStreams.get(chatId);
      
      if (!liveStreamInfo) {
        return {
          success: false,
          message: `No active live stream found for chat ${chatId}`
        };
      }

      return {
        success: true,
        liveStreamInfo: { ...liveStreamInfo },
        duration: new Date() - liveStreamInfo.startTime
      };

    } catch (error) {
      this.logger.error(`Failed to get live stream info for Telegram chat ${chatId}`, error);
      throw error;
    }
  }

  async getAllActiveLiveStreams() {
    try {
      const activeStreams = Array.from(this.activeLiveStreams.values()).map(stream => ({
        ...stream,
        currentDuration: new Date() - stream.startTime
      }));

      return {
        success: true,
        count: activeStreams.length,
        liveStreams: activeStreams
      };

    } catch (error) {
      this.logger.error('Failed to get all active live streams', error);
      throw error;
    }
  }

  async sendLiveUpdate(chatId, updateMessage, options = {}) {
    try {
      const liveStreamInfo = this.activeLiveStreams.get(chatId);
      
      if (!liveStreamInfo) {
        throw new Error(`No active live stream found for chat ${chatId}`);
      }

      const { pinUpdate = false, replyToAnnouncement = true } = options;

      const fullMessage = `📢 <b>Live Update</b>\n\n${updateMessage}`;

      const sendOptions = {
        parseMode: 'HTML'
      };

      if (replyToAnnouncement && liveStreamInfo.messageId) {
        sendOptions.replyToMessageId = liveStreamInfo.messageId;
      }

      const result = await this.messageManager.sendTextMessage(chatId, fullMessage, sendOptions);

      if (pinUpdate && result.message_id) {
        try {
          await this.apiClient.pinMessage(chatId, result.message_id, false);
        } catch (pinError) {
          this.logger.warn(`Could not pin live update in chat ${chatId}`, pinError);
        }
      }

      this.logger.info(`Live update sent to Telegram chat ${chatId}`);

      return result;

    } catch (error) {
      this.logger.error(`Failed to send live update to Telegram chat ${chatId}`, error);
      throw error;
    }
  }

  async createLiveStreamInvite(chatId, options = {}) {
    try {
      const liveStreamInfo = this.activeLiveStreams.get(chatId);
      
      if (!liveStreamInfo) {
        throw new Error(`No active live stream found for chat ${chatId}`);
      }

      const {
        memberLimit = 99999,
        expireDate,
        name = `Live Stream: ${liveStreamInfo.title}`
      } = options;

      const inviteResult = await this.apiClient.createChatInviteLink(chatId, {
        name,
        memberLimit,
        expireDate
      });

      this.logger.info(`Live stream invite created for Telegram chat ${chatId}`);

      return {
        success: true,
        inviteLink: inviteResult.invite_link,
        linkInfo: inviteResult
      };

    } catch (error) {
      this.logger.error(`Failed to create live stream invite for Telegram chat ${chatId}`, error);
      throw error;
    }
  }

  // Helper method to format duration
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Helper method to validate live stream options
  validateLiveStreamOptions(options) {
    const validatedOptions = { ...options };
    
    if (validatedOptions.title && typeof validatedOptions.title !== 'string') {
      throw new Error('Live stream title must be a string');
    }
    
    if (validatedOptions.description && typeof validatedOptions.description !== 'string') {
      throw new Error('Live stream description must be a string');
    }

    return validatedOptions;
  }
}

module.exports = TelegramLiveManager;