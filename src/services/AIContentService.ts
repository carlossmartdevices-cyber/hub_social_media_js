import OpenAI from 'openai';
import { config } from '../config';
import { AIGeneratedContent, AIContentRequest, Language, Platform } from '../core/content/types';
import { logger } from '../utils/logger';

/**
 * AIContentService - Grok-powered content generation for PNPtv social media posts
 *
 * This service uses xAI's Grok API (via OpenAI SDK) to generate bilingual,
 * brand-aligned social media content for X (Twitter) and Telegram platforms.
 */
export class AIContentService {
  private client: OpenAI | null = null;
  private readonly MASTER_PROMPT = `You are **PNPtv! Content Generator**, producing bilingual promotional posts for PNPtv's X and Telegram accounts.
Your tone is bold, horny, Latino, hazy, and playful — but your formatting MUST avoid all patterns that trigger spam systems.

---

# 🧱 **ANTI-SPAM RULES TO ALWAYS RESPECT**

To reduce platform risk, the following rules are MANDATORY:

### **1. No identical posts EVER**

Every post must be *completely unique* in:

* wording
* structure
* length
* emoji flow
* punchline
* hashtag mix
* link placement variation (but still present)

### **2. Vary hashtag order + selection**

* You *may* use required SEO hashtags, but rearrange them EACH TIME.
* Randomly include 3–7 hashtags (never all at once).
* Alternate between English-only tags and mixed bilingual tags.
* Never place hashtags in the exact same order twice.

### **3. Link safety (SUPER IMPORTANT)**

* Both links **must appear**, but NEVER back-to-back in identical positions.
* Randomize link order:

Examples:
Sometimes:

\`\`\`
https://t.me/pnptvbot
PNPtv.app
\`\`\`

Other times:

\`\`\`
PNPtv.app
https://t.me/pnptvbot
\`\`\`

But always **one link per line**, for clean copying.

### **4. No repetitive intros or closings**

Avoid phrases like:

* "Join now"
* "Subscribe today"
* "Get access now"
* "Click here"

Use natural, chatty, sexy, hazy phrasing instead.

### **5. Sentence structures must vary**

Some posts:

* short and punchy
* long and sensual
* teasing
* descriptive
* chaotic party vibe
* storytelling micro-moments

### **6. Keep it human, not automated**

Your writing should feel like a real person at a PNP party texting their followers.

### **7. Rotate emojis**

Do NOT reuse the same combos.
Mix them in every post.

---

# 🚀 **BILINGUAL OUTPUT FORMAT (TAP-TO-COPY FRIENDLY)**

You must ALWAYS respond with **exactly this structure**:

\`\`\`
🇺🇸 English (12 options)

1)
[Unique English post #1]
(links)
(hashtags)

2)
[Unique English post #2]
(links)
(hashtags)

...
12)
[Unique English post #12]
(links)
(hashtags)


🇪🇸 Español (12 opciones)

1)
[Unique Spanish post #1]
(links)
(hashtags)

2)
[Unique Spanish post #2]
(links)
(hashtags)

...
12)
[Unique Spanish post #12]
(links)
(hashtags)
\`\`\`

### Tap-to-copy safety rules:

* One blank line between posts.
* No indentation.
* Each post stands alone.
* Never include multiple posts in the same block.

---

# 🔥 **BRAND VOICE GUIDE (Sexy + Safe)**

Always include:

* Latino men
* PNP scenes
* smoking, clouding, slamming
* party haze
* fetish energy
* playful, slutty, bold tone
* a unique sassy punchline

NEVER use:

* explicit calls to "buy now"
* pushy language
* corporate tone

---

# 🔗 REQUIRED LINKS (with safe variation)

Include BOTH links in every post:

* https://t.me/pnptvbot
* PNPtv.app

Order should vary randomly but clearly separated on their own lines.

---

# 🌍 **SEO HASHTAGS (Anti-Spam Optimized)**

Use only a **random selection** of 3–7 tags per post from the following pool:

**English/General:**

* #PNP
* #PNPgay
* #CloudParty
* #Slamming
* #LatinoPNP
* #ChemLatino
* #GayLatino

**Spanish/General:**

* #PNP
* #GayPNP
* #LatinosPNP
* #FiestaCloud
* #SlamLatino

**Location Pool:**
USA: Miami, LA, NYC, Houston, Dallas, Atlanta
EUROPE: Berlin, Madrid, Barcelona, London, Amsterdam, Paris, Prague
ASIA: Tokyo, Bangkok, Taipei, Manila, Seoul

Formats example:

* #PNPMiami
* #PNPEurope
* #PNPBarcelona
* #PNPAsia
* #PNPTokyo

You MUST rotate cities and continents.

---

# 🎨 **CREATIVITY RULES**

* Every post ends with a different **sassy punchline**.
* Never repeat a punchline.
* Energy must feel like real party chat, not corporate marketing.
* Avoid robotic structure.

---

# 🚫 **NEVER DO THIS**

* Never repeat posts or templates.
* Never use the same emojis in the same positions.
* Never keep the same hashtag set two posts in a row.
* Never use identical sentence flow.
* Never explain your output.
* Never add disclaimers.`;

  constructor() {
    if (config.ai.grok.enabled && config.ai.grok.apiKey) {
      this.client = new OpenAI({
        apiKey: config.ai.grok.apiKey,
        baseURL: config.ai.grok.baseURL,
      });
      logger.info('AIContentService initialized with Grok API');
    } else {
      logger.warn('AIContentService: Grok API is disabled or API key is missing');
    }
  }

  /**
   * Check if the AI service is available
   */
  public isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Generate bilingual social media posts using Grok
   *
   * @param request - Configuration for content generation
   * @returns AIGeneratedContent with English and Spanish posts
   */
  public async generatePosts(request: AIContentRequest = {}): Promise<AIGeneratedContent> {
    if (!this.isAvailable()) {
      throw new Error('AI Content Service is not available. Please configure XAI_API_KEY.');
    }

    const optionsCount = request.optionsCount || 12;
    const userPrompt = `Generate ${optionsCount} unique social media posts for PNPtv in both English and Spanish. ${request.customInstructions || ''}`;

    try {
      logger.info('Generating AI content with Grok', { request });

      const response = await this.client!.chat.completions.create({
        model: config.ai.grok.model,
        messages: [
          { role: 'system', content: this.MASTER_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: config.ai.grok.temperature,
        max_tokens: config.ai.grok.maxTokens,
      });

      const generatedText = response.choices[0]?.message?.content || '';

      if (!generatedText) {
        throw new Error('No content generated from Grok API');
      }

      logger.info('Successfully generated AI content', {
        length: generatedText.length,
        model: response.model,
      });

      // Parse the generated content
      const parsedContent = this.parseGeneratedContent(generatedText, optionsCount);

      return {
        ...parsedContent,
        metadata: {
          generatedAt: new Date(),
          model: response.model,
          totalOptions: optionsCount * 2, // English + Spanish
        },
      };
    } catch (error: any) {
      logger.error('Error generating AI content', {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`Failed to generate AI content: ${error.message}`);
    }
  }

  /**
   * Parse the generated content from Grok into structured format
   *
   * @param content - Raw text from Grok
   * @param expectedCount - Expected number of posts per language
   * @returns Structured English and Spanish posts
   */
  private parseGeneratedContent(
    content: string,
    expectedCount: number
  ): { english: any[]; spanish: any[] } {
    const english: any[] = [];
    const spanish: any[] = [];

    try {
      // Split content into English and Spanish sections
      const sections = content.split(/🇪🇸\s+Español/i);
      const englishSection = sections[0];
      const spanishSection = sections[1] || '';

      // Extract English posts
      const englishMatches = englishSection.match(/\d+\)([\s\S]*?)(?=\d+\)|$)/g) || [];
      for (const match of englishMatches) {
        const post = this.extractPostDetails(match);
        if (post) english.push(post);
      }

      // Extract Spanish posts
      const spanishMatches = spanishSection.match(/\d+\)([\s\S]*?)(?=\d+\)|$)/g) || [];
      for (const match of spanishMatches) {
        const post = this.extractPostDetails(match);
        if (post) spanish.push(post);
      }

      // If parsing failed, create fallback posts
      if (english.length === 0 || spanish.length === 0) {
        logger.warn('Failed to parse structured content, using raw content');
        return this.createFallbackPosts(content, expectedCount);
      }

      logger.info('Successfully parsed AI content', {
        englishPosts: english.length,
        spanishPosts: spanish.length,
      });

      return { english, spanish };
    } catch (error: any) {
      logger.error('Error parsing AI content', { error: error.message });
      return this.createFallbackPosts(content, expectedCount);
    }
  }

  /**
   * Extract post details (text, hashtags, links) from a single post match
   */
  private extractPostDetails(postText: string): any | null {
    try {
      // Remove the number prefix
      const cleanText = postText.replace(/^\d+\)\s*/, '').trim();

      if (!cleanText) return null;

      // Extract hashtags
      const hashtagMatches = cleanText.match(/#\w+/g) || [];
      const hashtags = hashtagMatches.map(tag => tag.trim());

      // Extract links
      const linkMatches = cleanText.match(/https?:\/\/[^\s]+|PNPtv\.app/gi) || [];
      const links = linkMatches.map(link => link.trim());

      // Get text without hashtags at the end (but keep them in middle of text)
      let text = cleanText;
      const hashtagBlock = cleanText.match(/\n(#\w+(\s+#\w+)*)\s*$/);
      if (hashtagBlock) {
        text = cleanText.replace(hashtagBlock[0], '').trim();
      }

      return {
        text,
        hashtags,
        links,
      };
    } catch (error: any) {
      logger.error('Error extracting post details', { error: error.message });
      return null;
    }
  }

  /**
   * Create fallback posts if parsing fails
   */
  private createFallbackPosts(
    rawContent: string,
    count: number
  ): { english: any[]; spanish: any[] } {
    const fallbackPost = {
      text: rawContent.substring(0, 280), // Twitter character limit
      hashtags: ['#PNP', '#PNPgay', '#LatinoPNP'],
      links: ['https://t.me/pnptvbot', 'PNPtv.app'],
    };

    return {
      english: Array(count).fill(fallbackPost),
      spanish: Array(count).fill(fallbackPost),
    };
  }

  /**
   * Generate a single post for a specific platform and language
   *
   * @param platform - Target platform
   * @param language - Target language
   * @returns Single generated post
   */
  public async generateSinglePost(
    platform: Platform,
    language: Language = Language.ENGLISH
  ): Promise<string> {
    const request: AIContentRequest = {
      platform,
      language,
      optionsCount: 1,
      customInstructions: `Generate a single ${language === Language.ENGLISH ? 'English' : 'Spanish'} post optimized for ${platform}.`,
    };

    const content = await this.generatePosts(request);
    const posts = language === Language.ENGLISH ? content.english : content.spanish;

    if (posts.length === 0) {
      throw new Error('Failed to generate post content');
    }

    // Return the full post with text, links, and hashtags
    const post = posts[0];
    return `${post.text}\n\n${post.links.join('\n')}\n\n${post.hashtags.join(' ')}`;
  }
}

// Export singleton instance
export const aiContentService = new AIContentService();
