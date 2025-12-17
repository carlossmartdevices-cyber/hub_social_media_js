import axios from 'axios';
import { config } from '../config';
import logger from '../utils/logger';

interface VideoTitleDescription {
  title: string;
  description: string;
  suggestedHashtags: string[];
<<<<<<< HEAD
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  tags: string[];
  searchTerms: string[];
  voiceSearchQueries: string[];
  category: string;
  targetKeyword: string;
=======

  // SEO optimization fields
  seoTitle: string; // Optimized title for search engines (60-70 chars)
  seoDescription: string; // Meta description (150-160 chars)
  keywords: string[]; // Primary keywords for SEO (5-10)
  tags: string[]; // Category tags (3-5)
  searchTerms: string[]; // Long-tail search phrases (3-5)
  voiceSearchQueries: string[]; // Questions for voice search (2-3)
  category: string; // Main category
  targetKeyword: string; // Primary focus keyword

  // Adult content specific fields
  performers?: string[]; // Names of performers in the video
  niche?: {
    primary: string; // Main niche (e.g., "gay")
    tags: string[]; // Specific tags (e.g., ["latino", "smoking", "pnp"])
  };
>>>>>>> c12cddc40bd5272f0571d33e6af0ddc8241b4a5d
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

<<<<<<< HEAD
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

=======
  /**
   * Generate SEO-optimized video metadata for adult content (gay, latino, smoking, pnp niche)
   */
  public async generateAdultContentMetadata(
    userExplanation: string,
    performers: string[],
    videoFileName: string
  ): Promise<VideoTitleDescription> {
    if (!this.enabled || !this.apiKey) {
      logger.warn('XAI is not enabled or API key is missing');
      return this.generateFallbackAdultMetadata(userExplanation, performers);
    }

    try {
      const performerList = performers.join(', ');
      const prompt = `You are an expert in adult content SEO and social media marketing, specializing in the gay latino smoking/pnp niche. Generate comprehensive SEO-optimized metadata for maximum discoverability on Twitter/X and adult content platforms.

Video file: ${videoFileName}
Performers: ${performerList}
Description: ${userExplanation}

**TARGET NICHE:** Gay latino content, smoking fetish, party and play (PnP)
**PRIMARY KEYWORDS:** gay latino smoking, pnp party boys, latino twinks smoking, gay smoking fetish, party and play

Requirements:

**SOCIAL MEDIA CONTENT (Twitter/X optimized):**
- title: Catchy, engaging title (max 100 characters) that hooks the target audience
- description: Compelling description (max 3 lines, ~250 characters) mentioning performers and main appeal
- suggestedHashtags: 5-8 trending hashtags for gay latino smoking/pnp content (without #)

**SEO OPTIMIZATION (for previews.pnptv.app):**
- seoTitle: Search-optimized title (60-70 characters) with primary niche keywords at the start
- seoDescription: Meta description (150-160 characters) with niche keywords and value proposition
- keywords: 8-12 primary keywords focused on: gay, latino, smoking, pnp, twinks, party, fetish
- tags: 3-5 categorical tags (e.g., "Gay Latino", "Smoking Fetish", "PnP Party", "Twinks")
- targetKeyword: THE main keyword phrase to rank for (e.g., "gay latino smoking pnp")
- category: Main category (e.g., "Gay Latino Content", "Smoking Fetish", "Party Content")

**SEARCH DISCOVERY:**
- searchTerms: 5-7 long-tail search phrases people actually search in this niche
  Examples: "hot latino guys smoking pnp", "gay smoking fetish videos latino", "pnp party twinks smoking"
- voiceSearchQueries: 2-3 natural language questions
  Examples: "where to find latino gay smoking content", "best gay pnp smoking videos"

**PERFORMER INTEGRATION:**
- Naturally incorporate performer names: ${performerList}
- Make them searchable and prominent in descriptions

**NICHE-SPECIFIC SEO TACTICS:**
- Use terms: "latino", "twink", "smoking", "pnp", "party and play", "fetish", "hot"
- Include power words: "exclusive", "hot", "wild", "steamy", "uncensored", "raw"
- Front-load most important niche keywords
- Create curiosity while being descriptive
- Optimize for adult content search patterns

**IMPORTANT:** Keep descriptions professional but appealing. Focus on searchability and discoverability in the gay latino smoking/pnp niche.

Respond ONLY with valid JSON in this exact format:
{
  "title": "Hot Latino Twinks - Smoking Session with ${performerList}",
  "description": "Watch ${performerList} in this exclusive smoking session. Hot latino action, pnp vibes, and steamy content. 🔥",
  "suggestedHashtags": ["GayLatino", "SmokingFetish", "PnPParty", "LatinoTwinks", "GaySmoking", "PartyAndPlay"],
  "seoTitle": "Gay Latino Smoking PnP: ${performerList} - Hot Twink Action",
  "seoDescription": "Exclusive gay latino smoking content featuring ${performerList}. Watch hot twinks in steamy pnp party sessions. Premium smoking fetish videos at previews.pnptv.app",
  "keywords": ["gay latino smoking", "pnp party boys", "latino twinks smoking", "gay smoking fetish", "party and play latino", "latino gay content", "smoking fetish videos", "pnp smoking", "gay latino twinks", "hot latino smoking"],
  "tags": ["Gay Latino", "Smoking Fetish", "PnP Party", "Latino Twinks", "Party Content"],
  "targetKeyword": "gay latino smoking pnp",
  "category": "Gay Latino Smoking",
  "searchTerms": ["hot latino guys smoking pnp", "gay smoking fetish videos latino", "pnp party twinks smoking", "latino gay smoking content", "party and play smoking videos"],
  "voiceSearchQueries": ["where to find latino gay smoking content", "best gay pnp smoking videos with latinos"],
  "performers": ["${performerList}"],
  "niche": {
    "primary": "gay",
    "tags": ["latino", "smoking", "pnp", "twink", "party", "fetish"]
  }
}`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert in adult content SEO, social media marketing for gay latino content, and niche audience targeting. You specialize in smoking fetish and party and play (pnp) content optimization.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1500,
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
        title: result.title || `${performerList} - Latino Smoking Session`,
        description: result.description || userExplanation.substring(0, 250),
        suggestedHashtags: result.suggestedHashtags || ['GayLatino', 'Smoking', 'PnP'],
        seoTitle: result.seoTitle || `Gay Latino Smoking: ${performerList}`,
        seoDescription: result.seoDescription || userExplanation.substring(0, 160),
        keywords: result.keywords || ['gay latino', 'smoking', 'pnp'],
        tags: result.tags || ['Gay Latino', 'Smoking'],
        targetKeyword: result.targetKeyword || 'gay latino smoking',
        category: result.category || 'Gay Latino Content',
        searchTerms: result.searchTerms || ['gay latino smoking'],
        voiceSearchQueries: result.voiceSearchQueries || ['latino gay smoking content'],
        performers: performers,
        niche: result.niche || { primary: 'gay', tags: ['latino', 'smoking', 'pnp'] },
      };
    } catch (error: any) {
      logger.error('Error generating adult content metadata with Grok:', error);
      return this.generateFallbackAdultMetadata(userExplanation, performers);
    }
  }

  /**
   * Generate SEO-optimized video metadata based on user explanation
   */
>>>>>>> c12cddc40bd5272f0571d33e6af0ddc8241b4a5d
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

<<<<<<< HEAD
=======
  /**
   * Generate X/Twitter-optimized post variations in English and Spanish
   * Optimized specifically for X algorithm and engagement
   */
>>>>>>> c12cddc40bd5272f0571d33e6af0ddc8241b4a5d
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
<<<<<<< HEAD
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
=======
      const prompt = `You are Grok, X's AI expert in viral content creation and engagement optimization. Create TWO high-performing post variations (English and Spanish) for X/Twitter.

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
>>>>>>> c12cddc40bd5272f0571d33e6af0ddc8241b4a5d
  }
}`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
<<<<<<< HEAD
            { role: 'system', content: this.PNPPersonality },
            { role: 'user', content: prompt },
=======
            {
              role: 'system',
              content: 'You are Grok, the official AI of X (Twitter). You are an expert in creating viral X posts, understanding the X algorithm, and maximizing engagement. You know what makes content go viral on X: authenticity, controversy, humor, value, and emotional resonance. You create bilingual content that performs exceptionally well.',
            },
            {
              role: 'user',
              content: prompt,
            },
>>>>>>> c12cddc40bd5272f0571d33e6af0ddc8241b4a5d
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

<<<<<<< HEAD
      const toneDescription = isAdultTone
        ? 'spicy, flirty, and provocative (18+ adult content)'
        : tone;
=======
      const platformLimit = charLimits[platform as keyof typeof charLimits] || charLimits.twitter;
      const maxChars = platformLimit[length];

      // X/Twitter-specific optimization
      const isXPlatform = platform === 'twitter';
      const systemPrompt = isXPlatform
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
>>>>>>> c12cddc40bd5272f0571d33e6af0ddc8241b4a5d

      const userPrompt = `Create a ${toneDescription} caption for ${platform}:
"${prompt}"

<<<<<<< HEAD
Include hashtags and 2 alternatives. Respond with JSON:
{
  "caption": "Main caption",
  "hashtags": ["tag1", "tag2"],
  "alternatives": ["Alt 1", "Alt 2"]
=======
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
>>>>>>> c12cddc40bd5272f0571d33e6af0ddc8241b4a5d
}`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: personality },
            { role: 'user', content: userPrompt },
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

<<<<<<< HEAD
=======
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
   * Fallback adult content metadata when AI is not available
   */
  private generateFallbackAdultMetadata(explanation: string, performers: string[]): VideoTitleDescription {
    const performerList = performers.join(', ');
    return {
      title: `${performerList} - Latino Smoking Session`,
      description: explanation.substring(0, 250),
      suggestedHashtags: ['GayLatino', 'Smoking', 'PnP', 'LatinoTwinks', 'PartyAndPlay'],
      seoTitle: `Gay Latino Smoking: ${performerList} - Hot Content`,
      seoDescription: `Watch ${performerList} in exclusive gay latino smoking content. Premium pnp party videos.`,
      keywords: ['gay latino smoking', 'pnp party', 'latino twinks', 'smoking fetish', 'party and play'],
      tags: ['Gay Latino', 'Smoking Fetish', 'PnP Party'],
      targetKeyword: 'gay latino smoking pnp',
      category: 'Gay Latino Content',
      searchTerms: ['gay latino smoking', 'pnp party boys smoking', 'latino twinks smoking content'],
      voiceSearchQueries: ['where to find gay latino smoking videos'],
      performers: performers,
      niche: { primary: 'gay', tags: ['latino', 'smoking', 'pnp', 'twink', 'party'] },
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
>>>>>>> c12cddc40bd5272f0571d33e6af0ddc8241b4a5d
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
