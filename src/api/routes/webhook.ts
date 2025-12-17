import { Router, Request, Response } from 'express';
import { Telegraf } from 'telegraf';
import { config } from '../../config';
import { logger } from '../../utils/logger';

const router = Router();

// Initialize Telegram bot for webhook
let telegramBot: Telegraf | null = null;

if (config.platforms.telegram.botToken) {
  telegramBot = new Telegraf(config.platforms.telegram.botToken);
  
  // Setup basic handlers
  telegramBot.start((ctx) => {
    ctx.reply('👋 ¡Bienvenido a Clickera! Tu hub de contenido para redes sociales.\n\n🚀 Visita https://clickera.app para gestionar tu contenido.');
  });

  telegramBot.help((ctx) => {
    ctx.reply('📖 *Clickera - Social Media Hub*\n\n• Gestiona múltiples redes sociales\n• Programa posts con IA\n• Analíticas en tiempo real\n\n🔗 Dashboard: https://clickera.app', { parse_mode: 'Markdown' });
  });

  telegramBot.on('text', (ctx) => {
    logger.info('Telegram message received:', { 
      chatId: ctx.chat.id, 
      text: ctx.message.text?.substring(0, 50) 
    });
  });

  logger.info('Telegram webhook bot initialized');
}

/**
 * POST /api/webhook/telegram
 * Telegram webhook endpoint
 */
router.post('/telegram', async (req: Request, res: Response) => {
  try {
    // Verify secret token if configured
    const secretToken = req.headers['x-telegram-bot-api-secret-token'];
    const expectedSecret = config.platforms.telegram.webhookSecret;
    
    if (expectedSecret && secretToken !== expectedSecret) {
      logger.warn('Telegram webhook: Invalid secret token');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!telegramBot) {
      logger.error('Telegram bot not initialized');
      return res.status(500).json({ error: 'Bot not initialized' });
    }

    // Process the update
    await telegramBot.handleUpdate(req.body);
    
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    logger.error('Telegram webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * GET /api/webhook/telegram
 * Health check for Telegram webhook
 */
router.get('/telegram', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    webhook: 'telegram',
    botInitialized: !!telegramBot
  });
});

export default router;
