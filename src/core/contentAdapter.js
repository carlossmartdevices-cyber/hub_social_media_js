class ContentAdapter {
  static adaptForPlatform(platform, content) {
    switch (platform.toLowerCase()) {
      case 'twitter':
        return this.adaptForTwitter(content);
      case 'telegram':
        return this.adaptForTelegram(content);
      case 'instagram':
        return this.adaptForInstagram(content);
      case 'tiktok':
        return this.adaptForTikTok(content);
      default:
        return content;
    }
  }

  static adaptForTwitter(content) {
    // Twitter has 280 character limit
    if (content.length <= 280) {
      return content;
    }
    return content.substring(0, 277) + '...';
  }

  static adaptForTelegram(content) {
    // Telegram has 4096 character limit for messages
    if (content.length <= 4096) {
      return content;
    }
    return content.substring(0, 4093) + '...';
  }

  static adaptForInstagram(content) {
    // Instagram captions have 2200 character limit
    if (content.length <= 2200) {
      return content;
    }
    return content.substring(0, 2197) + '...';
  }

  static adaptForTikTok(content) {
    // TikTok captions have 150 character limit
    if (content.length <= 150) {
      return content;
    }
    return content.substring(0, 147) + '...';
  }
}

module.exports = ContentAdapter;