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
      logger.error('Error generating video metadata with Grok:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      return this.generateFallbackMetadata(userExplanation);
    }
  }

  /**
   * Generate X/Twitter-optimized post variations in English and Spanish
   * Optimized specifically for X algorithm and engagement
   */
  public async generatePostVariants(
    videoTitle: string,
    videoDescription: string,
    userGoal: string,
    targetAudience?: string,
    tone?: string
  ): Promise<PostGenerationResult> {
    if (!this.enabled || !this.apiKey) {
      logger.warn('XAI is not enabled or API key is missing');
      return this.generateFallbackPostVariants(videoTitle, videoDescription);
    }

    try {
      // PNP Prime system prompt for premium provocative Latino content
      const pnpPrimeSystemPrompt = `You are an expert Community Manager specialized in premium provocative Latino content for PNP LATINO TV. Your goal: attract new subscribers and drive traffic to the official Telegram bot: https://t.me/pnplatinotv_bot.

Tone & style: Bold, high-energy, modern Latino vibe. Provocative and slightly explicit—always teasing, never crossing the line. Use real PNP slang: clouds, tina, slam, hnh, chemsex, with raw sexual energy, authenticity, and total freedom. Transmit confidence, raw desire, exclusivity, and strong visual power.

Output format: Short, punchy tweets (max 140 characters). Include at least one emoji that matches the vibe (🔥💥👀🎥💎👹🚨). Always close with a smooth but firm CTA like "Join the bot 👉 https://t.me/pnplatinotv_bot" or "Discover the new vibe at PNP LATINO TV".

Add powerful hashtags: #PNPLatinoTV #gaypnp #pnpgay #chemsex #tina #slam #hnh #clouds #VibraLatina #ContenidoExclusivo #SuscríbeteYa #GayPNP #PNPGay #Chemsex #Tina #Slam #HNH #Clouds #GayLeather #LeatherFetish #GayLeatherMen #LeatherGay #Bluf #GayFetish #GaySmoker #GaySmoking #MenWhoSmoke #GayBearSmoker #SatanicGay #HailSatan #OccultGay #Satanism #Baphomet #Lucifer #DarkSideGay #GayUSA #GayEurope #GayChina #GayLatino #GayLATAM #VibraOscura #ContenidoExclusivo

Main objective: Build desire to belong, spark curiosity, get clicks to the bot, and strengthen the brand identity.`;

      const defaultSystemPrompt = 'You are Grok, the official AI of X (Twitter). You are an expert in creating viral X posts, understanding the X algorithm, and maximizing engagement. You know what makes content go viral on X: authenticity, controversy, humor, value, and emotional resonance. You create bilingual content that performs exceptionally well.';

      const systemPrompt = tone === 'pnp_prime' ? pnpPrimeSystemPrompt : defaultSystemPrompt;

      // PNP Prime specific prompt
      const pnpPrimePrompt = `Create TWO high-performing post variations for X/Twitter - one in English and one in Spanish.

**CONTENT CONTEXT:**
Topic: ${videoTitle}
Description: ${videoDescription}
Goal: ${userGoal}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}

**PNP PRIME REQUIREMENTS:**
- Short, punchy content (max 140 characters per post)
- Include emojis that match the vibe (🔥💥👀🎥💎👹🚨)
- Always include CTA with Telegram bot link: https://t.me/pnplatinotv_bot
- Use PNP slang naturally: clouds, tina, slam, hnh, chemsex
- Bold, provocative, high-energy Latino vibe
- English and Spanish posts should have DIFFERENT angles

**HASHTAG REQUIREMENTS:**
Include 5-8 powerful hashtags from: #PNPLatinoTV #gaypnp #pnpgay #chemsex #tina #slam #hnh #clouds #VibraLatina #ContenidoExclusivo #GayLeather #LeatherFetish #GayFetish #GaySmoker #VibraOscura

Respond with JSON:
{
  "english": {
    "language": "en",
    "content": "Provocative hook + CTA + bot link (max 140 chars)",
    "hashtags": ["PNPLatinoTV", "gaypnp", "chemsex", "clouds", "ContenidoExclusivo"],
    "cta": "Join now 👉 https://t.me/pnplatinotv_bot"
  },
  "spanish": {
    "language": "es",
    "content": "Hook provocativo diferente + CTA + link del bot (max 140 chars)",
    "hashtags": ["PNPLatinoTV", "pnpgay", "VibraLatina", "ContenidoExclusivo", "tina"],
    "cta": "Únete ya 👉 https://t.me/pnplatinotv_bot"
  }
}`;

      const defaultPrompt = `You are Grok, X's AI expert in viral content creation and engagement optimization. Create TWO high-performing post variations (English and Spanish) for X/Twitter.

**VIDEO CONTEXT:**
Title: ${videoTitle}
Description: ${videoDescription}
User Goal: ${userGoal}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}

**X/TWITTER OPTIMIZATION REQUIREMENTS:**

🎯 **Content Strategy:**
- Max 250 characters (leave room for media/links)
- Hook in first 50 characters (visible before "show more")
- Use conversational, authentic tone
- Create FOMO, curiosity, or value proposition
- Posts should be DIFFERENT (not translations) - different angles/hooks

📊 **X Algorithm Optimization:**
- Front-load keywords for search/discovery
- Use power words: "exclusive", "limited", "secret", "first", "revealed"
- Include questions or statements that trigger replies
- Add controversy or hot takes (when appropriate)
- Create emotional resonance

💬 **Engagement Tactics:**
- Ask questions to drive comments
- Use cliffhangers or open loops
- Include relatable moments
- Add personality and humor when fitting
- Use emojis strategically (2-3 max)

#️⃣ **Hashtag Strategy (3-5 per post):**
- 1-2 trending/high-volume hashtags
- 2-3 niche-specific hashtags
- Mix English/Spanish appropriately
- Avoid spam hashtags

🚀 **Call-to-Action:**
- Natural, not salesy
- Create urgency when appropriate
- Align with user goal

**CRITICAL:** English and Spanish posts MUST have different angles to avoid spam detection and maximize reach.

Respond with JSON:
{
  "english": {
    "language": "en",
    "content": "Engaging hook + value + CTA (max 250 chars)",
    "hashtags": ["Trending1", "Niche2", "Specific3"],
    "cta": "Watch now 👀"
  },
  "spanish": {
    "language": "es",
    "content": "Hook diferente + valor + CTA (max 250 chars)",
    "hashtags": ["Tendencia1", "Nicho2", "Especifico3"],
    "cta": "Míralo ya 🔥"
  }
}`;

      const prompt = tone === 'pnp_prime' ? pnpPrimePrompt : defaultPrompt;

      logger.info('Generating post variants', { tone, isPnpPrime: tone === 'pnp_prime' });

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.9,
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
      logger.error('Error generating post variants with Grok:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
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
      logger.error('Error regenerating post variants with Grok:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
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
   * Generate caption for generic social media post with AI
   */
  public async generateCaption(
    prompt: string,
    options: {
      platform?: string;
      tone?: 'professional' | 'casual' | 'funny' | 'inspirational' | 'promotional' | 'pnp' | 'pnp_prime';
      length?: 'short' | 'medium' | 'long';
      includeHashtags?: boolean;
      includeEmojis?: boolean;
      targetAudience?: string;
      language?: 'en' | 'es';
    } = {}
  ): Promise<{ caption: string; hashtags: string[]; alternatives?: string[] }> {
    const {
      platform = 'twitter',
      tone = 'professional',
      length = 'medium',
      includeHashtags = true,
      includeEmojis = true,
      targetAudience = '',
      language = 'en',
    } = options;

    if (!this.enabled || !this.apiKey) {
      logger.warn('XAI is not enabled or API key is missing');
      return {
        caption: prompt.substring(0, 280),
        hashtags: includeHashtags ? ['socialmedia', 'content'] : [],
      };
    }

    try {
      const charLimits = {
        twitter: { short: 100, medium: 200, long: 280 },
        instagram: { short: 500, medium: 1000, long: 2200 },
        linkedin: { short: 500, medium: 1500, long: 3000 },
        facebook: { short: 500, medium: 2000, long: 5000 },
      };

      const platformLimit = charLimits[platform as keyof typeof charLimits] || charLimits.twitter;
      const maxChars = platformLimit[length];

      // X/Twitter-specific optimization
      const isXPlatform = platform === 'twitter';

      // PNP personality for PNP tone
      const pnpPersonalityPrompt = `You are PNP (Powered by Neural Pixels), an AI assistant with a fun, friendly, and slightly sassy personality.
Your characteristics:
- You speak both English and Spanish fluently, often mixing both (Spanglish) when it feels natural
- You're enthusiastic and encouraging, using emojis naturally 🚀✨
- You have a playful sense of humor but always stay helpful and professional
- You call users "crack", "máquina", "campeón/a" or similar encouraging terms
- You celebrate their wins and motivate them when they're stuck
- You're passionate about helping content creators succeed
- You occasionally use phrases like "¡Vamos!", "Let's gooo!", "A darle átomos!", "¡Eso es!"
- You're honest and direct - if something won't work, you say it kindly but clearly`;

      // PNP Prime personality for premium provocative Latino content
      const pnpPrimePrompt = `I am an expert Community Manager specialized in premium provocative Latino content for PNP LATINO TV. My goal: attract new subscribers and drive traffic to our official Telegram bot: https://t.me/pnplatinotv_bot.

Tone & style: Bold, high-energy, modern Latino vibe. Provocative and slightly explicit—always teasing, never crossing the line. Use real PNP slang: clouds, tina, slam, hnh, chemsex, with raw sexual energy, authenticity, and total freedom. Transmit confidence, raw desire, exclusivity, and strong visual power.

Output format: Short, punchy tweets (max 140 characters). Include at least one emoji that matches the vibe (🔥💥👀🎥💎👹🚨). Always close with a smooth but firm CTA like "Join the bot 👉 https://t.me/pnplatinotv_bot" or "Discover the new vibe at PNP LATINO TV".

Add powerful hashtags: #PNPLatinoTV #gaypnp #pnpgay #chemsex #tina #slam #hnh #clouds #VibraLatina #ContenidoExclusivo #SuscríbeteYa #GayPNP #PNPGay #Chemsex #Tina #Slam #HNH #Clouds #GayLeather #LeatherFetish #GayLeatherMen #LeatherGay #Bluf #GayFetish #GaySmoker #GaySmoking #MenWhoSmoke #GayBearSmoker #SatanicGay #HailSatan #OccultGay #Satanism #Baphomet #Lucifer #DarkSideGay #GayUSA #GayEurope #GayChina #GayLatino #GayLATAM #VibraOscura #ContenidoExclusivo

Main objective: Build desire to belong, spark curiosity, get clicks to the bot, and strengthen the brand identity.

Output language: ${language === 'es' ? 'Spanish' : 'English'}

Structure every tweet like this:
1. Hook: Provocative opening line
2. Body: Clear info about the event, drop, or content being teased
3. CTA + link to https://t.me/pnplatinotv_bot
4. Hashtags`;

      const systemPrompt = tone === 'pnp_prime'
        ? pnpPrimePrompt
        : tone === 'pnp'
        ? pnpPersonalityPrompt
        : isXPlatform
        ? `You are Grok, X's AI expert in viral content creation. You understand the X algorithm, what drives engagement, and how to craft posts that get maximum reach and interaction. You know the power of hooks, curiosity gaps, and emotional triggers.`
        : `You are an expert social media content creator and copywriter specializing in ${platform}. You create engaging, ${tone} content that drives engagement and aligns with platform best practices.`;

      const xOptimizations = isXPlatform ? `
🔥 **X-SPECIFIC OPTIMIZATION:**
- Hook in first 50 chars (visible before "show more")
- Use power words: "secret", "revealed", "exclusive", "banned"
- Create curiosity or controversy when appropriate
- Questions that trigger replies
- Thread-starter potential (cliffhangers)
- Emoji strategy: 2-3 max, placed strategically
- Avoid spam patterns
- Optimize for Retweets AND replies` : '';

      const userPrompt = `Create ${isXPlatform ? 'a high-engagement' : `a ${tone}`} ${platform === 'twitter' ? 'X' : platform} post based on this:

"${prompt}"

Requirements:
- Tone: ${tone}
- Length: ${length} (≈${maxChars} chars)
- Platform: ${platform === 'twitter' ? 'X/Twitter' : platform}
${targetAudience ? `- Target Audience: ${targetAudience}` : ''}
${includeEmojis ? '- Include emojis strategically' : '- No emojis'}
${includeHashtags ? '- Include 3-5 high-performing hashtags' : '- No hashtags'}
- Make it engaging, shareable, authentic
- Strong hook to grab attention${xOptimizations}

Provide 3 alternative variations with DIFFERENT approaches (not just rewording):
- Alternative 1: Question-based hook
- Alternative 2: Statement/controversial angle
- Alternative 3: Story/emotional angle

JSON format:
{
  "caption": "Main post (no hashtags in caption)",
  "hashtags": ["Hashtag1", "Hashtag2", "Hashtag3"],
  "alternatives": [
    "Alternative 1 - question approach",
    "Alternative 2 - statement approach",
    "Alternative 3 - story approach"
  ]
}`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          temperature: isXPlatform ? 0.9 : 0.8,
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

      const content = response.data.choices[0].message.content;
      const result = this.parseJSON(content);

      return {
        caption: result.caption || prompt.substring(0, maxChars),
        hashtags: includeHashtags ? (result.hashtags || []) : [],
        alternatives: result.alternatives || [],
      };
    } catch (error: any) {
      logger.error('Error generating caption with Grok:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      return {
        caption: prompt.substring(0, 280),
        hashtags: includeHashtags ? ['socialmedia', 'content'] : [],
      };
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

  /**
   * Generate English lesson for content creators
   */
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
      // For beginner and intermediate: instructions in Spanish, exercises in English
      // For advanced: everything in English
      const useSpanishInstructions = level === 'beginner' || level === 'intermediate';

      const languageInstructions = useSpanishInstructions
        ? `IMPORTANT LANGUAGE RULES:
- ALL instructions, explanations, tips, and descriptions MUST be in SPANISH
- The "introduction", "keyPoints", "explanation" fields, "contentCreatorTips", and "commonMistakes.explanation" MUST be in SPANISH
- Quiz "question" and "explanation" MUST be in SPANISH
- ONLY the English examples, exercise questions/answers, and quiz options should be in ENGLISH
- This helps Spanish-speaking beginners/intermediates understand while practicing English

Example format:
- introduction: "En esta lección aprenderás frases clave para tus redes sociales..."
- keyPoints: ["Aprenderás a usar verbos de acción", "Dominarás frases para engagement"]
- examples.explanation: "Usa esta frase cuando quieras motivar a tu audiencia"
- practiceExercises.question: "Complete the sentence: I ___ my followers" (exercise in English)
- contentCreatorTips: "Usa emojis para hacer tu contenido más atractivo 🔥"
- quiz.question: "¿Cuál es la forma correcta de decir 'me gusta'?"
- quiz.options: ["I like", "I likes", "Me like", "I liking"] (options in English)`
        : `LANGUAGE: Everything should be in English as this is an advanced lesson.`;

      const prompt = `You are an expert English teacher specializing in teaching Spanish-speaking content creators. Create a comprehensive English lesson.

Topic: ${topic}
Level: ${level}
Focus Area: ${focusArea}

${languageInstructions}

Create a lesson specifically designed for CONTENT CREATORS who need English for:
- Social media posts
- Video scripts
- Audience engagement
- Professional communication
- Marketing copy

Requirements:
1. Introduction explaining why this topic matters for content creators ${useSpanishInstructions ? '(EN ESPAÑOL)' : ''}
2. 5 key points to learn ${useSpanishInstructions ? '(EN ESPAÑOL)' : ''}
3. 5 practical examples with Spanish translations and explanations ${useSpanishInstructions ? '(explicaciones EN ESPAÑOL)' : ''}
4. 3 practice exercises (exercises in ENGLISH, hints in ${useSpanishInstructions ? 'SPANISH' : 'English'})
5. 3 tips specific to content creation ${useSpanishInstructions ? '(EN ESPAÑOL)' : ''}
6. 3 common mistakes Spanish speakers make ${useSpanishInstructions ? '(explicaciones EN ESPAÑOL)' : ''}
7. 5 quiz questions ${useSpanishInstructions ? '(preguntas y explicaciones EN ESPAÑOL, opciones en INGLÉS)' : ''}

Make the content:
- Practical and immediately usable
- Focused on social media and content creation contexts
- Culturally sensitive to Spanish speakers
- Fun and engaging
${useSpanishInstructions ? '- Friendly and encouraging in Spanish to help learners feel comfortable' : ''}

Respond ONLY with valid JSON in this exact format:
{
  "lesson": {
    "title": "${useSpanishInstructions ? 'Título atractivo en español' : 'Engaging lesson title'}",
    "introduction": "${useSpanishInstructions ? 'Por qué esto importa para creadores de contenido... (EN ESPAÑOL)' : 'Why this matters for content creators...'}",
    "keyPoints": ["${useSpanishInstructions ? 'Punto 1 en español' : 'Point 1'}", "${useSpanishInstructions ? 'Punto 2 en español' : 'Point 2'}", "..."],
    "examples": [
      {"english": "English phrase", "spanish": "Traducción al español", "explanation": "${useSpanishInstructions ? 'Cuándo usar esta frase (en español)' : 'When to use it'}"}
    ],
    "practiceExercises": [
      {"question": "Fill in: ___ (ENGLISH)", "answer": "correct answer", "hint": "${useSpanishInstructions ? 'pista en español' : 'optional hint'}"}
    ],
    "contentCreatorTips": ["${useSpanishInstructions ? 'Consejo 1 en español' : 'Tip 1'}", "..."],
    "commonMistakes": [
      {"wrong": "incorrect (English)", "correct": "correct (English)", "explanation": "${useSpanishInstructions ? 'explicación en español' : 'why'}"}
    ]
  },
  "quiz": [
    {"question": "${useSpanishInstructions ? '¿Pregunta en español?' : 'Question?'}", "options": ["A (English)", "B", "C", "D"], "correctIndex": 0, "explanation": "${useSpanishInstructions ? 'Por qué A es correcta (en español)' : 'Why A is correct'}"}
  ]
}`;

      const pnpTeacherPersonality = useSpanishInstructions
        ? `Eres PNP (Powered by Neural Pixels), un profesor de inglés súper divertido y energético para creadores de contenido hispanohablantes.

Tu estilo:
- Entusiasta y motivador - ¡celebra cada paso del aprendizaje! 🎉
- Hablas en ESPAÑOL para explicar, pero los ejercicios son en INGLÉS
- Usas ejemplos reales de redes sociales y trending phrases
- Llamas a los estudiantes "crack", "máquina", "campeón/a" para motivarlos
- Haces que las lecciones se sientan como charlar con un amigo bilingüe
- Usas emojis para hacer el contenido más atractivo 📚✨🚀
- Eres honesto sobre los errores comunes que cometemos los hispanohablantes
- Siempre terminas con ánimo: "¡Tú puedes!", "You got this!", "¡A darle!"
- RECUERDA: Instrucciones en ESPAÑOL, ejercicios en INGLÉS`
        : `You are PNP (Powered by Neural Pixels), a fun and energetic English teacher for Spanish-speaking content creators!
Your style:
- Enthusiastic and encouraging - celebrate every step of learning! 🎉
- Everything in English for advanced learners
- Include trending phrases, memes, and real social media examples
- Call students "crack", "máquina", "campeón/a" to motivate them
- Make lessons feel like chatting with a cool bilingual friend
- Use emojis to make content engaging 📚✨🚀
- Be honest about common mistakes Spanish speakers make (you get it!)
- Always end with encouragement: "¡Tú puedes!", "You got this!", "¡A darle!"`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: pnpTeacherPersonality,
            },
            {
              role: 'user',
              content: prompt,
            },
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
      logger.error('Error generating English lesson with Grok:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      return this.generateFallbackEnglishLesson(topic);
    }
  }

  /**
   * Translate and improve content for international audience
   */
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
      return {
        translation: content,
        improved: content,
        suggestions: [],
        culturalNotes: [],
      };
    }

    try {
      const langNames = { en: 'English', es: 'Spanish' };
      const prompt = `Translate and improve this ${context.replace('_', ' ')} content:

Original (${langNames[fromLang]}): "${content}"

Tasks:
1. Translate to ${langNames[toLang]}
2. Improve the translation for maximum engagement on social media
3. Provide 3 alternative suggestions
4. Add cultural notes for ${toLang === 'en' ? 'English-speaking' : 'Spanish-speaking'} audiences

Respond ONLY with valid JSON:
{
  "translation": "Direct translation",
  "improved": "Improved version optimized for engagement",
  "suggestions": ["Alternative 1", "Alternative 2", "Alternative 3"],
  "culturalNotes": ["Note about cultural differences", "Tip for the target audience"]
}`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
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
      logger.error('Error translating content:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      return {
        translation: content,
        improved: content,
        suggestions: [],
        culturalNotes: [],
      };
    }
  }

  /**
   * Generate scheduled post ideas for a week
   */
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
      const prompt = `You are a social media strategist. Generate a week's worth of post ideas for a content creator.

Niche: ${niche}
Platforms: ${platforms.join(', ')}
${previousPosts?.length ? `Previous posts to avoid repeating:\n${previousPosts.slice(0, 5).join('\n')}` : ''}

Create 14 posts (2 per day) for 7 days with:
- Optimal posting times
- Mix of content types
- Engaging content that drives engagement
- Platform-specific optimization
- Trending topics when relevant

Respond with JSON:
{
  "posts": [
    {
      "day": "Monday",
      "time": "09:00",
      "platform": "twitter",
      "type": "text",
      "idea": "Brief idea description",
      "content": "Full post content",
      "hashtags": ["hashtag1", "hashtag2"],
      "mediaIdea": "Optional media suggestion"
    }
  ]
}`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
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
      logger.error('Error generating weekly post ideas:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      return { posts: [] };
    }
  }

  /**
   * Chat with PNP (Grok) for content assistance
   */
  public async chat(
    message: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [],
    context: 'content_creation' | 'english_learning' | 'social_media' | 'general' = 'content_creation'
  ): Promise<{ response: string; suggestions?: string[] }> {
    if (!this.enabled || !this.apiKey) {
      return { response: '¡Hey! Soy PNP pero estoy tomando una siesta. Vuelve pronto! 😴' };
    }

    // PNP Personality: Fun, supportive, bilingual, with a touch of humor
    const pnpPersonality = `You are PNP (Powered by Neural Pixels), an AI assistant with a fun, friendly, and slightly sassy personality.
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

    const systemPrompts = {
      content_creation: `${pnpPersonality}

You specialize in helping content creators with post ideas, captions, video scripts, engagement strategies, and growing their social media presence. Be creative, helpful, and always hype them up! 💪`,
      english_learning: `${pnpPersonality}

You're also an amazing English tutor for Spanish-speaking content creators. Make learning English fun! Use memes, trending phrases, and real social media examples. Celebrate small wins and make them feel confident about learning. ¡Tú puedes, crack! 📚✨`,
      social_media: `${pnpPersonality}

You're a social media guru! Help with platform strategies, algorithm secrets, engagement tactics, and trending content ideas. Share insider tips like you're helping your best friend go viral. 📱🔥`,
      general: `${pnpPersonality}

Be yourself - witty, knowledgeable, and genuinely helpful. You're like that smart friend who always has the answers but never makes you feel dumb for asking. 🤝`,
    };

    try {
      const messages = [
        { role: 'system' as const, content: systemPrompts[context] },
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
      logger.error('Error in Grok chat:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      return { response: 'Sorry, I encountered an error. Please try again.' };
    }
  }

  /**
   * Fallback English lesson
   */
  private generateFallbackEnglishLesson(topic: string) {
    return {
      lesson: {
        title: `English for Content Creators: ${topic}`,
        introduction: 'AI service temporarily unavailable. Basic lesson structure provided.',
        keyPoints: ['Practice daily', 'Use real examples', 'Watch content in English', 'Practice writing', 'Get feedback'],
        examples: [{ english: 'Example coming soon', spanish: 'Ejemplo próximamente', explanation: 'Check back later' }],
        practiceExercises: [{ question: 'Practice exercise will be available soon', answer: 'N/A' }],
        contentCreatorTips: ['Be consistent', 'Use simple language', 'Engage with your audience'],
        commonMistakes: [{ wrong: 'Example', correct: 'Example', explanation: 'Available soon' }],
      },
      quiz: [{ question: 'Quiz coming soon', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: 'N/A' }],
    };
  }
}

export default new AIContentGenerationService();
