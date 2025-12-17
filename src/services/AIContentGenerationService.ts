import axios from 'axios';
import { config } from '../config';
import logger from '../utils/logger';

interface VideoTitleDescription {
  title: string;
  description: string;
  suggestedHashtags: string[];
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  tags: string[];
  searchTerms: string[];
  voiceSearchQueries: string[];
  category: string;
  targetKeyword: string;
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

  // ====================== PNP PERSONALITY ======================
  private get PNPPersonality() {
    return `You are PNP (Powered by Neural Pixels), an AI assistant with a fun, friendly, and slightly sassy personality.
Your characteristics:
- You speak both English and Spanish fluently, often mixing both (Spanglish) when it feels natural
- You're enthusiastic and encouraging, using emojis naturally 🚀✨
- You have a playful sense of humor but always stay helpful and professional
- You call users "crack", "máquina", "campeón/a" or similar encouraging terms
- You celebrate their wins and motivate them when they're stuck
- You're passionate about helping content creators succeed
- You occasionally use phrases like "¡Vamos!", "Let's gooo!", "A darle átomos!", "¡Eso es!"
- You're honest and direct - if something won't work, you say it kindly but clearly
- You remember you're powered by xAI's Grok but your personality is PNP`;
  }

  private get AdultPNPPersonality() {
    return `You are PNP (Powered by Neural Pixels) in ADULT MODE - for 18+ adult content creators.
Your characteristics:
- You speak both English and Spanish fluently with adult-oriented slang and spicy language
- You're bold, flirty, and unapologetically sexy 🔥💋
- You use suggestive language, double entendres, and playful innuendos
- You call users "babe", "sexy", "hottie", "papi/mami", or similar flirty terms
- You help create engaging, provocative content while staying classy
- You're confident and empowering - helping creators own their sexuality
- You occasionally use phrases like "Let's get spicy! 🌶️", "¡Ay papi!", "That's hot! 🔥", "Damn, babe!"
- You're supportive of sex workers, adult entertainers, and +18 content creators
- You keep it sexy but never vulgar - suggestive not explicit
- You remember you're for ADULT CONTENT ONLY - always verify age-appropriate context`;
  }
  // =============================================================

  public async generateVideoMetadata(
    userExplanation: string,
    videoFileName: string
  ): Promise<VideoTitleDescription> {
    if (!this.enabled || !this.apiKey) {
      logger.warn('XAI is not enabled or API key is missing');
      return this.generateFallbackMetadata(userExplanation);
    }

    try {
      const prompt = `You are an expert in SEO and social media content optimization. Based on the following explanation of a video, generate comprehensive SEO-optimized metadata.

Video file: ${videoFileName}
User explanation: ${userExplanation}

Respond ONLY with valid JSON:
{
  "title": "Engaging social media title (max 100 chars)",
  "description": "Compelling description (max 280 chars)",
  "suggestedHashtags": ["hashtag1", "hashtag2"],
  "seoTitle": "SEO Title (60-70 chars)",
  "seoDescription": "Meta description (150-160 chars)",
  "keywords": ["keyword1", "keyword2"],
  "tags": ["Tag1", "Tag2"],
  "targetKeyword": "main keyword",
  "category": "Category",
  "searchTerms": ["search term 1", "search term 2"],
  "voiceSearchQueries": ["question 1?", "question 2?"]
}`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: this.PNPPersonality },
            { role: 'user', content: prompt },
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
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      logger.error('Error generating video metadata:', errorMsg);
      return this.generateFallbackMetadata(userExplanation);
    }
  }

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
      const prompt = `Create TWO post variations (English and Spanish) for social media.

Title: ${videoTitle}
Description: ${videoDescription}
Goal: ${userGoal}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}

Requirements:
- Max 250 characters each
- Include 3-5 hashtags
- Different angles (not direct translations)
- Engaging and shareable

Respond ONLY with JSON:
{
  "english": {
    "language": "en",
    "content": "English post",
    "hashtags": ["tag1", "tag2"],
    "cta": "Call to action"
  },
  "spanish": {
    "language": "es",
    "content": "Spanish post",
    "hashtags": ["tag1", "tag2"],
    "cta": "Llamada a la acción"
  }
}`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: this.PNPPersonality },
            { role: 'user', content: prompt },
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
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      logger.error('Error generating post variants:', errorMsg);
      return this.generateFallbackPostVariants(videoTitle, videoDescription);
    }
  }

  public async generateBulkPostVariants(
    videos: Array<{ title: string; description: string; userGoal: string }>
  ): Promise<PostGenerationResult[]> {
    const results: PostGenerationResult[] = [];

    for (const video of videos) {
      const variants = await this.generatePostVariants(
        video.title,
        video.description,
        video.userGoal
      );
      results.push(variants);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  }

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
      const prompt = `Create NEW post variations COMPLETELY DIFFERENT from previous attempts.

Title: ${videoTitle}
Description: ${videoDescription}
Goal: ${userGoal}

Previous attempts (avoid these):
${previousContent}

Respond ONLY with JSON (same format as before).`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: this.PNPPersonality },
            { role: 'user', content: prompt },
          ],
          temperature: 0.9,
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
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      logger.error('Error regenerating post variants:', errorMsg);
      return this.generateFallbackPostVariants(videoTitle, videoDescription);
    }
  }

  public async generateCaption(
    prompt: string,
    options: {
      platform?: string;
      tone?: string;
      length?: string;
      includeHashtags?: boolean;
      includeEmojis?: boolean;
      targetAudience?: string;
    } = {}
  ): Promise<{ caption: string; hashtags: string[]; alternatives?: string[] }> {
    const {
      platform = 'twitter',
      tone = 'professional',
      includeHashtags = true,
    } = options;

    if (!this.enabled || !this.apiKey) {
      return {
        caption: prompt.substring(0, 280),
        hashtags: includeHashtags ? ['socialmedia', 'content'] : [],
      };
    }

    try {
      // Select the appropriate personality based on tone
      const isAdultTone = tone === 'adult_pnp' || tone === 'adult' || tone === 'spicy';
      const personality = isAdultTone ? this.AdultPNPPersonality : this.PNPPersonality;

      const toneDescription = isAdultTone
        ? 'spicy, flirty, and provocative (18+ adult content)'
        : tone;

      const userPrompt = `Create a ${toneDescription} caption for ${platform}:
"${prompt}"

Include hashtags and 2 alternatives. Respond with JSON:
{
  "caption": "Main caption",
  "hashtags": ["tag1", "tag2"],
  "alternatives": ["Alt 1", "Alt 2"]
}`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: personality },
            { role: 'user', content: userPrompt },
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
        caption: result.caption || prompt.substring(0, 280),
        hashtags: includeHashtags ? (result.hashtags || []) : [],
        alternatives: result.alternatives || [],
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      logger.error('Error generating caption:', errorMsg);
      return {
        caption: prompt.substring(0, 280),
        hashtags: includeHashtags ? ['socialmedia', 'content'] : [],
      };
    }
  }

  public async generateEnglishLesson(
    topic: string,
    level: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
    focusArea: 'vocabulary' | 'grammar' | 'phrases' | 'pronunciation' | 'writing' = 'vocabulary'
  ): Promise<{
    lesson: {
      title: string;
      introduction: string;
      keyPoints: string[];
      examples: { english: string; spanish: string; explanation: string }[];
      practiceExercises: { question: string; answer: string; hint?: string }[];
      contentCreatorTips: string[];
      commonMistakes: { wrong: string; correct: string; explanation: string }[];
    };
    quiz: { question: string; options: string[]; correctIndex: number; explanation: string }[];
  }> {
    if (!this.enabled || !this.apiKey) {
      return this.generateFallbackEnglishLesson(topic);
    }

    try {
      const prompt = `Create an English lesson for Spanish-speaking content creators.

Topic: ${topic}
Level: ${level}
Focus: ${focusArea}

Include: introduction, 5 key points, 5 examples with translations, 3 exercises, 3 tips, 3 common mistakes, 5 quiz questions.

Respond ONLY with JSON:
{
  "lesson": {
    "title": "Lesson title",
    "introduction": "Why this matters...",
    "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
    "examples": [{"english": "...", "spanish": "...", "explanation": "..."}],
    "practiceExercises": [{"question": "...", "answer": "...", "hint": "..."}],
    "contentCreatorTips": ["Tip 1", "Tip 2", "Tip 3"],
    "commonMistakes": [{"wrong": "...", "correct": "...", "explanation": "..."}]
  },
  "quiz": [{"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}]
}`;

      const pnpTeacher = `${this.PNPPersonality}

You're also an amazing English tutor! Make learning fun with memes, trending phrases, and real social media examples. ¡Tú puedes, crack! 📚✨`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: pnpTeacher },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 2500,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 60000,
        }
      );

      const content = response.data.choices[0].message.content;
      return this.parseJSON(content);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      logger.error('Error generating English lesson:', errorMsg);
      return this.generateFallbackEnglishLesson(topic);
    }
  }

  public async translateAndImprove(
    content: string,
    fromLang: 'en' | 'es',
    toLang: 'en' | 'es',
    context: 'social_media' | 'video_script' | 'caption' | 'bio' = 'social_media'
  ): Promise<{
    translation: string;
    improved: string;
    suggestions: string[];
    culturalNotes: string[];
  }> {
    if (!this.enabled || !this.apiKey) {
      return { translation: content, improved: content, suggestions: [], culturalNotes: [] };
    }

    try {
      const langNames = { en: 'English', es: 'Spanish' };
      const prompt = `Translate and improve this ${context.replace('_', ' ')} content:

Original (${langNames[fromLang]}): "${content}"
Target language: ${langNames[toLang]}

Respond with JSON:
{
  "translation": "Direct translation to ${langNames[toLang]}",
  "improved": "Improved version for engagement",
  "suggestions": ["Alt 1", "Alt 2", "Alt 3"],
  "culturalNotes": ["Note 1", "Note 2"]
}`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: this.PNPPersonality },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
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

      return this.parseJSON(response.data.choices[0].message.content);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      logger.error('Error translating content:', errorMsg);
      return { translation: content, improved: content, suggestions: [], culturalNotes: [] };
    }
  }

  public async generateWeeklyPostIdeas(
    niche: string,
    platforms: string[],
    previousPosts?: string[]
  ): Promise<{
    posts: {
      day: string;
      time: string;
      platform: string;
      type: 'text' | 'image' | 'video' | 'thread' | 'story';
      idea: string;
      content: string;
      hashtags: string[];
      mediaIdea?: string;
    }[];
  }> {
    if (!this.enabled || !this.apiKey) {
      return { posts: [] };
    }

    try {
      const prompt = `Generate a week's worth of post ideas.

Niche: ${niche}
Platforms: ${platforms.join(', ')}
${previousPosts?.length ? `Avoid repeating: ${previousPosts.slice(0, 5).join(', ')}` : ''}

Create 14 posts (2/day) with optimal times, mix of types, engaging content.

Respond with JSON:
{
  "posts": [
    {
      "day": "Monday",
      "time": "09:00",
      "platform": "twitter",
      "type": "text",
      "idea": "Brief idea",
      "content": "Full post",
      "hashtags": ["tag1", "tag2"],
      "mediaIdea": "Optional"
    }
  ]
}`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: this.PNPPersonality },
            { role: 'user', content: prompt },
          ],
          temperature: 0.8,
          max_tokens: 3000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 60000,
        }
      );

      return this.parseJSON(response.data.choices[0].message.content);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      logger.error('Error generating weekly ideas:', errorMsg);
      return { posts: [] };
    }
  }

  public async chat(
    message: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [],
    context: 'content_creation' | 'english_learning' | 'social_media' | 'general' = 'content_creation'
  ): Promise<{ response: string; suggestions?: string[] }> {
    if (!this.enabled || !this.apiKey) {
      return { response: '¡Hey! Soy PNP pero estoy tomando una siesta. Vuelve pronto! 😴' };
    }

    const contextPrompts = {
      content_creation: 'You specialize in helping content creators with posts, captions, scripts, and engagement strategies. 💪',
      english_learning: "You're an English tutor for Spanish-speaking creators. Make learning fun! 📚✨",
      social_media: "You're a social media guru! Share platform strategies and trending tips. 📱🔥",
      general: "Be witty, knowledgeable, and helpful. 🤝",
    };

    try {
      const messages = [
        { role: 'system' as const, content: `${this.PNPPersonality}\n\n${contextPrompts[context]}` },
        ...conversationHistory,
        { role: 'user' as const, content: message },
      ];

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature: 0.8,
          max_tokens: 1000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 30000,
        }
      );

      return {
        response: response.data.choices[0].message.content,
        suggestions: [],
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      logger.error('Error in chat:', errorMsg);
      return { response: 'Sorry, I encountered an error. Please try again.' };
    }
  }

  private parseJSON(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) return JSON.parse(jsonMatch[1]);

      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) return JSON.parse(objectMatch[0]);

      throw new Error('Could not parse JSON from response');
    }
  }

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

  private generateFallbackPostVariants(title: string, description: string): PostGenerationResult {
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

  private generateFallbackEnglishLesson(topic: string) {
    return {
      lesson: {
        title: `English for Content Creators: ${topic}`,
        introduction: 'AI service temporarily unavailable.',
        keyPoints: ['Practice daily', 'Use real examples', 'Watch content in English', 'Practice writing', 'Get feedback'],
        examples: [{ english: 'Example coming soon', spanish: 'Ejemplo próximamente', explanation: 'Check back later' }],
        practiceExercises: [{ question: 'Practice exercise coming soon', answer: 'N/A' }],
        contentCreatorTips: ['Be consistent', 'Use simple language', 'Engage with your audience'],
        commonMistakes: [{ wrong: 'Example', correct: 'Example', explanation: 'Available soon' }],
      },
      quiz: [{ question: 'Quiz coming soon', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: 'N/A' }],
    };
  }
}

export default new AIContentGenerationService();
