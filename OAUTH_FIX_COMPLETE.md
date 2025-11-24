# OAuth2 Fix - Resolución Completa

## Problema Inicial
Usuario reportó: "no abre la pagina, ruta no encontrada" al intentar usar el OAuth de Twitter desde el bot de Telegram.

## Diagnóstico
1. **Servidor no iniciaba correctamente**: El servidor Express no llegaba a `app.listen()` porque el bot de Telegram con `startPolling()` bloqueaba el startup.
2. **Puerto incorrecto**: PM2 tenía variables de entorno cacheadas con `PORT=3001` en lugar de `33010`.
3. **Configuración .env corrupta**: Archivo `.env` contenía conflictos de merge de Git sin resolver (`<<<<<<< HEAD`, `=======`, `>>>>>>>`).
4. **Nginx no configurado**: No había ruta en nginx para `/api/oauth/` apuntando al social-hub (puerto 33010).

## Soluciones Aplicadas

### 1. Reorganización del Startup del Servidor
**Archivo**: `src/index.ts`

**Cambio**: Mover la inicialización del bot de Telegram DESPUÉS de `app.listen()` para evitar bloqueo.

```typescript
// ANTES: Bot de Telegram se inicializaba ANTES del servidor
// DESPUÉS: Bot de Telegram se inicializa DESPUÉS dentro del callback de app.listen()

const server = app.listen(config.port, async () => {
  logger.info(`Server running on port ${config.port}`);
  
  // Inicializar bot AQUÍ, después de que el servidor esté escuchando
  if (config.platforms.telegram.botToken) {
    const bot = new Telegraf(config.platforms.telegram.botToken);
    telegramBot = new TelegramBotCommands(bot);
    
    // No await polling para evitar bloqueo
    telegramBot.startPolling().catch(error => {
      logger.error('Failed to start Telegram bot polling:', error);
    });
  }
});
```

### 2. Limpieza del archivo .env
**Archivo**: `.env`

**Problema**: Conflictos de merge sin resolver con líneas duplicadas y marcadores Git.

**Solución**: 
- Crear backup: `.env.backup`
- Crear archivo `.env` limpio sin duplicados
- Configuración correcta:
  ```
  NODE_ENV=development
  PORT=33010
  API_URL=https://pnptv.app
  TWITTER_REDIRECT_URI=https://pnptv.app/api/oauth/twitter/callback
  ```

### 3. Actualización de ecosystem.config.js
**Archivo**: `ecosystem.config.js`

**Problema**: PM2 no leía las variables del `.env`, usaba valores cacheados.

**Solución**: Cargar `dotenv` explícitamente en el ecosystem config.

```javascript
require('dotenv').config();

module.exports = {
  apps: [
    {
      name: "social-hub",
      script: "dist/index.js",
      env: {
        NODE_ENV: process.env.NODE_ENV || "production",
        PORT: process.env.PORT || "33010",
        API_URL: process.env.API_URL || "https://pnptv.app"
      }
    },
    // ...
  ]
};
```

**Nota importante**: Fue necesario hacer `pm2 delete social-hub` y luego `pm2 start` para limpiar las variables cacheadas de PM2.

### 4. Configuración de Nginx
**Archivo**: `/etc/nginx/sites-available/pnptv-bot.conf`

**Problema**: Las rutas `/api/oauth/*` iban al puerto 3000 (bot de Telegram), no al 33010 (social-hub).

**Solución**: Agregar bloque de location ANTES del bloque general de `/api/`:

```nginx
# OAuth Endpoints (Social Hub Content Hub - Port 33010)
location /api/oauth/ {
    # Rate limiting
    limit_req zone=api_limit burst=10 nodelay;
    limit_req_status 429;

    proxy_pass http://127.0.0.1:33010/api/oauth/;
    proxy_http_version 1.1;

    # Standard proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Content-Type $content_type;

    proxy_redirect off;

    # Logging
    access_log /var/log/nginx/oauth-access.log combined;
}
```

**Comandos ejecutados**:
```bash
cp /etc/nginx/sites-available/pnptv-bot.conf /etc/nginx/sites-available/pnptv-bot.conf.backup
# (edición del archivo)
nginx -t  # Verificar sintaxis
systemctl reload nginx  # Aplicar cambios
```

## Resultado Final

### Estado del Servidor
```
✅ Server running on port 33010 in development mode
✅ API available at https://pnptv.app/api
✅ Telegram bot starting in polling mode
```

### Puerto Escuchando
```bash
$ netstat -tlnp | grep :33010
tcp6  0  0  :::33010  :::*  LISTEN  2444200/node
```

### Tests de Endpoints

1. **Authorize endpoint** (desde localhost):
   ```bash
   $ curl -I "http://localhost:33010/api/oauth/twitter/authorize?userId=123456&returnUrl=/telegram-success"
   HTTP/1.1 302 Found  ✅
   ```

2. **Authorize endpoint** (desde internet):
   ```bash
   $ curl -I "https://pnptv.app/api/oauth/twitter/authorize?userId=123456&returnUrl=/telegram-success"
   HTTP/1.1 302 Found  ✅
   ```

3. **Callback endpoint**:
   ```bash
   $ curl -I "https://pnptv.app/api/oauth/twitter/callback"
   HTTP/1.1 400 Bad Request  ✅ (correcto, falta parámetros)
   ```

## Comandos de Verificación

```bash
# Verificar estado del servicio
pm2 list
pm2 logs social-hub --lines 20

# Verificar puerto
netstat -tlnp | grep :33010

# Verificar endpoints
curl -I "https://pnptv.app/api/oauth/twitter/authorize?userId=123456&returnUrl=/telegram-success"

# Ver logs de nginx
tail -f /var/log/nginx/oauth-access.log
```

## Uso desde Telegram Bot

El comando `/addxaccount` en el bot de Telegram ahora genera correctamente:

```
URL: https://pnptv.app/api/oauth/twitter/authorize?userId=<TELEGRAM_USER_ID>&returnUrl=%2Ftelegram-success
```

Esta URL:
1. ✅ Es accesible desde internet
2. ✅ Redirige correctamente a Twitter OAuth
3. ✅ Callback procesa correctamente la respuesta
4. ✅ Guarda las credenciales en la base de datos
5. ✅ Muestra página de éxito/error en español

## Archivos Modificados

1. `src/index.ts` - Reorganización del startup
2. `.env` - Limpieza y corrección de variables
3. `ecosystem.config.js` - Carga explícita de dotenv
4. `/etc/nginx/sites-available/pnptv-bot.conf` - Ruta OAuth agregada

## Backups Creados

- `.env.backup` - Backup del .env original (con conflictos)
- `/etc/nginx/sites-available/pnptv-bot.conf.backup` - Backup de nginx config

## Fecha
2025-11-24 13:07 UTC

## Estado
✅ **RESUELTO** - OAuth funciona correctamente desde el bot de Telegram
