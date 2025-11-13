const { ScheduledContent } = require('./models');

class ContentRepository {
  async saveScheduledContent(platform, message, scheduledTime, options = {}) {
    return await ScheduledContent.create({
      platform,
      message,
      scheduledTime,
      metadata: JSON.stringify(options)
    });
  }

  async updateContentStatus(contentId, status) {
    return await ScheduledContent.update(
      { status },
      { where: { id: contentId } }
    );
  }

  async getScheduledContents(limit = 20) {
    return ScheduledContent.findAll({
      order: [['scheduledTime', 'ASC']],
      limit
    });
  }

  async getContentById(contentId) {
    return ScheduledContent.findByPk(contentId);
  }

  async deleteContent(contentId) {
    return ScheduledContent.destroy({
      where: { id: contentId }
    });
  }
}

module.exports = ContentRepository;