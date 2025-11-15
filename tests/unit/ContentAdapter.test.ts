import { ContentAdapter } from '../../src/core/content/ContentAdapter';
import { Platform, PostContent } from '../../src/core/content/types';

describe('ContentAdapter', () => {
  describe('adaptContent', () => {
    it('should truncate text that exceeds platform limit', async () => {
      const content: PostContent = {
        text: 'a'.repeat(300),
      };

      const adapted = await ContentAdapter.adaptContent(content, Platform.TWITTER);

      expect(adapted.text.length).toBeLessThanOrEqual(280);
      expect(adapted.text.endsWith('...')).toBe(true);
    });

    it('should limit media count to platform maximum', async () => {
      const content: PostContent = {
        text: 'Test post',
        media: Array(10).fill({
          id: '1',
          type: 'image',
          url: 'test.jpg',
          mimeType: 'image/jpeg',
          size: 1000,
        }),
      };

      const adapted = await ContentAdapter.adaptContent(content, Platform.TWITTER);

      expect(adapted.media?.length).toBe(4); // Twitter max is 4
    });
  });

  describe('extractHashtags', () => {
    it('should extract hashtags from text', () => {
      const text = 'This is a #test with #multiple #hashtags';
      const hashtags = ContentAdapter.extractHashtags(text);

      expect(hashtags).toEqual(['#test', '#multiple', '#hashtags']);
    });

    it('should return empty array when no hashtags', () => {
      const text = 'This is a test without hashtags';
      const hashtags = ContentAdapter.extractHashtags(text);

      expect(hashtags).toEqual([]);
    });
  });
});
