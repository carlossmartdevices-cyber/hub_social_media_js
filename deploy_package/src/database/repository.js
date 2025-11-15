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

  async getScheduledContents(limit = 100) {
    // Use direct SQL query to avoid Sequelize column mapping issues
    const sequelize = ScheduledContent.sequelize;
    return await sequelize.query(`
      SELECT id, platform, message, scheduled_time as "scheduledTime", status, 
             metadata, created_at as "createdAt", updated_at as "updatedAt"
      FROM scheduled_contents 
      ORDER BY scheduled_time ASC
      LIMIT :limit
    `, {
      replacements: { limit },
      type: sequelize.QueryTypes.SELECT
    });
  }

  async getPendingScheduledContents() {
    // Use direct SQL query to avoid Sequelize column mapping issues
    const sequelize = ScheduledContent.sequelize;
    return await sequelize.query(`
      SELECT id, platform, message, scheduled_time as "scheduledTime", status, 
             metadata, created_at as "createdAt", updated_at as "updatedAt"
      FROM scheduled_contents 
      WHERE status = 'pending' AND scheduled_time > NOW()
      ORDER BY scheduled_time ASC
    `, {
      type: sequelize.QueryTypes.SELECT
    });
  }

  async getContentById(contentId) {
    // Use direct SQL query to avoid Sequelize column mapping issues
    const sequelize = ScheduledContent.sequelize;
    const results = await sequelize.query(`
      SELECT id, platform, message, scheduled_time as "scheduledTime", status, 
             metadata, created_at as "createdAt", updated_at as "updatedAt"
      FROM scheduled_contents 
      WHERE id = :contentId
    `, {
      replacements: { contentId },
      type: sequelize.QueryTypes.SELECT
    });
    return results.length > 0 ? results[0] : null;
  }

  async deleteContent(contentId) {
    return ScheduledContent.destroy({
      where: { id: contentId }
    });
  }
}

module.exports = ContentRepository;