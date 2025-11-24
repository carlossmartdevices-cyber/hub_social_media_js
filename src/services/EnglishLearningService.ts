import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';

interface EnglishLearningQuery {
  question: string;
  context?: string; // Optional context about the content creator's specific situation
  level?: 'beginner' | 'intermediate' | 'advanced';
}

interface EnglishLearningResponse {
  answer: string;
  examples: string[];
  tips: string[];
  vocabulary: Array<{ word: string; definition: string; example: string }>;
  culturalNotes?: string;
}

/**
 * English Learning Service for Adult Content Creators on Social Media
 *
 * This service provides specialized English language learning assistance
 * tailored for content creators in the adult entertainment industry who need
 * to communicate effectively on social media platforms.
 */
export class EnglishLearningService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private enabled: boolean;

  // Knowledge base for adult content creator terminology
  private readonly contentCreatorKnowledgeBase = `
SPECIALIZED KNOWLEDGE BASE FOR ADULT CONTENT CREATORS:

**Professional Terminology:**
- Creator Economy: The business model where individuals monetize their content and audience
- Subscriber/Fan: A person who pays for exclusive content access
- PPV (Pay-Per-View): Content that requires additional payment beyond subscription
- Engagement Rate: Percentage of followers who interact with content
- Content Calendar: Schedule for posting content across platforms
- Monetization: Converting content/audience into revenue
- Brand Collaboration: Working with companies for sponsored content
- Audience Demographics: Statistics about followers (age, location, interests)

**Platform-Specific Terms:**
- OnlyFans, Fansly: Subscription-based platforms for exclusive content
- Twitter/X Spaces: Live audio conversations
- Instagram Reels: Short-form video content
- TikTok: Short-form video platform
- Reddit: Discussion forums organized by topics (subreddits)
- Telegram: Messaging app with channels and groups

**Communication Best Practices:**
- Professional tone while maintaining personality
- Clear boundaries and consent language
- Marketing without being overly promotional
- Building authentic connections with audience
- Handling DMs (Direct Messages) professionally
- Responding to comments and feedback
- Promoting content without violating platform rules

**Common Scenarios:**
1. Announcing new content releases
2. Thanking supporters
3. Setting boundaries with fans
4. Promoting special offers
5. Collaborating with other creators
6. Addressing technical issues
7. Building hype for upcoming content
8. Responding to negative comments professionally
`;

  constructor() {
    this.apiKey = config.ai.grok.apiKey || '';
    this.baseUrl = config.ai.grok.baseURL || 'https://api.x.ai/v1';
    this.model = config.ai.grok.model || 'grok-beta';
    this.enabled = config.ai.grok.enabled || false;
  }

  /**
   * Answer English learning questions with specialized context for adult content creators
   */
  public async answerEnglishQuestion(query: EnglishLearningQuery): Promise<EnglishLearningResponse> {
    if (!this.enabled || !this.apiKey) {
      logger.warn('XAI is not enabled or API key is missing');
      return this.generateFallbackResponse(query.question);
    }

    try {
      const levelContext = this.getLevelContext(query.level || 'intermediate');

      const prompt = `You are an expert English teacher specializing in helping adult content creators communicate professionally and effectively on social media platforms.

${this.contentCreatorKnowledgeBase}

**Student's English Level:** ${query.level || 'intermediate'}
${levelContext}

**Student's Question:** ${query.question}
${query.context ? `\n**Additional Context:** ${query.context}` : ''}

**Your Task:**
Provide a comprehensive, professional answer that helps this content creator improve their English communication skills. Your response should be:

1. **Clear and Direct:** Answer their specific question
2. **Practical:** Provide real-world examples they can use immediately
3. **Professional:** Maintain respect for their profession while being educational
4. **Contextual:** Consider the unique challenges of communicating in this industry
5. **Actionable:** Give specific tips they can implement today

Include:
- A clear explanation of the concept
- 3-5 practical examples in context
- Professional tips for implementation
- Relevant vocabulary with definitions and usage examples
- Cultural notes about English-speaking audiences (if applicable)

**Important Guidelines:**
- Be professional and respectful
- Focus on business communication and marketing language
- Teach proper grammar and vocabulary
- Explain cultural nuances that might affect communication
- Provide alternatives for different formality levels
- Consider platform-specific communication styles (Twitter vs Instagram vs Reddit)

Respond ONLY with valid JSON in this exact format:
{
  "answer": "Clear, comprehensive explanation of the concept",
  "examples": [
    "Example 1 showing proper usage in context",
    "Example 2 showing variation",
    "Example 3 showing professional application"
  ],
  "tips": [
    "Practical tip 1 for implementation",
    "Practical tip 2 for avoiding common mistakes",
    "Practical tip 3 for cultural awareness"
  ],
  "vocabulary": [
    {
      "word": "relevant term",
      "definition": "clear definition",
      "example": "usage example in context"
    }
  ],
  "culturalNotes": "Important cultural context or nuances to be aware of"
}`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a professional, respectful English teacher who specializes in helping content creators communicate effectively on social media. You understand business English, marketing language, and the unique challenges of the creator economy.',
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
        answer: result.answer || 'Unable to generate answer',
        examples: result.examples || [],
        tips: result.tips || [],
        vocabulary: result.vocabulary || [],
        culturalNotes: result.culturalNotes,
      };
    } catch (error: any) {
      logger.error('Error answering English question with Grok:', error);
      return this.generateFallbackResponse(query.question);
    }
  }

  /**
   * Get suggested English learning topics for content creators
   */
  public async getSuggestedTopics(): Promise<string[]> {
    return [
      'How to write engaging captions for Instagram posts',
      'Professional ways to thank subscribers',
      'How to handle negative comments in English',
      'Marketing vocabulary for content promotion',
      'Writing effective call-to-actions (CTAs)',
      'Understanding slang and informal English on social media',
      'How to set boundaries politely in English',
      'Email etiquette for business collaborations',
      'Creating hype: vocabulary for excitement and anticipation',
      'How to describe content without violating platform rules',
      'Professional DM responses',
      'Collaboration language: reaching out to other creators',
      'Apologizing and handling mistakes professionally',
      'Building urgency: limited-time offer language',
      'Expressing gratitude to your audience',
    ];
  }

  /**
   * Generate practice scenarios based on user's level
   */
  public async generatePracticeScenario(
    scenario: string,
    level: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<{
    situation: string;
    challenge: string;
    suggestedResponse: string;
    alternatives: string[];
    vocabulary: string[];
  }> {
    if (!this.enabled || !this.apiKey) {
      logger.warn('XAI is not enabled or API key is missing');
      return {
        situation: scenario,
        challenge: 'Practice writing a response',
        suggestedResponse: 'Response not available',
        alternatives: [],
        vocabulary: [],
      };
    }

    try {
      const prompt = `Create a realistic practice scenario for an ${level} English learner who is an adult content creator.

Scenario Type: ${scenario}

Generate a practice exercise with:
1. A realistic situation they might encounter
2. The communication challenge they need to solve
3. A model response appropriate for their level
4. 2-3 alternative ways to say the same thing
5. Key vocabulary they should know

Respond in JSON format:
{
  "situation": "Description of the realistic scenario",
  "challenge": "What they need to communicate",
  "suggestedResponse": "Model response at appropriate level",
  "alternatives": ["Alternative 1", "Alternative 2"],
  "vocabulary": ["word1", "word2", "word3"]
}`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
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
      return this.parseJSON(content);
    } catch (error: any) {
      logger.error('Error generating practice scenario:', error);
      return {
        situation: scenario,
        challenge: 'Practice writing a response',
        suggestedResponse: 'Response not available',
        alternatives: [],
        vocabulary: [],
      };
    }
  }

  /**
   * Get level-specific context
   */
  private getLevelContext(level: string): string {
    const contexts = {
      beginner: `
**Beginner Level Approach:**
- Use simple, clear sentences
- Explain basic grammar rules
- Provide phonetic pronunciations when helpful
- Focus on fundamental vocabulary
- Give step-by-step breakdowns`,
      intermediate: `
**Intermediate Level Approach:**
- Use moderate complexity in explanations
- Introduce idioms and common phrases
- Explain nuances between similar words
- Focus on practical application
- Introduce more advanced vocabulary in context`,
      advanced: `
**Advanced Level Approach:**
- Discuss subtle differences and nuances
- Introduce sophisticated vocabulary and expressions
- Explain cultural context and connotations
- Focus on style, tone, and persuasive language
- Discuss regional variations (US vs UK English)`,
    };

    return contexts[level as keyof typeof contexts] || contexts.intermediate;
  }

  /**
   * Parse JSON from Grok response
   */
  private parseJSON(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }

      throw new Error('Could not parse JSON from response');
    }
  }

  /**
   * Fallback response when AI is not available
   */
  private generateFallbackResponse(question: string): EnglishLearningResponse {
    return {
      answer: 'I apologize, but the English learning assistant is currently unavailable. Please check your API configuration.',
      examples: [
        'Please ensure XAI_API_KEY is configured in your .env file',
        'Set XAI_ENABLED=true to enable this feature',
      ],
      tips: [
        'Check your .env configuration',
        'Verify your API key is valid',
        'Try again later',
      ],
      vocabulary: [],
      culturalNotes: 'Service temporarily unavailable',
    };
  }
}

export default new EnglishLearningService();
