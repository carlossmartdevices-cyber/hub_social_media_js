import axios from 'axios';
import { config } from '../config';
import logger from '../utils/logger';

interface VideoTitleDescription {
  // Basic metadata
  title: string;
  description: string;
  suggestedHashtags: string[];

  // SEO optimization fields
  seoTitle: string; // Optimized title for search engines (60-70 chars)
  seoDescription: string; // Meta description (150-160 chars)
  keywords: string[]; // Primary keywords for SEO (5-10)
  tags: string[]; // Category tags (3-5)
  searchTerms: string[]; // Long-tail search phrases (3-5)
  voiceSearchQueries: string[]; // Questions for voice search (2-3)
  category: string; // Main category
  targetKeyword: string; // Primary focus keyword
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
    if (!config.ai || !config.ai.grok) {
      const errorMsg = 'FATAL: config.ai or config.ai.grok is undefined!';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
    this.apiKey = config.ai.grok.apiKey || '';
    this.baseUrl = config.ai.grok.baseURL || 'https://api.x.ai/v1';
    this.model = config.ai.grok.model || 'grok-beta';
    this.enabled = config.ai.grok.enabled || false;

    logger.info('AIContentGenerationService initialized', {
      enabled: this.enabled,
      model: this.model,
      hasApiKey: !!this.apiKey
    });
  }

  /**
   * Generate SEO-optimized video metadata based on user explanation
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
      const prompt = `You are an expert in SEO and social media content optimization. Based on the following explanation of a video, generate comprehensive SEO-optimized metadata for maximum discoverability in search engines (Google, YouTube, Twitter, etc.).

Video file: ${videoFileName}
User explanation: ${userExplanation}

Requirements:

**SOCIAL MEDIA CONTENT:**
- title: Catchy, engaging social media title (max 100 characters) with power words
- description: Compelling social description (max 280 characters) with hook and value proposition
- suggestedHashtags: 5-8 trending and relevant hashtags (without #)

**SEO OPTIMIZATION:**
- seoTitle: Search-optimized title (60-70 characters) with primary keyword at the start
- seoDescription: Meta description (150-160 characters) with keywords and clear value proposition
- keywords: 5-10 primary keywords/keyphrases for search ranking
- tags: 3-5 categorical tags (e.g., "Tutorial", "Technology", "Marketing")
- targetKeyword: THE main keyword to rank for (1-3 words)
- category: Main video category (e.g., "Education", "Entertainment", "Business", "Technology")

**SEARCH DISCOVERY:**
- searchTerms: 3-5 long-tail search phrases people actually search (e.g., "how to optimize react performance")
- voiceSearchQueries: 2-3 natural language questions for voice search (e.g., "How do I make my React app faster?")

**SEO BEST PRACTICES:**
- Front-load important keywords in titles and descriptions
- Use power words: "Ultimate", "Complete", "Proven", "Easy", "Fast", "Essential"
- Include numbers when relevant: "5 Ways", "10 Tips", "2024 Guide"
- Make it click-worthy but not clickbait
- Optimize for user intent (informational, commercial, navigational)

Respond ONLY with valid JSON in this exact format:
{
  "title": "Engaging social media title here",
  "description": "Compelling social description here",
  "suggestedHashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "seoTitle": "Keyword-Rich SEO Title Here - Max 70 Chars",
  "seoDescription": "Meta description with keywords and value proposition. Should be between 150-160 characters for optimal display in search results.",
  "keywords": ["keyword1", "keyword phrase 2", "keyword3"],
  "tags": ["Category1", "Category2", "Category3"],
  "targetKeyword": "main keyword phrase",
  "category": "Main Category",
  "searchTerms": ["how to do something specific", "what is the best way to"],
  "voiceSearchQueries": ["How do I solve this problem?", "What's the best way to achieve this?"]
}`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert SEO specialist and social media strategist. You understand search algorithms, user intent, and content optimization for maximum discoverability.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1200,
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
        seoTitle: result.seoTitle || result.title || userExplanation.substring(0, 70),
        seoDescription: result.seoDescription || result.description || userExplanation.substring(0, 160),
        keywords: result.keywords || [],
        tags: result.tags || ['video', 'content'],
        targetKeyword: result.targetKeyword || 'video content',
        category: result.category || 'General',
        searchTerms: result.searchTerms || [],
        voiceSearchQueries: result.voiceSearchQueries || [],
      };
    } catch (error: any) {
      logger.error('Error generating video metadata with Grok:', error);
      return this.generateFallbackMetadata(userExplanation);
    }
  }

  /**
   * Generate SEO-optimized post variations in English and Spanish based on user goal
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
      const prompt = `You are a bilingual social media marketing and SEO expert. Create TWO SEO-optimized post variations (one in English, one in Spanish) for a video.

Video Title: ${videoTitle}
Video Description: ${videoDescription}
User Goal: ${userGoal}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}

Requirements:
- Create ONE post in ENGLISH and ONE post in SPANISH
- Each post should be optimized for:
  * Twitter algorithm (max 250 characters to leave room for media)
  * Search discoverability (include relevant keywords naturally)
  * Engagement (questions, hooks, power words)
  * Click-through rate (value proposition, FOMO, curiosity)
- Posts should be DIFFERENT from each other (not direct translations) - use different angles
- Each should align with the user's goal
- Include 3-5 SEO-optimized hashtags per post:
  * Mix of high-volume and niche hashtags
  * Trending hashtags when relevant
  * Branded hashtags if applicable
- Add a compelling call-to-action (CTA) that drives the desired action
- Make them engaging, shareable, and searchable

**SEO OPTIMIZATION TACTICS:**
- Front-load important keywords in the first 100 characters
- Use power words and emotional triggers
- Include numbers/stats when possible
- Create curiosity gaps
- Address user pain points or desires

IMPORTANT: The English and Spanish posts should have different angles/approaches to avoid being flagged as spam.

Respond ONLY with valid JSON in this exact format:
{
  "english": {
    "language": "en",
    "content": "Your SEO-optimized engaging English post here",
    "hashtags": ["SEOHashtag1", "TrendingTag2", "NicheTag3"],
    "cta": "Strong call to action"
  },
  "spanish": {
    "language": "es",
    "content": "Tu post optimizado para SEO en español aquí",
    "hashtags": ["HashtagSEO1", "TagTendencia2", "TagNicho3"],
    "cta": "Llamada a la acción convincente"
  }
}`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert in bilingual SEO, social media marketing, and content optimization. You understand how to create content that ranks well in search and performs well on social platforms.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.8,
          max_tokens: 900,
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
      seoTitle: explanation.substring(0, 70),
      seoDescription: explanation.substring(0, 160),
      keywords: ['video', 'content', 'social media'],
      tags: ['Video', 'Content', 'Social'],
      targetKeyword: 'video content',
      category: 'General',
      searchTerms: ['video content', 'social media video'],
      voiceSearchQueries: ['How to create video content?'],
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
