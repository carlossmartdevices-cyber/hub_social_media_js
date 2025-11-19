import { db } from '../database/connection';
import { logger } from '../utils/logger';
import OpenAI from 'openai';
import { config } from '../config';

/**
 * AIAnalyticsService - Intelligent content analysis and suggestions based on historical data
 *
 * This service analyzes post history and engagement metrics to provide:
 * - Smart hashtag suggestions based on performance
 * - Caption generation based on successful patterns
 * - Content ideas based on trends and engagement
 * - Optimal posting time recommendations
 */
export class AIAnalyticsService {
  private client: OpenAI | null = null;

  constructor() {
    if (config.ai.grok.enabled && config.ai.grok.apiKey) {
      this.client = new OpenAI({
        apiKey: config.ai.grok.apiKey,
        baseURL: config.ai.grok.baseURL,
      });
      logger.info('AIAnalyticsService initialized with Grok API');
    } else {
      logger.warn('AIAnalyticsService: Grok API is disabled or API key is missing');
    }
  }

  /**
   * Analyze historical hashtag performance and generate intelligent suggestions
   *
   * @param userId - User ID to analyze
   * @param platform - Optional platform filter
   * @param limit - Number of hashtag suggestions to return
   * @returns Array of hashtag suggestions with performance scores
   */
  public async generateSmartHashtags(
    userId: string,
    platform?: string,
    limit: number = 10
  ): Promise<Array<{ hashtag: string; score: number; usageCount: number; avgEngagement: number }>> {
    try {
      logger.info('Analyzing historical hashtags', { userId, platform });

      // Query to analyze hashtag performance
      const query = `
        SELECT
          hashtag,
          COUNT(*) as usage_count,
          AVG(COALESCE(pm.likes, 0) + COALESCE(pm.shares, 0) + COALESCE(pm.comments, 0)) as avg_engagement,
          AVG(pm.engagement) as avg_engagement_rate
        FROM (
          SELECT
            p.id as post_id,
            jsonb_array_elements_text(p.content->'hashtags') as hashtag
          FROM posts p
          WHERE p.user_id = $1
            AND p.status = 'published'
            AND p.content->'hashtags' IS NOT NULL
            ${platform ? 'AND $2 = ANY(p.platforms)' : ''}
        ) as post_hashtags
        LEFT JOIN platform_posts pp ON pp.post_id = post_hashtags.post_id
        LEFT JOIN platform_metrics pm ON pm.platform_post_id = pp.id
        GROUP BY hashtag
        HAVING COUNT(*) >= 2
        ORDER BY avg_engagement_rate DESC NULLS LAST, usage_count DESC
        LIMIT $${platform ? '3' : '2'}
      `;

      const params = platform ? [userId, platform, limit] : [userId, limit];
      const result = await db.query(query, params);

      const hashtags = result.rows.map(row => ({
        hashtag: row.hashtag,
        score: parseFloat(row.avg_engagement_rate || 0),
        usageCount: parseInt(row.usage_count),
        avgEngagement: parseFloat(row.avg_engagement || 0),
      }));

      logger.info('Hashtag analysis complete', {
        userId,
        platform,
        foundHashtags: hashtags.length
      });

      // If we have historical data, use AI to suggest variations and new hashtags
      if (hashtags.length > 0 && this.client) {
        const aiSuggestions = await this.getAIHashtagSuggestions(hashtags, platform);
        return [...hashtags, ...aiSuggestions].slice(0, limit);
      }

      return hashtags;
    } catch (error: any) {
      logger.error('Error generating smart hashtags', {
        error: error.message,
        userId,
        platform
      });
      throw new Error(`Failed to generate smart hashtags: ${error.message}`);
    }
  }

  /**
   * Use AI to generate hashtag variations based on high-performing hashtags
   */
  private async getAIHashtagSuggestions(
    performingHashtags: Array<{ hashtag: string; score: number }>,
    platform?: string
  ): Promise<Array<{ hashtag: string; score: number; usageCount: number; avgEngagement: number }>> {
    if (!this.client) return [];

    try {
      const topHashtags = performingHashtags.slice(0, 5).map(h => h.hashtag);

      const prompt = `Based on these high-performing hashtags: ${topHashtags.join(', ')}

Generate 5 related hashtags that would likely perform well ${platform ? `on ${platform}` : 'on social media'}.
Consider:
- Similar themes and topics
- Trending variations
- Alternative phrasings
- Community-specific tags

Respond ONLY with a JSON array of hashtags (including the # symbol), like:
["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"]`;

      const response = await this.client.chat.completions.create({
        model: config.ai.grok.model,
        messages: [
          { role: 'system', content: 'You are a social media expert analyzing hashtag trends.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content || '[]';
      const suggestions = JSON.parse(content.match(/\[.*\]/s)?.[0] || '[]');

      return suggestions.map((hashtag: string) => ({
        hashtag,
        score: 0.5, // AI-suggested, not yet tested
        usageCount: 0,
        avgEngagement: 0,
      }));
    } catch (error: any) {
      logger.error('Error getting AI hashtag suggestions', { error: error.message });
      return [];
    }
  }

  /**
   * Analyze successful captions and generate AI-powered caption suggestions
   *
   * @param userId - User ID to analyze
   * @param topic - Optional topic or theme for the caption
   * @param platform - Optional platform filter
   * @returns Array of caption suggestions
   */
  public async generateSmartCaptions(
    userId: string,
    topic?: string,
    platform?: string
  ): Promise<Array<{ caption: string; inspiration: string }>> {
    try {
      logger.info('Analyzing successful captions', { userId, topic, platform });

      // Get top-performing posts to learn from
      const query = `
        SELECT
          p.content->>'text' as text,
          AVG(pm.engagement) as avg_engagement,
          COUNT(pm.id) as metric_count
        FROM posts p
        LEFT JOIN platform_posts pp ON pp.post_id = p.id
        LEFT JOIN platform_metrics pm ON pm.platform_post_id = pp.id
        WHERE p.user_id = $1
          AND p.status = 'published'
          AND p.content->>'text' IS NOT NULL
          ${platform ? 'AND $2 = ANY(p.platforms)' : ''}
        GROUP BY p.id, p.content->>'text'
        HAVING AVG(pm.engagement) > 0
        ORDER BY avg_engagement DESC
        LIMIT 10
      `;

      const params = platform ? [userId, platform] : [userId];
      const result = await db.query(query, params);

      if (result.rows.length === 0) {
        logger.warn('No historical data found for caption generation', { userId });
        return this.generateDefaultCaptions(topic, platform);
      }

      // Use AI to analyze patterns and generate new captions
      const topCaptions = result.rows.map(row => row.text);

      if (!this.client) {
        return topCaptions.slice(0, 5).map(text => ({
          caption: text,
          inspiration: 'Historical high-performer',
        }));
      }

      const prompt = `Analyze these high-performing social media captions:

${topCaptions.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Based on the patterns, tone, and style of these successful captions, generate 5 NEW unique captions${topic ? ` about "${topic}"` : ''}${platform ? ` optimized for ${platform}` : ''}.

Key requirements:
- Match the successful tone and style
- Be engaging and actionable
- Include relevant emojis if the examples use them
- Keep appropriate length for ${platform || 'social media'}
- Don't copy the examples directly - create original content

Respond with a JSON array of objects with "caption" and "inspiration" fields:
[
  {"caption": "Your caption here", "inspiration": "Why this should work"},
  ...
]`;

      const response = await this.client.chat.completions.create({
        model: config.ai.grok.model,
        messages: [
          { role: 'system', content: 'You are a social media copywriting expert.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content || '[]';
      const jsonMatch = content.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        logger.info('Generated AI captions', { count: suggestions.length });
        return suggestions;
      }

      return this.generateDefaultCaptions(topic, platform);
    } catch (error: any) {
      logger.error('Error generating smart captions', {
        error: error.message,
        userId
      });
      throw new Error(`Failed to generate smart captions: ${error.message}`);
    }
  }

  /**
   * Generate default captions when no historical data is available
   */
  private async generateDefaultCaptions(
    topic?: string,
    platform?: string
  ): Promise<Array<{ caption: string; inspiration: string }>> {
    if (!this.client) {
      return [
        { caption: 'Check this out! 🔥', inspiration: 'Simple and engaging' },
        { caption: 'New update alert! 📢', inspiration: 'Creates urgency' },
        { caption: 'You don\'t want to miss this ✨', inspiration: 'FOMO trigger' },
      ];
    }

    const prompt = `Generate 5 engaging social media captions${topic ? ` about "${topic}"` : ''}${platform ? ` for ${platform}` : ''}.

Make them:
- Attention-grabbing
- Action-oriented
- Include relevant emojis
- Appropriate length for the platform

Respond with JSON: [{"caption": "...", "inspiration": "..."}]`;

    try {
      const response = await this.client.chat.completions.create({
        model: config.ai.grok.model,
        messages: [
          { role: 'system', content: 'You are a social media expert.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || '[]';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (error: any) {
      logger.error('Error generating default captions', { error: error.message });
      return [];
    }
  }

  /**
   * Generate content ideas based on historical performance and trends
   *
   * @param userId - User ID to analyze
   * @param platform - Optional platform filter
   * @param count - Number of ideas to generate
   * @returns Array of content ideas with rationale
   */
  public async generateContentIdeas(
    userId: string,
    platform?: string,
    count: number = 5
  ): Promise<Array<{ idea: string; rationale: string; suggestedHashtags: string[] }>> {
    try {
      logger.info('Generating content ideas', { userId, platform, count });

      // Analyze what content has worked well
      const query = `
        SELECT
          p.content->>'text' as text,
          p.content->'hashtags' as hashtags,
          p.platforms,
          AVG(pm.engagement) as avg_engagement,
          SUM(pm.likes + pm.shares + pm.comments) as total_interactions
        FROM posts p
        LEFT JOIN platform_posts pp ON pp.post_id = p.id
        LEFT JOIN platform_metrics pm ON pm.platform_post_id = pp.id
        WHERE p.user_id = $1
          AND p.status = 'published'
          ${platform ? 'AND $2 = ANY(p.platforms)' : ''}
        GROUP BY p.id
        HAVING AVG(pm.engagement) > 0
        ORDER BY avg_engagement DESC
        LIMIT 20
      `;

      const params = platform ? [userId, platform] : [userId];
      const result = await db.query(query, params);

      if (!this.client) {
        return [{
          idea: 'Share an update about your latest work',
          rationale: 'Updates tend to perform well',
          suggestedHashtags: ['#update', '#news'],
        }];
      }

      const historicalContext = result.rows.length > 0
        ? `Historical high-performing content:\n${result.rows.slice(0, 10).map((r, i) =>
            `${i + 1}. ${r.text?.substring(0, 100)}...`
          ).join('\n')}`
        : 'No historical data available - generate general content ideas.';

      const prompt = `${historicalContext}

Based on ${result.rows.length > 0 ? 'the successful patterns above' : 'social media best practices'}, generate ${count} content ideas${platform ? ` for ${platform}` : ''}.

Each idea should:
- Be specific and actionable
- Have clear engagement potential
- Include suggested hashtags
- Explain why it would work

Respond with JSON:
[
  {
    "idea": "Detailed content idea",
    "rationale": "Why this would perform well",
    "suggestedHashtags": ["#tag1", "#tag2", "#tag3"]
  }
]`;

      const response = await this.client.chat.completions.create({
        model: config.ai.grok.model,
        messages: [
          { role: 'system', content: 'You are a social media strategist specializing in content planning.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.9,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content || '[]';
      const jsonMatch = content.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const ideas = JSON.parse(jsonMatch[0]);
        logger.info('Generated content ideas', { count: ideas.length });
        return ideas.slice(0, count);
      }

      return [];
    } catch (error: any) {
      logger.error('Error generating content ideas', {
        error: error.message,
        userId
      });
      throw new Error(`Failed to generate content ideas: ${error.message}`);
    }
  }

  /**
   * Analyze engagement patterns to determine optimal posting times
   *
   * @param userId - User ID to analyze
   * @param platform - Optional platform filter
   * @returns Optimal posting times by day of week and hour
   */
  public async analyzeOptimalPostingTimes(
    userId: string,
    platform?: string
  ): Promise<{
    bestTimes: Array<{ dayOfWeek: number; hour: number; score: number; avgEngagement: number }>;
    insights: string;
  }> {
    try {
      logger.info('Analyzing optimal posting times', { userId, platform });

      const query = `
        SELECT
          EXTRACT(DOW FROM p.published_at) as day_of_week,
          EXTRACT(HOUR FROM p.published_at) as hour,
          COUNT(*) as post_count,
          AVG(pm.engagement) as avg_engagement,
          AVG(pm.likes + pm.shares + pm.comments) as avg_interactions
        FROM posts p
        LEFT JOIN platform_posts pp ON pp.post_id = p.id
        LEFT JOIN platform_metrics pm ON pm.platform_post_id = pp.id
        WHERE p.user_id = $1
          AND p.status = 'published'
          AND p.published_at IS NOT NULL
          ${platform ? 'AND $2 = ANY(p.platforms)' : ''}
        GROUP BY day_of_week, hour
        HAVING COUNT(*) >= 2 AND AVG(pm.engagement) IS NOT NULL
        ORDER BY avg_engagement DESC, post_count DESC
        LIMIT 10
      `;

      const params = platform ? [userId, platform] : [userId];
      const result = await db.query(query, params);

      const bestTimes = result.rows.map(row => ({
        dayOfWeek: parseInt(row.day_of_week),
        hour: parseInt(row.hour),
        score: parseFloat(row.avg_engagement || 0),
        avgEngagement: parseFloat(row.avg_engagement || 0),
      }));

      // Generate insights using AI
      let insights = 'Not enough data to generate insights yet.';

      if (this.client && bestTimes.length > 0) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const timeSummary = bestTimes.slice(0, 5).map(t =>
          `${dayNames[t.dayOfWeek]}s at ${t.hour}:00 (engagement: ${t.avgEngagement.toFixed(2)})`
        ).join(', ');

        const prompt = `Based on this posting time analysis: ${timeSummary}

Provide a brief insight (2-3 sentences) about the best times to post${platform ? ` on ${platform}` : ''}.`;

        const response = await this.client.chat.completions.create({
          model: config.ai.grok.model,
          messages: [
            { role: 'system', content: 'You are a social media analytics expert.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 200,
        });

        insights = response.choices[0]?.message?.content || insights;
      }

      logger.info('Optimal posting times analysis complete', {
        bestTimesCount: bestTimes.length
      });

      return { bestTimes, insights };
    } catch (error: any) {
      logger.error('Error analyzing optimal posting times', {
        error: error.message,
        userId
      });
      throw new Error(`Failed to analyze optimal posting times: ${error.message}`);
    }
  }
}

// Export singleton instance
export const aiAnalyticsService = new AIAnalyticsService();
