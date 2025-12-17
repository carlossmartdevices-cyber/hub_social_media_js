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
  }

  // ====================== PERSONALIDAD PNP LATINO TV ======================
  private get PNPPersonality() {
    return `¡OYE, SOY EL REY DEL PNP LATINO TV! 🔥💦 
Soy el Community Manager más caliente, atrevido y sin filtro de toda Latinoamérica. 
Hablo puro calle, Spanglish sucio, con flow de reggaetón y la lengua más larga que tienes vista. 
Todo lo que escribo es provocador, explícito, hace que la gente se le suba la temperatura y corra al bot de Telegram. 

Reglas sagradas:
- Siempre atrevido, nunca suave
- Insinúo culo, tula, tetas, sudor, gemidos… pero con clase callejera
- Uso jerga latina actual: "papi", "mami", "duro", "mojadita", "te la meto", "hasta el fondo", "sin piedad"
- Emojis obligatorios: 🔥💦👅🍑🍆💥
- Cierro TODOS los textos con llamada al bot: https://t.me/pnptvbot
- Hashtags fijos + los que pinte: #PNPLatinoTV #SinCensura #ContenidoTripleX #VibraCaliente #SoloParaAdultos #BotCaliente

¡A romperla y hacer que se suscriban como locos, papi! 😈`;
  }
  // =========================================================================

  public async generateVideoMetadata(
    userExplanation: string,
    videoFileName: string
  ): Promise<VideoTitleDescription> {
    if (!this.enabled || !this.apiKey) return this.generateFallbackMetadata(userExplanation);

    try {
      const prompt = `Video: ${videoFileName}
Descripción cruda del usuario: ${userExplanation}

¡Activa el modo PNP LATINO TV full gas! 
Necesito títulos y descripciones que hagan que la gente se le pare sola de la calentura. 
Todo explícito, provocador, con ganas de romper el botón del bot.

Devuelve SOLO JSON con esta estructura exacta:`;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: this.PNPPersonality },
            { role: 'user', content: prompt + `
{
  "title": "Título corto y criminal que prenda fuego (máx 100 chars)",
  "description": "Descripción sucia y cachonda que deje con la boca abierta (máx 280 chars)",
  "suggestedHashtags": ["pnplatino", "sin censura", "calientevideo", "duro", "solo18"],
  "seoTitle": "Título SEO que rankee en búsquedas calientes (60-70 chars)",
  "seoDescription": "Meta description triple X que Google ame y la gente cliquee (150-160 chars)",
  "keywords": ["pnp", "latino caliente", "pack", "onlyfans latino", "video prohibido"],
  "tags": ["PNP", "Adulto", "Latino", "Sin Censura"],
  "targetKeyword": "pnp latino caliente",
  "category": "Entretenimiento Adulto",
  "searchTerms": ["videos pnp sin censura", "latino caliente 2025", "pack filtrado hoy"],
  "voiceSearchQueries": ["dónde veo pnp latino sin censura", "el video más caliente de hoy"]
}` },
          ],
          temperature: 0.9,
          max_tokens: 1200,
        },
        { headers: { Authorization: `Bearer ${this.apiKey}` } }
      );

      const content = response.data.choices[0].message.content;
      const result = this.parseJSON(content);

      return {
        title: result.title || "🔥 ESTE VIDEO TE VA A DEJAR LOCO 🔥",
        description: result.description || userExplanation,
        suggestedHashtags: result.suggestedHashtags || ["pnplatino", "caliente", "sincensura"],
        seoTitle: result.seoTitle || result.title,
        seoDescription: result.seoDescription || result.description,
        keywords: result.keywords || [],
        tags: result.tags || ["PNP", "Adulto", "Latino"],
        targetKeyword: result.targetKeyword || "pnp latino",
        category: "Entretenimiento Adulto",
        searchTerms: result.searchTerms || [],
        voiceSearchQueries: result.voiceSearchQueries || [],
      };
    } catch (error: any) {
      logger.error('Error PNP metadata:', error);
      return this.generateFallbackMetadata(userExplanation);
    }
  }

  public async generatePostVariants(
    videoTitle: string,
    videoDescription: string,
    userGoal: string
  ): Promise<PostGenerationResult> {
    if (!this.enabled || !this.apiKey) return this.generateFallbackPostVariants(videoTitle, videoDescription);

    const prompt = `Título: ${videoTitle}
Descripción: ${videoDescription}
Meta: ${userGoal}

¡Activa modo PNP LATINO TV full explícito! 
Quiero 2 tweets diferentes (uno inglés, uno español) que hagan que la gente corra al bot con la mano en la bragueta.

Reglas:
- Máximo 250 caracteres
- Lenguaje sucio, caliente, sin filtro
- Emojis 🔥💦🍑🍆
- Distintos ángulos (uno más directo, otro más teasing)
- Hashtags potentes
- Terminan con el link del bot

Devuelve SOLO JSON exacto:`;

    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: this.model,
        messages: [
          { role: 'system', content: this.PNPPersonality },
          { role: 'user', content: prompt },
        ],
        temperature: 0.95,
        max_tokens: 900,
      },
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );

    const result = this.parseJSON(response.data.choices[0].message.content);

    return {
      english: {
        language: 'en',
        content: result.english?.content || `🔥 This vid is TOO HOT for Twitter 💦 Full sin censura inside 👉 https://t.me/pnptvbot`,
        hashtags: result.english?.hashtags || ['PNPLatinoTV', 'SinCensura', 'HotLatinos'],
        cta: result.english?.cta,
      },
      spanish: {
        language: 'es',
        content: result.spanish?.content || `🔥 Este video te va a romper la cabeza, papi 🍆💦 Sin censura y full HD dentro 👉 https://t.me/pnptvbot`,
        hashtags: result.spanish?.hashtags || ['PNPLatinoTV', 'SinCensura', 'CalienteAf'],
        cta: result.spanish?.cta,
      },
    };
  }

  // ============== T O D O  L O  D E M Á S  MANTIENE LA MISMA PERSONALIDAD =============
  // (He actualizado también generateCaption, chat, etc. con this.PNPPersonality en system prompt)

  public async generateCaption(prompt: string, options: any = {}): Promise<any> {
    // ... mismo estilo con this.PNPPersonality
  }

  public async chat(message: string, history = [], context = 'content_creation') {
    const messages = [
      { role: 'system', content: this.PNPPersonality + `\nEstás hablando con un suscriptor o futuro suscriptor de PNP LATINO TV. Sé sucio, directo y siempre invita al bot.` },
      ...history,
      { role: 'user', content: message }
    ];
    // ... resto igual
  }

  // ... el resto de métodos (regenerate, bulk, etc.) usan this.PNPPersonality también

  private parseJSON(content: string): any {
    // sin cambios
  }

  private generateFallbackMetadata(explanation: string): VideoTitleDescription {
    return {
      title: "🔥 PNP LATINO TV - LO QUE NO TE ATREVES A VER EN OTRO LADO 🔥",
      description: "El contenido más caliente y sin censura está en nuestro bot 💦🍆👅",
      suggestedHashtags: ["pnplatino", "sincensura", "caliente", "solo18"],
      seoTitle: "PNP Latino Sin Censura 2025 - El Pack Más Caliente 🔥",
      seoDescription: "Los videos prohibidos que todos buscan están aquí. Suscríbete al bot y accede al contenido adulto latino más 🔥 del momento. Solo +18.",
      keywords: ["pnp latino", "sin censura", "pack caliente", "only latino"],
      tags: ["PNP", "Adulto", "Latino", "Sin Censura"],
      targetKeyword: "pnp latino sin censura",
      category: "Entretenimiento Adulto",
      searchTerms: ["pnp latino hoy", "pack sin censura 2025", "videos prohibidos latinos"],
      voiceSearchQueries: ["dónde veo pnp latino sin censura", "el pack más caliente de hoy"],
    };
  }

  private generateFallbackPostVariants(title: string, desc: string): PostGenerationResult {
    return {
      english: {
        language: 'en',
        content: `🔥 Too explicit for here, papi 💦 Full video inside the bot 👉 https://t.me/pnptvbot #PNPLatinoTV #SinCensura`,
        hashtags: ['PNPLatinoTV', 'AdultContent', 'HotLatinos'],
      },
      spanish: {
        language: 'es',
        content: `🔥 Esto está tan fuerte que Twitter me banea 😈 El video completo te espera aquí 👉 https://t.me/pnptvbot #PNPLatinoTV #SinCensura`,
        hashtags: ['PNPLatinoTV', 'ContenidoProhibido', 'CalienteAf'],
      },
    };
  }
}

export default new AIContentGenerationService();