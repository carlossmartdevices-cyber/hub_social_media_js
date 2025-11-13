class Validator {
  static validatePlatform(platform) {
    const validPlatforms = ['twitter', 'telegram', 'instagram', 'tiktok'];
    if (!platform || typeof platform !== 'string') {
      throw new Error('Platform must be a non-empty string');
    }
    const lowerPlatform = platform.toLowerCase();
    if (!validPlatforms.includes(lowerPlatform)) {
      throw new Error(`Invalid platform: ${platform}. Must be one of: twitter, telegram, instagram, tiktok`);
    }
    return lowerPlatform;
  }

  static validateMessage(message) {
    if (!message || typeof message !== 'string') {
      throw new Error('Message must be a non-empty string');
    }
    if (message.trim().length === 0) {
      throw new Error('Message cannot be empty or whitespace only');
    }
    return message.trim();
  }

  static validateTwitterMessage(message) {
    // First validate as a regular message
    const validatedMessage = this.validateMessage(message);

    // Twitter character limit (280 for standard accounts)
    const TWITTER_CHAR_LIMIT = 280;

    if (validatedMessage.length > TWITTER_CHAR_LIMIT) {
      throw new Error(`Tweet is too long (${validatedMessage.length} characters). Maximum is ${TWITTER_CHAR_LIMIT} characters.`);
    }

    return validatedMessage;
  }

  static validateScheduledTime(scheduledTime) {
    const date = new Date(scheduledTime);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format for scheduledTime');
    }
    if (date < new Date()) {
      throw new Error('Scheduled time must be in the future');
    }
    return date;
  }

  static validateOptions(options) {
    if (options === null || options === undefined) {
      return {};
    }
    if (typeof options !== 'object' || Array.isArray(options)) {
      throw new Error('Options must be an object');
    }
    return options;
  }
}

module.exports = Validator;
