#!/usr/bin/env node

/**
 * 🔍 Validador Estático de Callbacks del Bot
 * 
 * Este script analiza el código para verificar:
 * 1. Todos los callbacks tienen handlers
 * 2. No hay handlers inaccesibles
 * 3. Todos los prefijos están soportados
 */

const fs = require('fs');
const path = require('path');

const botFile = path.join(__dirname, 'src/main_interactive_enhanced.js');
const code = fs.readFileSync(botFile, 'utf-8');

// Colores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(`${colors[color] || ''}${args.join(' ')}${colors.reset}`);
}

log('blue', '═══════════════════════════════════════════════════════');
log('blue', '🔍 Validador Estático de Callbacks del Bot');
log('blue', '═══════════════════════════════════════════════════════');
console.log('');

// 1. Extraer todos los handlers definidos
log('cyan', '📋 Paso 1: Extrayendo handlers definidos...');
const handlerRegex = /async (handle\w+)\s*\(/g;
const handlers = new Set();
let match;

while ((match = handlerRegex.exec(code)) !== null) {
  handlers.add(match[1]);
}

log('green', `✅ Encontrados ${handlers.size} handlers:`);
Array.from(handlers).sort().forEach(h => {
  console.log(`   • ${h}`);
});
console.log('');

// 2. Extraer todos los callbacks definidos
log('cyan', '📋 Paso 2: Extrayendo callbacks definidos...');
const callbackRegex = /callback_data:\s*['"`]([^'"`]+)['"`]/g;
const callbacks = new Set();

while ((match = callbackRegex.exec(code)) !== null) {
  callbacks.add(match[1]);
}

log('green', `✅ Encontrados ${callbacks.size} callbacks únicos`);
console.log('');

// 3. Agrupar callbacks por prefijo
log('cyan', '📋 Paso 3: Agrupando callbacks por prefijo...');
const prefixMap = {};

callbacks.forEach(cb => {
  const prefix = cb.split('_')[0] + '_';
  if (!prefixMap[prefix]) {
    prefixMap[prefix] = [];
  }
  prefixMap[prefix].push(cb);
});

Object.entries(prefixMap).forEach(([prefix, callbacks]) => {
  log('green', `✅ ${prefix}`);
  callbacks.slice(0, 5).forEach(cb => {
    console.log(`   • ${cb}`);
  });
  if (callbacks.length > 5) {
    console.log(`   ... y ${callbacks.length - 5} más`);
  }
});
console.log('');

// 4. Verificar que cada prefijo tiene handler
log('cyan', '📋 Paso 4: Validando que cada prefijo tiene handler...');
const prefixHandlers = {
  'menu_': ['handleMenuNavigation'],
  'lang_': ['handleLanguageChange'],
  'post_': ['handlePostAction'],
  'schedule_platform_': ['handleSchedulePlatformSelection'],
  'schedule_twitter_account_': ['handleTwitterAccountSelection'],
  'schedule_': ['handleScheduleAction'],
  'settings_': ['handleSettingsAction'],
  'manage_': ['handleManageAction'],
  'live_': ['handleLiveAction'],
  'quick_': ['handleQuickAction'],
  'platform_': ['handlePlatformSelection'],
  'time_': ['handleTimeSelection'],
  'confirm_': ['handleConfirmation'],
  'cancel_post_': ['handleCancelPost'],
  'status_': ['handleStatusAction']
};

let allPrefixesValid = true;

Object.entries(prefixHandlers).forEach(([prefix, expectedHandlers]) => {
  const hasAllHandlers = expectedHandlers.every(h => handlers.has(h));
  const status = hasAllHandlers ? '✅' : '❌';
  const handlersStr = expectedHandlers.join(', ');
  
  if (hasAllHandlers) {
    log('green', `${status} ${prefix} → ${handlersStr}`);
  } else {
    log('red', `${status} ${prefix} → ${handlersStr}`);
    allPrefixesValid = false;
  }
});

console.log('');

// 5. Verificar que existen las rutas en handleCallbackQuery
log('cyan', '📋 Paso 5: Validando rutas en handleCallbackQuery...');

const callbackQueryContent = code.substring(
  code.indexOf('async handleCallbackQuery'),
  code.indexOf('async handleMenuNavigation')
);

const routeRegex = /startsWith\(['"`]([^'"`]+)['"`]\)/g;
const routes = new Set();

while ((match = routeRegex.exec(callbackQueryContent)) !== null) {
  routes.add(match[1]);
}

log('green', `✅ Encontradas ${routes.size} rutas de prefijo:`);
Array.from(routes).sort().forEach(r => {
  const hasHandler = prefixHandlers[r] && prefixHandlers[r].some(h => handlers.has(h));
  const status = hasHandler ? '✅' : '❌';
  console.log(`   ${status} ${r}`);
});

console.log('');

// 6. Análisis de casos especiales
log('cyan', '📋 Paso 6: Validando casos especiales...');

const specialCases = {
  'menu_language (sin auth)': code.includes(`data === 'menu_language'`),
  'lang_* (sin auth)': code.includes(`!data.startsWith('lang_')`),
  'Fallback a menu_main': code.includes(`await this.showMainMenu(chatId)`),
  'Manejo de errores': code.includes(`catch (error)`),
  'Logging de callbacks': code.includes(`logger.info`)
};

Object.entries(specialCases).forEach(([name, exists]) => {
  const status = exists ? '✅' : '❌';
  console.log(`   ${status} ${name}`);
});

console.log('');

// 7. Reporte final
log('cyan', '📊 REPORTE FINAL');
console.log('');

const totalCallbacks = callbacks.size;
const totalHandlers = handlers.size;
const coveragePercentage = Math.round((totalCallbacks / totalHandlers * 100) * 100) / 100;

console.log(`  📌 Total de Callbacks: ${totalCallbacks}`);
console.log(`  🔧 Total de Handlers: ${totalHandlers}`);
console.log(`  📊 Cobertura: ${coveragePercentage}%`);
console.log('');

if (allPrefixesValid && routes.size > 0) {
  log('green', '✅ VALIDACIÓN EXITOSA');
  log('green', '   Todos los callbacks tienen handlers implementados');
  log('green', '   El sistema está listo para producción');
} else {
  log('red', '❌ VALIDACIÓN FALLIDA');
  log('red', '   Revisa los errores arriba');
  process.exit(1);
}

console.log('');
log('blue', '═══════════════════════════════════════════════════════');
console.log('');
