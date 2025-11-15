import { PostContent, Platform } from './types';
import { PlatformFactory } from '../../platforms';
import { logger } from '../../utils/logger';

export class ContentAdapter {
  /**
   * Adapts content to meet platform-specific requirements
   */
  static async adaptContent(
    content: PostContent,
    platform: Platform
  ): Promise<PostContent> {
    const adapter = PlatformFactory.createAdapter(platform);
    const requirements = adapter.getRequirements();
    const adaptedContent: PostContent = { ...content };

    // Truncate text if necessary
    if (content.text.length > requirements.maxTextLength) {
      adaptedContent.text = content.text.substring(0, requirements.maxTextLength - 3) + '...';
      logger.warn(
        `Text truncated for ${platform}: ${content.text.length} -> ${adaptedContent.text.length}`
      );
    }

    // Limit media count
    if (content.media && content.media.length > requirements.maxMediaCount) {
      adaptedContent.media = content.media.slice(0, requirements.maxMediaCount);
      logger.warn(
        `Media limited for ${platform}: ${content.media.length} -> ${adaptedContent.media.length}`
      );
    }

    // Filter hashtags if not supported
    if (!requirements.supportsHashtags && adaptedContent.hashtags) {
      logger.warn(`Hashtags removed for ${platform} (not supported)`);
      delete adaptedContent.hashtags;
    }

    // Filter mentions if not supported
    if (!requirements.supportsMentions && adaptedContent.mentions) {
      logger.warn(`Mentions removed for ${platform} (not supported)`);
      delete adaptedContent.mentions;
    }

    return adaptedContent;
  }

  /**
   * Formats text with hashtags and mentions
   */
  static formatText(content: PostContent): string {
    let text = content.text;

    if (content.hashtags && content.hashtags.length > 0) {
      const tags = content.hashtags.map(tag => (tag.startsWith('#') ? tag : `#${tag}`));
      text += '\n\n' + tags.join(' ');
    }

    if (content.link) {
      text += `\n\n${content.link}`;
    }

    return text;
  }

  /**
   * Extracts hashtags from text
   */
  static extractHashtags(text: string): string[] {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const matches = text.match(hashtagRegex);
    return matches || [];
  }

  /**
   * Extracts mentions from text
   */
  static extractMentions(text: string): string[] {
    const mentionRegex = /@[a-zA-Z0-9_]+/g;
    const matches = text.match(mentionRegex);
    return matches || [];
  }
}

export default ContentAdapter;
