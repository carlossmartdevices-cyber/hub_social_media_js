// Language configuration and messages
const LANGUAGES = {
  es: {
    welcome: {
      title: '🤖 ¡Bienvenido al Bot de Hub Social Media!',
      description: 'Puedo ayudarte a gestionar contenido en múltiples plataformas de redes sociales.',
      commands: {
        title: 'Comandos Disponibles:',
        start: '/start - Mostrar este mensaje de bienvenida',
        status: '/status - Verificar estado del bot',
        live: '/live - Iniciar una transmisión en vivo',
        help: '/help - Obtener ayuda detallada',
        lang: '/lang - Cambiar idioma / Change language'
      },
      features: {
        title: 'Características:',
        messages: '✅ Enviar mensajes a múltiples plataformas',
        schedule: '✅ Programar contenido',
        live: '✅ Gestionar transmisiones en vivo',
        media: '✅ Manejar archivos multimedia'
      },
      footer: '¡Comienza enviándome cualquier mensaje!'
    },
    status: {
      title: '📊 Estado del Bot',
      online: '🟢 Estado: En línea y operativo',
      bot: '🤖 Bot:',
      database: '💾 Base de datos: Conectada',
      scheduler: '⏰ Programador: Activo',
      platforms: 'Estado de Plataformas:',
      telegram: 'Telegram',
      twitter: 'Twitter',
      instagram: 'Instagram',
      tiktok: 'TikTok (No implementado)',
      updated: 'Última actualización:'
    },
    help: {
      title: '📖 Hub Social Media Bot - Ayuda',
      commands: {
        title: '🤖 Comandos:',
        start: 'Mensaje de bienvenida',
        status: 'Verificar estado del bot',
        live: 'Iniciar transmisión en vivo',
        help: 'Mostrar esta ayuda',
        lang: 'Cambiar idioma'
      },
      usage: {
        title: '📱 Cómo usar:',
        step1: '1. Añade el bot a tu canal/grupo',
        step2: '2. Dale permisos de administrador al bot',
        step3: '3. Usa comandos o envía mensajes regulares',
        step4: '4. El bot procesará y gestionará tu contenido'
      },
      integration: {
        title: '🔧 Integración API:',
        description: 'Este bot puede enviar mensajes a:',
        telegram: '• Telegram (activo)',
        twitter: '• Twitter (configurado)',
        instagram: '• Instagram (necesita configuración)',
        tiktok: '• TikTok (necesita implementación)'
      },
      tips: {
        title: '💡 Consejos:',
        formatting: '• Usa formato HTML: <code>&lt;b&gt;negrita&lt;/b&gt;</code>',
        schedule: '• Programa mensajes para más tarde',
        media: '• Envía archivos multimedia y documentos',
        links: '• Crea enlaces de invitación para transmisiones en vivo'
      },
      footer: 'Para soporte técnico, revisa los logs o la documentación.'
    },
    live: {
      starting: '🔴 Iniciando Transmisión en Vivo',
      started: 'Transmisión en vivo iniciada en el chat',
      failed: '❌ Error al iniciar transmisión en vivo:',
      ended: '🔴 Transmisión en Vivo Terminada',
      title: 'Título:',
      duration: 'Duración:',
      thanks: '¡Gracias por ver!'
    },
    message: {
      received: '📩 ¡Mensaje Recibido!',
      from: 'De:',
      chat: 'Chat:',
      message: 'Mensaje:',
      processed: '✅ ¡Mensaje procesado exitosamente!',
      actions: 'Acciones disponibles:',
      forward: '• Reenviar a otras plataformas',
      schedule: '• Programar para más tarde',
      live_cmd: '• Iniciar transmisión en vivo con /live'
    },
    language: {
      current: 'Idioma actual:',
      select: 'Selecciona tu idioma / Select your language:',
      changed: '✅ Idioma cambiado a Español',
      spanish: '🇪🇸 Español',
      english: '🇺🇸 English'
    },
    errors: {
      general: 'Ha ocurrido un error:',
      chat_required: 'Se requiere chatId para mensajes de Telegram',
      live_required: 'Se requiere chatId para transmisiones en vivo de Telegram'
    }
  },
  en: {
    welcome: {
      title: '🤖 Welcome to Hub Social Media Bot!',
      description: 'I can help you manage content across multiple social media platforms.',
      commands: {
        title: 'Available Commands:',
        start: '/start - Show this welcome message',
        status: '/status - Check bot status',
        live: '/live - Start a live stream',
        help: '/help - Get detailed help',
        lang: '/lang - Cambiar idioma / Change language'
      },
      features: {
        title: 'Features:',
        messages: '✅ Send messages to multiple platforms',
        schedule: '✅ Schedule content',
        live: '✅ Manage live streams',
        media: '✅ Handle media files'
      },
      footer: 'Start by sending me any message!'
    },
    status: {
      title: '📊 Bot Status',
      online: '🟢 Status: Online and operational',
      bot: '🤖 Bot:',
      database: '💾 Database: Connected',
      scheduler: '⏰ Scheduler: Active',
      platforms: 'Platform Status:',
      telegram: 'Telegram',
      twitter: 'Twitter',
      instagram: 'Instagram',
      tiktok: 'TikTok (Not implemented)',
      updated: 'Last updated:'
    },
    help: {
      title: '📖 Hub Social Media Bot - Help',
      commands: {
        title: '🤖 Commands:',
        start: 'Welcome message',
        status: 'Check bot status',
        live: 'Start live stream',
        help: 'Show this help',
        lang: 'Change language'
      },
      usage: {
        title: '📱 How to use:',
        step1: '1. Add the bot to your channel/group',
        step2: '2. Give the bot admin permissions',
        step3: '3. Use commands or send regular messages',
        step4: '4. The bot will process and manage your content'
      },
      integration: {
        title: '🔧 API Integration:',
        description: 'This bot can send messages to:',
        telegram: '• Telegram (active)',
        twitter: '• Twitter (configured)',
        instagram: '• Instagram (needs setup)',
        tiktok: '• TikTok (needs implementation)'
      },
      tips: {
        title: '💡 Pro Tips:',
        formatting: '• Use HTML formatting: <code>&lt;b&gt;bold&lt;/b&gt;</code>',
        schedule: '• Schedule messages for later',
        media: '• Send media files and documents',
        links: '• Create invite links for live streams'
      },
      footer: 'For technical support, check the logs or documentation.'
    },
    live: {
      starting: '🔴 Starting Live Stream',
      started: 'Live stream started in chat',
      failed: '❌ Failed to start live stream:',
      ended: '🔴 Live Stream Ended',
      title: 'Title:',
      duration: 'Duration:',
      thanks: 'Thank you for watching!'
    },
    message: {
      received: '📩 Message Received!',
      from: 'From:',
      chat: 'Chat:',
      message: 'Message:',
      processed: '✅ Message processed successfully!',
      actions: 'Available actions:',
      forward: '• Forward to other platforms',
      schedule: '• Schedule for later',
      live_cmd: '• Start live stream with /live'
    },
    language: {
      current: 'Current language:',
      select: 'Selecciona tu idioma / Select your language:',
      changed: '✅ Language changed to English',
      spanish: '🇪🇸 Español',
      english: '🇺🇸 English'
    },
    errors: {
      general: 'An error occurred:',
      chat_required: 'chatId is required for Telegram messages',
      live_required: 'chatId is required for Telegram live streams'
    }
  }
};

// User language preferences storage (in memory - you might want to use database)
const userLanguages = new Map(); // chatId -> language

class LanguageManager {
  static getUserLanguage(chatId) {
    return userLanguages.get(chatId) || 'es'; // Default to Spanish
  }

  static setUserLanguage(chatId, language) {
    if (LANGUAGES[language]) {
      userLanguages.set(chatId, language);
      return true;
    }
    return false;
  }

  static getMessage(chatId, path) {
    const lang = this.getUserLanguage(chatId);
    const keys = path.split('.');
    let message = LANGUAGES[lang];
    
    for (const key of keys) {
      if (message && message[key]) {
        message = message[key];
      } else {
        // Fallback to English if key not found
        message = LANGUAGES.en;
        for (const fallbackKey of keys) {
          if (message && message[fallbackKey]) {
            message = message[fallbackKey];
          } else {
            return `Missing translation: ${path}`;
          }
        }
        break;
      }
    }
    
    return message;
  }

  static getWelcomeMessage(chatId) {
    const lang = this.getUserLanguage(chatId);
    const msg = LANGUAGES[lang].welcome;
    
    return `
${msg.title}

${msg.description}

<b>${msg.commands.title}</b>
• ${msg.commands.start}
• ${msg.commands.status}
• ${msg.commands.live}
• ${msg.commands.help}
• ${msg.commands.lang}

<b>${msg.features.title}</b>
${msg.features.messages}
${msg.features.schedule}
${msg.features.live}
${msg.features.media}

<i>${msg.footer}</i>
    `;
  }

  static getStatusMessage(chatId, botInfo) {
    const lang = this.getUserLanguage(chatId);
    const msg = LANGUAGES[lang].status;
    
    return `
${msg.title}

${msg.online}
${msg.bot} @${botInfo.username}
${msg.database}
${msg.scheduler}

<b>${msg.platforms}</b>
${process.env.TELEGRAM_BOT_TOKEN ? '✅' : '❌'} ${msg.telegram}
${process.env.TWITTER_BEARER_TOKEN ? '✅' : '❌'} ${msg.twitter}
${process.env.INSTAGRAM_USERNAME ? '✅' : '❌'} ${msg.instagram}
❌ ${msg.tiktok}

<i>${msg.updated} ${new Date().toLocaleString()}</i>
    `;
  }

  static getHelpMessage(chatId) {
    const lang = this.getUserLanguage(chatId);
    const msg = LANGUAGES[lang].help;
    
    return `
${msg.title}

<b>${msg.commands.title}</b>
• <code>/start</code> - ${msg.commands.start}
• <code>/status</code> - ${msg.commands.status}
• <code>/live [title]</code> - ${msg.commands.live}
• <code>/help</code> - ${msg.commands.help}
• <code>/lang</code> - ${msg.commands.lang}

<b>${msg.usage.title}</b>
${msg.usage.step1}
${msg.usage.step2}
${msg.usage.step3}
${msg.usage.step4}

<b>${msg.integration.title}</b>
${msg.integration.description}
${msg.integration.telegram}
${msg.integration.twitter}
${msg.integration.instagram}
${msg.integration.tiktok}

<b>${msg.tips.title}</b>
${msg.tips.formatting}
${msg.tips.schedule}
${msg.tips.media}
${msg.tips.links}

<i>${msg.footer}</i>
    `;
  }

  static getMessageResponse(chatId, msgData) {
    const lang = this.getUserLanguage(chatId);
    const msg = LANGUAGES[lang].message;
    
    return `
${msg.received}

<b>${msg.from}</b> ${msgData.from.first_name || 'Unknown'}
<b>${msg.chat}</b> ${msgData.chat.title || msgData.chat.type}
<b>${msg.message}</b> ${msgData.text}

<i>${msg.processed}</i>

<b>${msg.actions}</b>
${msg.forward}
${msg.schedule}
${msg.live_cmd}
    `;
  }

  static getLanguageSelectionMessage(chatId) {
    const lang = this.getUserLanguage(chatId);
    const msg = LANGUAGES[lang].language;
    
    return `
${msg.select}

${msg.current} ${lang === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}
    `;
  }

  static getLanguageChangedMessage(language) {
    return LANGUAGES[language].language.changed;
  }

  static getSupportedLanguages() {
    return Object.keys(LANGUAGES);
  }
}

module.exports = {
  LANGUAGES,
  LanguageManager
};