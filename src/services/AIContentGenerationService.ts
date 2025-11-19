import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';

interface VideoTitleDescription {
  title: string;
  description: string;
  suggestedHashtags: string[];
}

interface PostVariant {
  language: 'en' | 'es';
  content: string;
  hashtags: string[];
  cta?: string;
}

interface PostGenerationResult {
  english: PostVariant;
  spanish: PostVariant;
}

export class AIContentGenerationService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private enabled: boolean;

  constructor() {
    this.apiKey = config.xai.apiKey || '';
    this.baseUrl = config.xai.baseUrl || 'https://api.x.ai/v1';
    this.model = config.xai.model || 'grok-beta';
    this.enabled = config.xai.enabled || false;
  }

  /**
   * Generate video title and description based on user explanation
   */
  public async generateVideoMetadata(
    userExplanation: string,
    videoFileName: string
  ): Promise<VideoTitleDescription> {
    if (!this.enabled || !this.apiKey) {
      logger.warn('XAI is not enabled or API key is missing');
      return this.generateFallbackMetadata(userExplanation);
    }

    try {
      const prompt = `You are a social media content expert. Based on the following explanation of a video, generate an engaging title, description, and hashtags.

Video file: ${videoFileName}
User explanation: ${userExplanation}

Requirements:
- Title: Catchy, concise (max 100 characters), attention-grabbing
- Description: Engaging, informative (max 280 characters), includes key points
- Hashtags: 5-8 relevant hashtags without the # symbol

Respond ONLY with valid JSON in this exact format:
{
  "title": "Your engaging title here",
  "description": "Your compelling description here",
  "suggestedHashtags": ["hashtag1", "hashtag2", "hashtag3"]
}`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 30000,
        }
      );

      const content = response.data.choices[0].message.content;
      const result = this.parseJSON(content);

      return {
        title: result.title || userExplanation.substring(0, 100),
        description: result.description || userExplanation.substring(0, 280),
        suggestedHashtags: result.suggestedHashtags || [],
      };
    } catch (error: any) {
      logger.error('Error generating video metadata with Grok:', error);
      return this.generateFallbackMetadata(userExplanation);
    }
  }

  /**
   * Generate post variations in English and Spanish based on user goal
   */
  public async generatePostVariants(
    videoTitle: string,
    videoDescription: string,
    userGoal: string,
    targetAudience?: string
  ): Promise<PostGenerationResult> {
    if (!this.enabled || !this.apiKey) {
      logger.warn('XAI is not enabled or API key is missing');
      return this.generateFallbackPostVariants(videoTitle, videoDescription);
    }

    try {
      const prompt = `You are a bilingual social media marketing expert. Create TWO post variations (one in English, one in Spanish) for a video.

Video Title: ${videoTitle}
Video Description: ${videoDescription}
User Goal: ${userGoal}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}

Requirements:
- Create ONE post in ENGLISH and ONE post in SPANISH
- Each post should be optimized for Twitter (max 250 characters to leave room for media)
- Posts should be DIFFERENT from each other (not direct translations)
- Each should align with the user's goal
- Include relevant hashtags (3-5 per post)
- Add a compelling call-to-action (CTA) if appropriate
- Make them engaging and shareable

IMPORTANT: The English and Spanish posts should have different angles/approaches to avoid being flagged as spam.

Respond ONLY with valid JSON in this exact format:
{
  "english": {
    "language": "en",
    "content": "Your engaging English post here",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
    "cta": "Optional call to action"
  },
  "spanish": {
    "language": "es",
    "content": "Tu post atractivo en español aquí",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
    "cta": "Llamada a la acción opcional"
  }
}`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.8,
          max_tokens: 800,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 30000,
        }
      );

      const content = response.data.choices[0].message.content;
      const result = this.parseJSON(content);

      return {
        english: {
          language: 'en',
          content: result.english?.content || `Check out: ${videoTitle}`,
          hashtags: result.english?.hashtags || ['video', 'content'],
          cta: result.english?.cta,
        },
        spanish: {
          language: 'es',
          content: result.spanish?.content || `Mira esto: ${videoTitle}`,
          hashtags: result.spanish?.hashtags || ['video', 'contenido'],
          cta: result.spanish?.cta,
        },
      };
    } catch (error: any) {
      logger.error('Error generating post variants with Grok:', error);
      return this.generateFallbackPostVariants(videoTitle, videoDescription);
    }
  }

  /**
   * Generate bulk post variants for multiple videos
   */
  public async generateBulkPostVariants(
    videos: Array<{
      title: string;
      description: string;
      userGoal: string;
    }>
  ): Promise<PostGenerationResult[]> {
    const results: PostGenerationResult[] = [];

    for (const video of videos) {
      const variants = await this.generatePostVariants(
        video.title,
        video.description,
        video.userGoal
      );
      results.push(variants);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Regenerate post variants with different approach
   */
  public async regeneratePostVariants(
    videoTitle: string,
    videoDescription: string,
    userGoal: string,
    previousAttempts: PostGenerationResult[]
  ): Promise<PostGenerationResult> {
    const previousContent = previousAttempts
      .map((attempt, idx) => `Attempt ${idx + 1}:\nEN: ${attempt.english.content}\nES: ${attempt.spanish.content}`)
      .join('\n\n');

    if (!this.enabled || !this.apiKey) {
      return this.generateFallbackPostVariants(videoTitle, videoDescription);
    }

    try {
      const prompt = `You are a bilingual social media marketing expert. Create TWO NEW post variations (one in English, one in Spanish) for a video.

Video Title: ${videoTitle}
Video Description: ${videoDescription}
User Goal: ${userGoal}

Previous attempts that the user didn't like:
${previousContent}

Requirements:
- Create ONE post in ENGLISH and ONE post in SPANISH
- Each post should be COMPLETELY DIFFERENT from previous attempts
- Try a different angle, tone, or approach
- Each post should be optimized for Twitter (max 250 characters)
- Posts should be DIFFERENT from each other (not direct translations)
- Include relevant hashtags (3-5 per post)
- Add a compelling call-to-action (CTA) if appropriate

Respond ONLY with valid JSON in this exact format:
{
  "english": {
    "language": "en",
    "content": "Your engaging English post here",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
    "cta": "Optional call to action"
  },
  "spanish": {
    "language": "es",
    "content": "Tu post atractivo en español aquí",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
    "cta": "Llamada a la acción opcional"
  }
}`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.9, // Higher temperature for more variation
          max_tokens: 800,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 30000,
        }
      );

      const content = response.data.choices[0].message.content;
      const result = this.parseJSON(content);

      return {
        english: {
          language: 'en',
          content: result.english?.content || `Discover: ${videoTitle}`,
          hashtags: result.english?.hashtags || ['video', 'content'],
          cta: result.english?.cta,
        },
        spanish: {
          language: 'es',
          content: result.spanish?.content || `Descubre: ${videoTitle}`,
          hashtags: result.spanish?.hashtags || ['video', 'contenido'],
          cta: result.spanish?.cta,
        },
      };
    } catch (error: any) {
      logger.error('Error regenerating post variants with Grok:', error);
      return this.generateFallbackPostVariants(videoTitle, videoDescription);
    }
  }

  /**
   * Parse JSON from Grok response (handle markdown code blocks)
   */
  private parseJSON(content: string): any {
    try {
      // Try direct parse first
      return JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try to find JSON object in the content
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }

      throw new Error('Could not parse JSON from response');
    }
  }

  /**
   * Fallback metadata generation when AI is not available
   */
  private generateFallbackMetadata(explanation: string): VideoTitleDescription {
    return {
      title: explanation.substring(0, 100),
      description: explanation.substring(0, 280),
      suggestedHashtags: ['video', 'content', 'social'],
    };
  }

  /**
   * Fallback post variants when AI is not available
   */
  private generateFallbackPostVariants(
    title: string,
    description: string
  ): PostGenerationResult {
    return {
      english: {
        language: 'en',
        content: `${title}\n\n${description.substring(0, 150)}`,
        hashtags: ['video', 'content'],
      },
      spanish: {
        language: 'es',
        content: `${title}\n\n${description.substring(0, 150)}`,
        hashtags: ['video', 'contenido'],
      },
    };
  }
}

export default new AIContentGenerationService();
