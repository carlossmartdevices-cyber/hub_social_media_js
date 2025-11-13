// Enhanced inline menu system for Telegram bot
const { LanguageManager } = require('./languageManager');

class InlineMenuManager {
  constructor() {
    this.userStates = new Map(); // Track user interaction states
  }

  // Main menu - the starting point
  getMainMenu(chatId) {
    const lang = LanguageManager.getUserLanguage(chatId);
    
    const menus = {
      en: {
        text: `🤖 <b>Hub Social Media Bot</b>

Welcome! Choose an option from the menu below:`,
        keyboard: [
          [
            { text: '📝 Post Content', callback_data: 'menu_post' },
            { text: '⏰ Schedule Posts', callback_data: 'menu_schedule' }
          ],
          [
            { text: '🔴 Live Streaming', callback_data: 'menu_live' },
            { text: '📊 View Status', callback_data: 'menu_status' }
          ],
          [
            { text: '📋 Manage Content', callback_data: 'menu_manage' },
            { text: '⚙️ Settings', callback_data: 'menu_settings' }
          ],
          [
            { text: '❓ Help & Info', callback_data: 'menu_help' },
            { text: '🌍 Language', callback_data: 'menu_language' }
          ]
        ]
      },
      es: {
        text: `🤖 <b>Bot de Hub Social Media</b>

¡Bienvenido! Elige una opción del menú a continuación:`,
        keyboard: [
          [
            { text: '📝 Publicar Contenido', callback_data: 'menu_post' },
            { text: '⏰ Programar Posts', callback_data: 'menu_schedule' }
          ],
          [
            { text: '🔴 Transmisión en Vivo', callback_data: 'menu_live' },
            { text: '📊 Ver Estado', callback_data: 'menu_status' }
          ],
          [
            { text: '📋 Gestionar Contenido', callback_data: 'menu_manage' },
            { text: '⚙️ Configuración', callback_data: 'menu_settings' }
          ],
          [
            { text: '❓ Ayuda e Info', callback_data: 'menu_help' },
            { text: '🌍 Idioma', callback_data: 'menu_language' }
          ]
        ]
      }
    };

    return menus[lang];
  }

  // Post content menu
  getPostMenu(chatId) {
    const lang = LanguageManager.getUserLanguage(chatId);
    
    const menus = {
      en: {
        text: `📝 <b>Post Content</b>

Choose where to post your content:`,
        keyboard: [
          [
            { text: '🐦 Post to Twitter/X', callback_data: 'post_twitter' },
            { text: '📱 Post to Telegram', callback_data: 'post_telegram' }
          ],
          [
            { text: '📸 Post to Instagram', callback_data: 'post_instagram' },
            { text: '🎵 Post to TikTok', callback_data: 'post_tiktok' }
          ],
          [
            { text: '🌐 Post to All Platforms', callback_data: 'post_all' }
          ],
          [
            { text: '🔙 Back to Main Menu', callback_data: 'menu_main' }
          ]
        ]
      },
      es: {
        text: `📝 <b>Publicar Contenido</b>

Elige dónde publicar tu contenido:`,
        keyboard: [
          [
            { text: '🐦 Publicar en Twitter/X', callback_data: 'post_twitter' },
            { text: '📱 Publicar en Telegram', callback_data: 'post_telegram' }
          ],
          [
            { text: '📸 Publicar en Instagram', callback_data: 'post_instagram' },
            { text: '🎵 Publicar en TikTok', callback_data: 'post_tiktok' }
          ],
          [
            { text: '🌐 Publicar en Todas', callback_data: 'post_all' }
          ],
          [
            { text: '🔙 Volver al Menú Principal', callback_data: 'menu_main' }
          ]
        ]
      }
    };

    return menus[lang];
  }

  // Schedule menu
  getScheduleMenu(chatId) {
    const lang = LanguageManager.getUserLanguage(chatId);
    
    const menus = {
      en: {
        text: `⏰ <b>Schedule Posts</b>

Choose your scheduling option:`,
        keyboard: [
          [
            { text: '⏰ Schedule for Later', callback_data: 'schedule_later' },
            { text: '📅 Schedule Daily', callback_data: 'schedule_daily' }
          ],
          [
            { text: '📋 View Scheduled', callback_data: 'schedule_view' },
            { text: '❌ Cancel Scheduled', callback_data: 'schedule_cancel' }
          ],
          [
            { text: '🔄 Schedule Templates', callback_data: 'schedule_templates' }
          ],
          [
            { text: '🔙 Back to Main Menu', callback_data: 'menu_main' }
          ]
        ]
      },
      es: {
        text: `⏰ <b>Programar Posts</b>

Elige tu opción de programación:`,
        keyboard: [
          [
            { text: '⏰ Programar para Después', callback_data: 'schedule_later' },
            { text: '📅 Programar Diariamente', callback_data: 'schedule_daily' }
          ],
          [
            { text: '📋 Ver Programados', callback_data: 'schedule_view' },
            { text: '❌ Cancelar Programados', callback_data: 'schedule_cancel' }
          ],
          [
            { text: '🔄 Plantillas de Programación', callback_data: 'schedule_templates' }
          ],
          [
            { text: '🔙 Volver al Menú Principal', callback_data: 'menu_main' }
          ]
        ]
      }
    };

    return menus[lang];
  }

  // Live streaming menu
  getLiveMenu(chatId) {
    const lang = LanguageManager.getUserLanguage(chatId);
    
    const menus = {
      en: {
        text: `🔴 <b>Live Streaming</b>

Manage your live streams:`,
        keyboard: [
          [
            { text: '🎥 Start Live Stream', callback_data: 'live_start' },
            { text: '📡 End Live Stream', callback_data: 'live_end' }
          ],
          [
            { text: '📢 Send Live Update', callback_data: 'live_update' },
            { text: '👥 View Active Streams', callback_data: 'live_view' }
          ],
          [
            { text: '🔗 Create Invite Link', callback_data: 'live_invite' }
          ],
          [
            { text: '🔙 Back to Main Menu', callback_data: 'menu_main' }
          ]
        ]
      },
      es: {
        text: `🔴 <b>Transmisión en Vivo</b>

Gestiona tus transmisiones en vivo:`,
        keyboard: [
          [
            { text: '🎥 Iniciar Transmisión', callback_data: 'live_start' },
            { text: '📡 Terminar Transmisión', callback_data: 'live_end' }
          ],
          [
            { text: '📢 Enviar Actualización', callback_data: 'live_update' },
            { text: '👥 Ver Transmisiones Activas', callback_data: 'live_view' }
          ],
          [
            { text: '🔗 Crear Enlace de Invitación', callback_data: 'live_invite' }
          ],
          [
            { text: '🔙 Volver al Menú Principal', callback_data: 'menu_main' }
          ]
        ]
      }
    };

    return menus[lang];
  }

  // Settings menu
  getSettingsMenu(chatId) {
    const lang = LanguageManager.getUserLanguage(chatId);
    
    const menus = {
      en: {
        text: `⚙️ <b>Settings</b>

Configure your bot preferences:`,
        keyboard: [
          [
            { text: '🌍 Change Language', callback_data: 'settings_language' },
            { text: '🔔 Notifications', callback_data: 'settings_notifications' }
          ],
          [
            { text: '🎨 Content Templates', callback_data: 'settings_templates' },
            { text: '⏰ Default Schedule', callback_data: 'settings_schedule' }
          ],
          [
            { text: '🔐 Account Settings', callback_data: 'settings_account' },
            { text: '📊 Analytics', callback_data: 'settings_analytics' }
          ],
          [
            { text: '🔙 Back to Main Menu', callback_data: 'menu_main' }
          ]
        ]
      },
      es: {
        text: `⚙️ <b>Configuración</b>

Configura tus preferencias del bot:`,
        keyboard: [
          [
            { text: '🌍 Cambiar Idioma', callback_data: 'settings_language' },
            { text: '🔔 Notificaciones', callback_data: 'settings_notifications' }
          ],
          [
            { text: '🎨 Plantillas de Contenido', callback_data: 'settings_templates' },
            { text: '⏰ Programación Predeterminada', callback_data: 'settings_schedule' }
          ],
          [
            { text: '🔐 Configuración de Cuenta', callback_data: 'settings_account' },
            { text: '📊 Analíticas', callback_data: 'settings_analytics' }
          ],
          [
            { text: '🔙 Volver al Menú Principal', callback_data: 'menu_main' }
          ]
        ]
      }
    };

    return menus[lang];
  }

  // Content management menu
  getManageMenu(chatId) {
    const lang = LanguageManager.getUserLanguage(chatId);
    
    const menus = {
      en: {
        text: `📋 <b>Manage Content</b>

Manage your scheduled and posted content:`,
        keyboard: [
          [
            { text: '📅 View Scheduled', callback_data: 'manage_scheduled' },
            { text: '📝 View Posted', callback_data: 'manage_posted' }
          ],
          [
            { text: '✏️ Edit Content', callback_data: 'manage_edit' },
            { text: '🗑️ Delete Content', callback_data: 'manage_delete' }
          ],
          [
            { text: '📊 Content Analytics', callback_data: 'manage_analytics' },
            { text: '📁 Content Archive', callback_data: 'manage_archive' }
          ],
          [
            { text: '🔙 Back to Main Menu', callback_data: 'menu_main' }
          ]
        ]
      },
      es: {
        text: `📋 <b>Gestionar Contenido</b>

Gestiona tu contenido programado y publicado:`,
        keyboard: [
          [
            { text: '📅 Ver Programados', callback_data: 'manage_scheduled' },
            { text: '📝 Ver Publicados', callback_data: 'manage_posted' }
          ],
          [
            { text: '✏️ Editar Contenido', callback_data: 'manage_edit' },
            { text: '🗑️ Eliminar Contenido', callback_data: 'manage_delete' }
          ],
          [
            { text: '📊 Analíticas de Contenido', callback_data: 'manage_analytics' },
            { text: '📁 Archivo de Contenido', callback_data: 'manage_archive' }
          ],
          [
            { text: '🔙 Volver al Menú Principal', callback_data: 'menu_main' }
          ]
        ]
      }
    };

    return menus[lang];
  }

  // Quick actions menu (floating action button style)
  getQuickActionsMenu(chatId) {
    const lang = LanguageManager.getUserLanguage(chatId);
    
    const menus = {
      en: {
        text: `⚡ <b>Quick Actions</b>

Fast access to common features:`,
        keyboard: [
          [
            { text: '📝 Quick Post', callback_data: 'quick_post' },
            { text: '⏰ Quick Schedule', callback_data: 'quick_schedule' }
          ],
          [
            { text: '🔴 Go Live Now', callback_data: 'quick_live' },
            { text: '📊 Quick Status', callback_data: 'quick_status' }
          ]
        ]
      },
      es: {
        text: `⚡ <b>Acciones Rápidas</b>

Acceso rápido a funciones comunes:`,
        keyboard: [
          [
            { text: '📝 Publicar Rápido', callback_data: 'quick_post' },
            { text: '⏰ Programar Rápido', callback_data: 'quick_schedule' }
          ],
          [
            { text: '🔴 En Vivo Ahora', callback_data: 'quick_live' },
            { text: '📊 Estado Rápido', callback_data: 'quick_status' }
          ]
        ]
      }
    };

    return menus[lang];
  }

  // Platform selection menu
  getPlatformMenu(chatId, action = 'post') {
    const lang = LanguageManager.getUserLanguage(chatId);
    
    const actions = {
      en: {
        post: 'Post to',
        schedule: 'Schedule for',
        view: 'View'
      },
      es: {
        post: 'Publicar en',
        schedule: 'Programar para',
        view: 'Ver'
      }
    };

    const menus = {
      en: {
        text: `🌐 <b>Select Platform</b>

Choose platform to ${actions.en[action]}:`,
        keyboard: [
          [
            { text: '🐦 Twitter/X', callback_data: `platform_twitter_${action}` },
            { text: '📱 Telegram', callback_data: `platform_telegram_${action}` }
          ],
          [
            { text: '📸 Instagram', callback_data: `platform_instagram_${action}` },
            { text: '🎵 TikTok', callback_data: `platform_tiktok_${action}` }
          ],
          [
            { text: '🌐 All Platforms', callback_data: `platform_all_${action}` }
          ],
          [
            { text: '🔙 Back', callback_data: 'menu_main' }
          ]
        ]
      },
      es: {
        text: `🌐 <b>Seleccionar Plataforma</b>

Elige plataforma para ${actions.es[action]}:`,
        keyboard: [
          [
            { text: '🐦 Twitter/X', callback_data: `platform_twitter_${action}` },
            { text: '📱 Telegram', callback_data: `platform_telegram_${action}` }
          ],
          [
            { text: '📸 Instagram', callback_data: `platform_instagram_${action}` },
            { text: '🎵 TikTok', callback_data: `platform_tiktok_${action}` }
          ],
          [
            { text: '🌐 Todas las Plataformas', callback_data: `platform_all_${action}` }
          ],
          [
            { text: '🔙 Atrás', callback_data: 'menu_main' }
          ]
        ]
      }
    };

    return menus[lang];
  }

  // Time selection menu for scheduling
  getTimeMenu(chatId) {
    const lang = LanguageManager.getUserLanguage(chatId);
    
    const menus = {
      en: {
        text: `⏰ <b>Schedule Time</b>

When would you like to post?`,
        keyboard: [
          [
            { text: '⏱️ In 1 Hour', callback_data: 'time_1hour' },
            { text: '🕐 In 3 Hours', callback_data: 'time_3hours' }
          ],
          [
            { text: '📅 Tomorrow 9 AM', callback_data: 'time_tomorrow' },
            { text: '📆 Custom Time', callback_data: 'time_custom' }
          ],
          [
            { text: '🔄 Daily Repeat', callback_data: 'time_daily' },
            { text: '📅 Weekly Repeat', callback_data: 'time_weekly' }
          ],
          [
            { text: '🔙 Back', callback_data: 'menu_schedule' }
          ]
        ]
      },
      es: {
        text: `⏰ <b>Programar Hora</b>

¿Cuándo te gustaría publicar?`,
        keyboard: [
          [
            { text: '⏱️ En 1 Hora', callback_data: 'time_1hour' },
            { text: '🕐 En 3 Horas', callback_data: 'time_3hours' }
          ],
          [
            { text: '📅 Mañana 9 AM', callback_data: 'time_tomorrow' },
            { text: '📆 Hora Personalizada', callback_data: 'time_custom' }
          ],
          [
            { text: '🔄 Repetir Diariamente', callback_data: 'time_daily' },
            { text: '📅 Repetir Semanalmente', callback_data: 'time_weekly' }
          ],
          [
            { text: '🔙 Atrás', callback_data: 'menu_schedule' }
          ]
        ]
      }
    };

    return menus[lang];
  }

  // Language selection menu
  getLanguageMenu(chatId) {
    const currentLang = LanguageManager.getUserLanguage(chatId);
    const langMessage = LanguageManager.getLanguageSelectionMessage(chatId);
    
    const menus = {
      en: {
        text: `🌍 <b>Language Selection</b>

Choose your preferred language:

Current: ${currentLang === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}`,
        keyboard: [
          [
            { text: '🇪🇸 Español', callback_data: 'lang_es' },
            { text: '🇺🇸 English', callback_data: 'lang_en' }
          ],
          [
            { text: '🔙 Back to Main Menu', callback_data: 'menu_main' }
          ]
        ]
      },
      es: {
        text: `🌍 <b>Selección de Idioma</b>

Elige tu idioma preferido:

Actual: ${currentLang === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}`,
        keyboard: [
          [
            { text: '🇪🇸 Español', callback_data: 'lang_es' },
            { text: '🇺🇸 English', callback_data: 'lang_en' }
          ],
          [
            { text: '🔙 Volver al Menú Principal', callback_data: 'menu_main' }
          ]
        ]
      }
    };

    return menus[currentLang];
  }

  // Confirmation menu
  getConfirmationMenu(chatId, action, details = '') {
    const lang = LanguageManager.getUserLanguage(chatId);
    
    const menus = {
      en: {
        text: `✅ <b>Confirm Action</b>

${details}

Are you sure you want to proceed?`,
        keyboard: [
          [
            { text: '✅ Yes, Confirm', callback_data: `confirm_yes_${action}` },
            { text: '❌ No, Cancel', callback_data: `confirm_no_${action}` }
          ],
          [
            { text: '🔙 Back to Menu', callback_data: 'menu_main' }
          ]
        ]
      },
      es: {
        text: `✅ <b>Confirmar Acción</b>

${details}

¿Estás seguro de que quieres continuar?`,
        keyboard: [
          [
            { text: '✅ Sí, Confirmar', callback_data: `confirm_yes_${action}` },
            { text: '❌ No, Cancelar', callback_data: `confirm_no_${action}` }
          ],
          [
            { text: '🔙 Volver al Menú', callback_data: 'menu_main' }
          ]
        ]
      }
    };

    return menus[lang];
  }

  // Get menu by callback data
  getMenuByCallback(chatId, callbackData) {
    switch (callbackData) {
      case 'menu_main':
        return this.getMainMenu(chatId);
      case 'menu_post':
        return this.getPostMenu(chatId);
      case 'menu_schedule':
        return this.getScheduleMenu(chatId);
      case 'menu_live':
        return this.getLiveMenu(chatId);
      case 'menu_settings':
        return this.getSettingsMenu(chatId);
      case 'menu_manage':
        return this.getManageMenu(chatId);
      case 'menu_help':
        return LanguageManager.getHelpMessage(chatId);
      case 'menu_language':
        return this.getLanguageMenu(chatId);
      default:
        return this.getMainMenu(chatId);
    }
  }

  // Set user state for multi-step processes
  setUserState(chatId, state, data = {}) {
    this.userStates.set(chatId, { state, data, timestamp: Date.now() });
  }

  // Get user state
  getUserState(chatId) {
    return this.userStates.get(chatId) || null;
  }

  // Clear user state
  clearUserState(chatId) {
    this.userStates.delete(chatId);
  }

  // Generate inline keyboard markup
  generateKeyboard(keyboard) {
    return {
      reply_markup: {
        inline_keyboard: keyboard
      }
    };
  }
}

module.exports = InlineMenuManager;