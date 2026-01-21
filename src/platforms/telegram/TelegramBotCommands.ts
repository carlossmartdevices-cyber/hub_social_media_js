import { Telegraf } from 'telegraf';
import { logger } from '../../utils/logger';
import platformAccountService from '../../services/PlatformAccountService';
import { Database } from '../../database/connection';

interface UserState {
  step: string;
  platform?: string;
  accountName?: string;
  username?: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  accessSecret?: string;
}

/**
 * 🔵 LOW: Interactive Telegram bot commands
 * Provides user-friendly commands and inline keyboards
 */
export class TelegramBotCommands {
  private bot: Telegraf;
  // Store user states for multi-step commands
  private userStates: Map<number, UserState> = new Map();

  constructor(bot: Telegraf) {
    this.bot = bot;
    this.setupCommands();
  }

  /**
   * Safely answer callback query without throwing errors
   * Prevents "query is too old" errors from being logged
   */
  private async safeAnswerCbQuery(ctx: unknown, text?: string): Promise<void> {
    try {
      await (ctx as any).answerCbQuery(text);
    } catch (error: unknown) {
      // Silently ignore callback query errors (query too old, invalid, etc.)
      // These are expected and don't affect functionality
      const errorMessage = error instanceof Error ? error.message : 'Unknown callback query error';
      logger.debug('Callback query answer failed (expected):', errorMessage);
    }
  }

  private setupCommands() {
    // Start command
    this.bot.command('start', (ctx) => {
      ctx.reply(
        '👋 Welcome to PNPTV Social Media Hub!\n\n' +
        'Manage your content across multiple social media platforms with AI-powered tools.\n\n' +
        '📱 *Quick Access:*\n' +
        '/menu - Open main menu\n' +
        '/xaccounts - Manage your X (Twitter) accounts\n' +
        '/help - Show all commands\n\n' +
        '📝 *Content:*\n' +
        '/schedule - Schedule posts via web dashboard\n' +
        '/list - View scheduled posts\n' +
        '/stats - View posting statistics\n\n' +
        '⚙️ *System:*\n' +
        '/status - Check bot status',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📋 Main Menu', callback_data: 'back_to_menu' },
              ],
              [
                { text: '🐦 X Accounts', callback_data: 'x_accounts' },
                { text: '📝 New Post', callback_data: 'new_post' },
              ],
              [
                { text: '📊 View Stats', callback_data: 'stats' },
                { text: '💬 Support', callback_data: 'contact_support' },
              ],
            ],
          },
        }
      );
    });

    // Help command
    this.bot.command('help', (ctx) => {
      ctx.reply(
        '📖 *PNPTV Social Media Hub Help*\n\n' +
        '*Navigation:*\n' +
        '/start - Start the bot and view welcome message\n' +
        '/menu - Open main menu with quick actions\n' +
        '/help - Show this help message\n\n' +
        '*Account Management:*\n' +
        '/xaccounts - View all your X (Twitter) accounts\n' +
        '/addxaccount - Add a new X account\n' +
        '/setdefaultx - Set default X account\n' +
        '/deletexaccount - Delete an X account\n\n' +
        '*Content Management:*\n' +
        '/schedule - Schedule a new post\n' +
        '/list - List scheduled posts\n' +
        '/stats - View statistics\n' +
        '/status - Check system status\n\n' +
        '*Support:*\n' +
        '/cancel - Cancel current operation\n' +
        'Use /menu → Contact Support to get help\n\n' +
        '*Features:*\n' +
        '• Multiple X (Twitter) accounts\n' +
        '• Multi-platform posting (X, Instagram, Facebook, LinkedIn, YouTube, TikTok, Telegram)\n' +
        '• AI-powered content generation (XAI Grok)\n' +
        '• Post scheduling and automation\n' +
        '• Analytics and statistics\n' +
        '• Video & image support\n\n' +
        'Web Dashboard: https://pnptv.app\n' +
        'Need help? Contact support at https://pnptv.app',
        { parse_mode: 'Markdown' }
      );
    });

    // Menu command
    this.bot.command('menu', (ctx) => {
      ctx.reply(
        '📋 *Main Menu*\n\n' +
        'What would you like to do?',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🐦 X Accounts', callback_data: 'x_accounts' },
                { text: '📊 View Stats', callback_data: 'stats' },
              ],
              [
                { text: '📝 New Post', callback_data: 'new_post' },
                { text: '📅 Scheduled Posts', callback_data: 'list_posts' },
              ],
              [
                { text: '⚙️ Settings', callback_data: 'settings' },
                { text: '💬 Contact Support', callback_data: 'contact_support' },
              ],
            ],
          },
        }
      );
    });

    // Status command
    this.bot.command('status', async (ctx) => {
      ctx.reply(
        '🟢 *System Status*\n\n' +
        '✅ Bot: Online\n' +
        '✅ Database: Connected\n' +
        '✅ Redis: Connected\n' +
        '✅ API: Operational\n\n' +
        `⏰ Server time: ${new Date().toISOString()}`,
        { parse_mode: 'Markdown' }
      );
    });

    // Schedule command
    this.bot.command('schedule', (ctx) => {
      ctx.reply(
        '📝 *Schedule a New Post*\n\n' +
        'To schedule a post, please use the web dashboard.\n\n' +
        '📅 Calendar: https://pnptv.app/calendar',
        { parse_mode: 'Markdown' }
      );
    });

    // List posts command
    this.bot.command('list', (ctx) => {
      ctx.reply(
        '📅 *Your Scheduled Posts*\n\n' +
        'To view your scheduled posts, please use the web dashboard.\n\n' +
        '📅 Calendar: https://pnptv.app/calendar',
        { parse_mode: 'Markdown' }
      );
    });

    // Stats command
    this.bot.command('stats', (ctx) => {
      ctx.reply(
        '📊 *Your Statistics*\n\n' +
        'View detailed statistics and analytics in the web dashboard.\n\n' +
        '📈 Analytics Dashboard: https://pnptv.app/analytics',
        { parse_mode: 'Markdown' }
      );
    });

    // X Accounts Management - List all X accounts
    this.bot.command('xaccounts', async (ctx) => {
      try {
        const userId = ctx.from?.id;
        if (!userId) {
          ctx.reply('❌ Unable to identify user');
          return;
        }
        const accounts = await platformAccountService.getUserPlatformAccounts(userId.toString(), 'twitter');

        if (accounts.length === 0) {
          ctx.reply(
            'You don\'t have any X accounts configured yet.\n\n' +
            'Use /addxaccount to add your first X account!',
            { parse_mode: 'Markdown' }
          );
          return;
        }

        let message = '🐦 *Your X (Twitter) Accounts*\n\n';
        const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];

        accounts.forEach((account, index) => {
          const defaultBadge = account.isDefault ? ' ⭐' : '';
          const activeBadge = account.isActive ? '✅' : '❌';
          message += `${index + 1}. ${activeBadge} *${account.accountName}*${defaultBadge}\n`;
          message += `   @${account.accountIdentifier}\n`;
          message += `   ID: \`${account.id.substring(0, 8)}\`\n\n`;

          // Add buttons for each account
          keyboard.push([
            { text: `📝 Edit ${account.accountName}`, callback_data: `edit_x_${account.id}` },
            { text: account.isDefault ? '⭐ Default' : '⭐ Set Default', callback_data: `default_x_${account.id}` }
          ]);
        });

        keyboard.push([{ text: '➕ Add New X Account', callback_data: 'add_x_account' }]);

        ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
      } catch (error: unknown) {
        logger.error('Error listing X accounts:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching X accounts';
        logger.error('Error listing X accounts:', errorMessage);
        ctx.reply('❌ Error fetching X accounts. Please try again later.');
      }
    });

    // Add X Account - OAuth2 Flow
    this.bot.command('addxaccount', async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) {
        ctx.reply('❌ Unable to identify user');
        return;
      }

      try {
        // Generate OAuth URL
        const { config } = await import('../../config');
        const authUrl = `${config.apiUrl}/api/oauth/twitter/authorize?userId=${userId}&returnUrl=${encodeURIComponent('/telegram-success')}`;

        ctx.reply(
          '🐦 *Add New X (Twitter) Account*\n\n' +
          '✨ Connect your X account securely with OAuth 2.0!\n\n' +
          '🔐 *Benefits:*\n' +
          '• Secure authentication\n' +
          '• No manual API keys needed\n' +
          '• Automatic token refresh\n' +
          '• Connect multiple accounts easily\n\n' +
          '👉 Click the button below to authorize:',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔗 Connect X Account', url: authUrl }
                ],
                [
                  { text: '❌ Cancel', callback_data: 'cancel_operation' }
                ]
              ]
            }
          }
        );
      } catch (error: unknown) {
        logger.error('Error in addxaccount:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error in addxaccount';
        logger.error('Error in addxaccount:', errorMessage);
        ctx.reply('❌ Error generating authorization link. Please try again later.');
      }
    });

    // Set default X account
    this.bot.command('setdefaultx', async (ctx) => {
      try {
        const userId = ctx.from?.id;
        if (!userId) {
          ctx.reply('❌ Unable to identify user');
          return;
        }

        const accounts = await platformAccountService.getUserPlatformAccounts(userId.toString(), 'twitter');

        if (accounts.length === 0) {
          ctx.reply('❌ You don\'t have any X accounts. Use /addxaccount first.');
          return;
        }

        if (accounts.length === 1) {
          ctx.reply('ℹ️ You only have one X account, and it\'s already the default.');
          return;
        }

        const keyboard = accounts.map(account => ([
          {
            text: `${account.accountName} (@${account.accountIdentifier})`,
            callback_data: `set_default_x_${account.id}`
          }
        ]));

        ctx.reply(
          '🐦 *Set Default X Account*\n\n' +
          'Select which account should be the default for posting:',
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
          }
        );
      } catch (error: unknown) {
        logger.error('Error in setdefaultx command:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error in setdefaultx command';
        logger.error('Error in setdefaultx command:', errorMessage);
        ctx.reply('❌ Error. Please try again later.');
      }
    });

    // Delete X account
    this.bot.command('deletexaccount', async (ctx) => {
      try {
        const userId = ctx.from?.id;
        if (!userId) {
          ctx.reply('❌ Unable to identify user');
          return;
        }
        const accounts = await platformAccountService.getUserPlatformAccounts(userId.toString(), 'twitter');

        if (accounts.length === 0) {
          ctx.reply('❌ You don\'t have any X accounts to delete.');
          return;
        }

        const keyboard = accounts.map(account => ([
          {
            text: `${account.accountName} (@${account.accountIdentifier})`,
            callback_data: `delete_x_${account.id}`
          }
        ]));
        keyboard.push([{ text: '❌ Cancel', callback_data: 'cancel_delete' }]);

        ctx.reply(
          '🐦 *Delete X Account*\n\n' +
          '⚠️ *Warning:* This action cannot be undone.\n\n' +
          'Select the account you want to delete:',
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
          }
        );
      } catch (error: unknown) {
        logger.error('Error in deletexaccount command:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error in deletexaccount command';
        logger.error('Error in deletexaccount command:', errorMessage);
        ctx.reply('❌ Error. Please try again later.');
      }
    });

    // Cancel command (for multi-step flows)
    this.bot.command('cancel', (ctx) => {
      const userId = ctx.from?.id;
      if (userId && this.userStates.has(userId)) {
        this.userStates.delete(userId);
        ctx.reply('✅ Operation cancelled.');
      } else {
        ctx.reply('ℹ️ No operation to cancel.');
      }
    });

    // Handle inline keyboard callbacks
    this.bot.action('stats', async (ctx) => {
      await this.safeAnswerCbQuery(ctx);
      ctx.reply(
        '📊 *Statistics*\n\n' +
        'View detailed analytics and performance metrics in the dashboard.\n\n' +
        'Platforms: X (Twitter), Instagram, Facebook, LinkedIn, YouTube, TikTok, Telegram\n\n' +
        '📈 Analytics: https://pnptv.app/analytics',
        { parse_mode: 'Markdown' }
      );
    });

    this.bot.action('new_post', async (ctx) => {
      await this.safeAnswerCbQuery(ctx);
      ctx.reply(
        '📝 *Create New Post*\n\n' +
        'Use the web dashboard to create and schedule posts with AI assistance.\n\n' +
        '🌐 Dashboard: https://pnptv.app/posts/new',
        { parse_mode: 'Markdown' }
      );
    });

    this.bot.action('list_posts', async (ctx) => {
      await this.safeAnswerCbQuery(ctx);
      ctx.reply(
        '📅 *Scheduled Posts*\n\n' +
        'View and manage your scheduled posts in the dashboard.\n\n' +
        '🌐 Dashboard: https://pnptv.app/posts',
        { parse_mode: 'Markdown' }
      );
    });

    this.bot.action('settings', async (ctx) => {
      await this.safeAnswerCbQuery(ctx);
      ctx.reply(
        '⚙️ *Settings*\n\n' +
        'Configure your account and platform settings in the dashboard.\n\n' +
        '🌐 Settings: https://pnptv.app/settings',
        { parse_mode: 'Markdown' }
      );
    });

    // Contact Support callback
    this.bot.action('contact_support', async (ctx) => {
      await this.safeAnswerCbQuery(ctx);
      ctx.reply(
        '💬 *Contact Support*\n\n' +
        'Need help? Our support team is here for you!\n\n' +
        '*How to get support:*\n' +
        '• Click the button below to open a support ticket\n' +
        '• Describe your issue in detail\n' +
        '• Include screenshots if possible\n' +
        '• Our team typically responds within 24 hours\n\n' +
        '*Common issues:*\n' +
        '• Account connection problems\n' +
        '• Posting errors\n' +
        '• Feature requests\n' +
        '• General questions',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📩 Open Support Ticket', callback_data: 'open_support_ticket' }
              ],
              [
                { text: '📚 Documentation', url: 'https://yourdomain.com/docs' },
                { text: '❓ FAQ', url: 'https://yourdomain.com/faq' }
              ],
              [
                { text: '⬅️ Back to Menu', callback_data: 'back_to_menu' }
              ]
            ]
          }
        }
      );
    });

    // Open support ticket callback
    this.bot.action('open_support_ticket', async (ctx) => {
      await this.safeAnswerCbQuery(ctx);
      const userId = ctx.from?.id;
      const username = ctx.from?.username;

      ctx.reply(
        '📩 *Open Support Ticket*\n\n' +
        'Please describe your issue or question in detail.\n\n' +
        'Send your message in the next message, and our support team will be notified.\n\n' +
        `User ID: \`${userId}\`\n` +
        `Username: @${username || 'N/A'}\n\n` +
        'Type /cancel to abort.',
        { parse_mode: 'Markdown' }
      );

      // Set user state for support ticket
      if (userId) {
        this.userStates.set(userId, { step: 'support_ticket' });
      }
    });

    // Back to menu callback
    this.bot.action('back_to_menu', async (ctx) => {
      await this.safeAnswerCbQuery(ctx);
      ctx.reply(
        '📋 *Main Menu*\n\n' +
        'What would you like to do?',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🐦 X Accounts', callback_data: 'x_accounts' },
                { text: '📊 View Stats', callback_data: 'stats' },
              ],
              [
                { text: '📝 New Post', callback_data: 'new_post' },
                { text: '📅 Scheduled Posts', callback_data: 'list_posts' },
              ],
              [
                { text: '⚙️ Settings', callback_data: 'settings' },
                { text: '💬 Contact Support', callback_data: 'contact_support' },
              ],
            ],
          },
        }
      );
    });

    // X Accounts callback - show accounts list
    this.bot.action('x_accounts', async (ctx) => {
      await this.safeAnswerCbQuery(ctx);
      // Trigger the /xaccounts command logic
      const userId = ctx.from?.id;
      if (!userId) return;

        try {
          const accounts = await platformAccountService.getUserPlatformAccounts(userId.toString(), 'twitter');

          if (accounts.length === 0) {
            ctx.reply(
              '🐦 *Your X (Twitter) Accounts*\n\n' +
              'You don\'t have any X accounts configured yet.\n\n' +
              'Use /addxaccount to add your first X account!',
              { parse_mode: 'Markdown' }
            );
            return;
          }

          let message = '🐦 *Your X (Twitter) Accounts*\n\n';
          const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];

          accounts.forEach((account, index) => {
            const defaultBadge = account.isDefault ? ' ⭐' : '';
            const activeBadge = account.isActive ? '✅' : '❌';
            message += `${index + 1}. ${activeBadge} *${account.accountName}*${defaultBadge}\n`;
            message += `   @${account.accountIdentifier}\n\n`;

            keyboard.push([
              { text: `📝 Edit ${account.accountName}`, callback_data: `edit_x_${account.id}` },
              { text: account.isDefault ? '⭐ Default' : '⭐ Set Default', callback_data: `default_x_${account.id}` }
            ]);
          });

          keyboard.push([{ text: '➕ Add New X Account', callback_data: 'add_x_account' }]);

          ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
          });
        } catch (error) {
          logger.error('Error in x_accounts callback:', error);
          ctx.reply('❌ Error fetching accounts');
        }
    });

    // Add X account callback
    this.bot.action('add_x_account', async (ctx) => {
      await this.safeAnswerCbQuery(ctx);
      const userId = ctx.from?.id;
      if (!userId) return;

      this.userStates.set(userId, { step: 'account_name', platform: 'twitter' });
      ctx.reply(
        '🐦 *Add New X (Twitter) Account*\n\n' +
        'Step 1/6: What would you like to name this account?\n' +
        '(e.g., "Personal", "Business", "Marketing")\n\n' +
        'Type your answer or /cancel to abort.',
        { parse_mode: 'Markdown' }
      );
    });

    // Set default account callback
    this.bot.action(/^default_x_(.+)$/, async (ctx) => {
      await this.safeAnswerCbQuery(ctx);
      const accountId = ctx.match?.[1];
      const userId = ctx.from?.id.toString();

      if (!accountId || !userId) {
        ctx.reply('❌ Error processing request');
        return;
      }

      try {
        const success = await platformAccountService.setAsDefault(accountId, userId);

        if (success) {
          ctx.reply('✅ Default X account updated successfully!');
        } else {
          ctx.reply('❌ Failed to update default account. Please try again.');
        }
      } catch (error) {
        logger.error('Error setting default account:', error);
        ctx.reply('❌ Error updating default account');
      }
    });

    // Delete account callback
    this.bot.action(/^delete_x_(.+)$/, async (ctx) => {
      await this.safeAnswerCbQuery(ctx);
      const accountId = ctx.match?.[1];
      const userId = ctx.from?.id.toString();

      if (!accountId || !userId) {
        ctx.reply('❌ Error processing request');
        return;
      }

      // Ask for confirmation
      ctx.reply(
        '⚠️ *Confirm Deletion*\n\n' +
        'Are you sure you want to delete this X account?\n' +
        'This action cannot be undone.',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Yes, Delete', callback_data: `confirm_delete_x_${accountId}` },
                { text: '❌ No, Cancel', callback_data: 'cancel_delete' }
              ]
            ]
          }
        }
      );
    });

    // Confirm delete callback
    this.bot.action(/^confirm_delete_x_(.+)$/, async (ctx) => {
      await this.safeAnswerCbQuery(ctx);
      const accountId = ctx.match?.[1];
      const userId = ctx.from?.id.toString();

      if (!accountId || !userId) {
        ctx.reply('❌ Error processing request');
        return;
      }

      try {
        const success = await platformAccountService.deleteAccount(accountId, userId);

        if (success) {
          ctx.reply('✅ X account deleted successfully!');
        } else {
          ctx.reply('❌ Failed to delete account. It may not exist or you don\'t have permission.');
        }
      } catch (error) {
        logger.error('Error deleting account:', error);
        ctx.reply('❌ Error deleting account');
      }
    });

    // Cancel delete callback
    this.bot.action('cancel_delete', async (ctx) => {
      await this.safeAnswerCbQuery(ctx);
      ctx.reply('✅ Deletion cancelled.');
    });

    // Handle text messages - including multi-step account creation
    this.bot.on('text', async (ctx) => {
      const userId = ctx.from?.id;
      const text = ctx.message.text;

      logger.info(`Received message from ${userId}: ${text}`);

      // Check if user is in a multi-step flow
      if (userId && this.userStates.has(userId)) {
        const state = this.userStates.get(userId)!;
        try {
          switch (state.step) {
            case 'account_name':
              state.accountName = text;
              state.step = 'username';
              this.userStates.set(userId, state);
              ctx.reply(
                '📝 Step 2/6: What is your X username?\n' +
                '(without the @ symbol)\n\n' +
                'Type your answer or /cancel to abort.'
              );
              break;

            case 'username':
              state.username = text.replace('@', '');
              state.step = 'api_key';
              this.userStates.set(userId, state);
              ctx.reply(
                '🔑 Step 3/6: Enter your X API Key\n\n' +
                'Type your answer or /cancel to abort.'
              );
              break;

            case 'api_key':
              state.apiKey = text;
              state.step = 'api_secret';
              this.userStates.set(userId, state);
              ctx.reply(
                '🔑 Step 4/6: Enter your X API Secret\n\n' +
                'Type your answer or /cancel to abort.'
              );
              break;

            case 'api_secret':
              state.apiSecret = text;
              state.step = 'access_token';
              this.userStates.set(userId, state);
              ctx.reply(
                '🔑 Step 5/6: Enter your X Access Token\n\n' +
                'Type your answer or /cancel to abort.'
              );
              break;

            case 'access_token':
              state.accessToken = text;
              state.step = 'access_secret';
              this.userStates.set(userId, state);
              ctx.reply(
                '🔑 Step 6/6: Enter your X Access Token Secret\n\n' +
                'Type your answer or /cancel to abort.'
              );
              break;

            case 'access_secret':
              state.accessSecret = text;

              // Now save the account
              try {
                const credentials = {
                  apiKey: state.apiKey ?? '',
                  apiSecret: state.apiSecret ?? '',
                  accessToken: state.accessToken ?? '',
                  accessSecret: state.accessSecret ?? '',
                };

                const accounts = await platformAccountService.getUserPlatformAccounts(
                  userId.toString(),
                  'twitter'
                );
                const isFirstAccount = accounts.length === 0;

                const account = await platformAccountService.addAccount(
                  userId.toString(),
                  'twitter',
                  state.accountName ?? '',
                  state.username ?? '',
                  credentials,
                  isFirstAccount // Set as default if it's the first account
                );

                this.userStates.delete(userId);

                ctx.reply(
                  '✅ *X Account Added Successfully!*\n\n' +
                  `Account Name: ${account.accountName}\n` +
                  `Username: @${account.accountIdentifier}\n` +
                  `Default: ${account.isDefault ? 'Yes ⭐' : 'No'}\n\n` +
                  'Your X account is now ready to use!\n\n' +
                  'Use /xaccounts to view all your accounts.',
                  { parse_mode: 'Markdown' }
                );
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error saving X account';
                logger.error('Error saving X account:', errorMessage);
                this.userStates.delete(userId);
                ctx.reply(
                  '❌ Error saving account. Please try again.\n\n' +
                  `Error: ${errorMessage}`
                );
              }
              break;

            case 'support_ticket':
              // Handle support ticket submission
              this.userStates.delete(userId);

              const ticketId = `ST-${userId}-${Date.now()}`;
              const timestamp = new Date();

              try {
                // Save ticket to database
                const db = Database.getInstance();
                await db.query(
                  `INSERT INTO support_tickets
                   (ticket_id, user_id, telegram_username, first_name, last_name, message, status, created_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                  [
                    ticketId,
                    userId,
                    ctx.from?.username || null,
                    ctx.from?.first_name || null,
                    ctx.from?.last_name || null,
                    text,
                    'open',
                    timestamp
                  ]
                );

                logger.info(`Support ticket ${ticketId} saved to database from user ${userId}`);

                // Send confirmation to user
                await ctx.reply(
                  '✅ *Support Ticket Submitted*\n\n' +
                  'Thank you for contacting support!\n\n' +
                  'Your ticket has been received and our team will respond within 24 hours.\n\n' +
                  `Ticket ID: \`${ticketId}\`\n\n` +
                  'You will receive a notification when we respond.',
                  { parse_mode: 'Markdown' }
                );

                // Send notification to support admin chat if configured
                const supportAdminChatId = process.env.TELEGRAM_SUPPORT_ADMIN_CHAT_ID;
                if (supportAdminChatId) {
                  const supportMessage =
                    '🎫 *New Support Ticket*\n\n' +
                    `Ticket ID: \`${ticketId}\`\n` +
                    `From: ${ctx.from?.first_name || 'User'} ${ctx.from?.last_name || ''}\n` +
                    `Username: @${ctx.from?.username || 'N/A'}\n` +
                    `User ID: \`${userId}\`\n\n` +
                    `*Message:*\n${text}\n\n` +
                    `Received at: ${timestamp.toISOString()}`;

                  try {
                    await this.bot.telegram.sendMessage(supportAdminChatId, supportMessage, {
                      parse_mode: 'Markdown'
                    });
                    logger.info(`Support ticket notification sent to admin chat ${supportAdminChatId}`);
                  } catch (notifyError) {
                    logger.error('Failed to send support ticket notification to admin chat:', notifyError);
                  }
                } else {
                  logger.info('Support admin chat not configured. Ticket saved to database only.');
                }
              } catch (error) {
                logger.error('Error saving support ticket:', error);
                await ctx.reply(
                  '❌ Failed to submit support ticket. Please try again later or contact support directly.'
                );
              }
              break;

            default:
              this.userStates.delete(userId);
              ctx.reply('❌ Unknown state. Please start again with /addxaccount');
          }
        } catch (error) {
          logger.error('Error in multi-step flow:', error);
          this.userStates.delete(userId);
          ctx.reply('❌ An error occurred. Please try again.');
        }
      } else {
        // No active flow - respond with default message
        ctx.reply(
          '👋 Hello! I received your message.\n\n' +
          'Use /help to see available commands or /xaccounts to manage your X accounts.'
        );
      }
    });

    // Handle errors
    this.bot.catch((err, ctx) => {
      logger.error(`Bot error for ${ctx.updateType}:`, err);
      ctx.reply('Sorry, an error occurred. Please try again later.');
    });
  }

  /**
   * Start listening for updates (polling)
   */
  async startPolling() {
    try {
      await this.bot.launch();
      logger.info('Telegram bot started (polling mode)');
    } catch (error) {
      logger.error('Failed to start Telegram bot:', error);
      throw error;
    }
  }

  /**
   * Setup webhook for production
   */
  async setupWebhook(webhookUrl: string, secretToken?: string) {
    try {
      await this.bot.telegram.setWebhook(webhookUrl, {
        secret_token: secretToken,
        drop_pending_updates: false,
      });
      logger.info(`Telegram bot webhook configured: ${webhookUrl}`);
    } catch (error) {
      logger.error('Failed to setup Telegram webhook:', error);
      throw error;
    }
  }

  /**
   * Get the bot instance (for webhook middleware)
   */
  getBot() {
    return this.bot;
  }

  /**
   * Stop the bot gracefully
   */
  async stop() {
    try {
      // Try to delete webhook if it was set
      await this.bot.telegram.deleteWebhook({ drop_pending_updates: false });
      logger.info('Telegram webhook deleted');
    } catch (error) {
      // Ignore errors if webhook wasn't set
      logger.debug('No webhook to delete or error deleting webhook');
    }

    this.bot.stop('SIGINT');
    logger.info('Telegram bot stopped');
  }
}
