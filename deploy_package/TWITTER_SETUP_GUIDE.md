# Guía de Configuración de Twitter API 🐦

## Estado Actual

Tu configuración de Twitter tiene credenciales, pero necesitas verificar que funcionen correctamente.

### Credenciales Actuales en `.env`:
- ✅ `TWITTER_CONSUMER_KEY` - Configurado
- ✅ `TWITTER_CONSUMER_SECRET` - Configurado
- ✅ `TWITTER_ACCESS_TOKEN` - Configurado
- ✅ `TWITTER_ACCESS_TOKEN_SECRET` - Configurado
- ✅ `TWITTER_BEARER_TOKEN` - Configurado
- ✅ `TWITTER_CLIENT_ID` - Configurado
- ✅ `TWITTER_CLIENT_SECRET` - Configurado

---

## Problema Detectado

Los logs muestran error 401:
```
Error: Twitter API error: Request failed with code 401
```

**401 = No autorizado** - Esto significa que las credenciales están incorrectas o han expirado.

---

## Cómo Obtener/Renovar Credenciales de Twitter

### Paso 1: Acceder al Portal de Desarrolladores

1. Ve a: https://developer.twitter.com/en/portal/dashboard
2. Inicia sesión con tu cuenta de Twitter
3. Selecciona tu proyecto/app

### Paso 2: Verificar Nivel de Acceso

Tu app necesita **"Read and Write"** acceso para publicar tweets.

1. En el portal, ve a tu app
2. Click en **"User authentication settings"**
3. Verifica que tengas: **"Read and Write"** ✅
4. Si solo dice "Read", cámbialo a **"Read and Write"** y guarda

### Paso 3: Regenerar Credenciales

Si tus credenciales están expiradas:

1. Ve a **"Keys and tokens"** en tu app
2. Click **"Regenerate"** en:
   - Consumer Keys (API Key & Secret)
   - Access Token & Secret

3. **IMPORTANTE**: Copia las nuevas credenciales inmediatamente (no las podrás ver después)

---

## Actualizar Credenciales en el Servidor

### Opción 1: Editar directamente en el servidor

```bash
ssh root@72.60.29.80
cd /var/www/hub_social_media_js
nano .env
```

Actualiza estas líneas con tus NUEVAS credenciales:
```
TWITTER_CONSUMER_KEY=tu_nueva_consumer_key
TWITTER_CONSUMER_SECRET=tu_nuevo_consumer_secret
TWITTER_ACCESS_TOKEN=tu_nuevo_access_token
TWITTER_ACCESS_TOKEN_SECRET=tu_nuevo_access_token_secret
TWITTER_BEARER_TOKEN=tu_nuevo_bearer_token
```

Guarda (Ctrl+O, Enter) y sal (Ctrl+X)

Reinicia el bot:
```bash
pm2 restart social-hub
```

### Opción 2: Actualizar desde local y subir

1. Edita `.env` localmente con las nuevas credenciales
2. Sube el archivo:
```bash
scp .env root@72.60.29.80:/var/www/hub_social_media_js/
```
3. Reinicia:
```bash
ssh root@72.60.29.80 'cd /var/www/hub_social_media_js && pm2 restart social-hub'
```

---

## Estructura de Credenciales de Twitter

### OAuth 1.0a (Recomendado para publicar)
```
TWITTER_CONSUMER_KEY=xxxx           # API Key
TWITTER_CONSUMER_SECRET=xxxx        # API Secret
TWITTER_ACCESS_TOKEN=xxxx           # Access Token
TWITTER_ACCESS_TOKEN_SECRET=xxxx    # Access Token Secret
```

### OAuth 2.0 (Solo lectura por defecto)
```
TWITTER_BEARER_TOKEN=xxxx          # Para lectura
TWITTER_CLIENT_ID=xxxx             # Para OAuth 2.0
TWITTER_CLIENT_SECRET=xxxx         # Para OAuth 2.0
```

---

## Niveles de Acceso Requeridos

Para que tu bot funcione completamente:

| Función | Nivel Requerido | Tipo Auth |
|---------|----------------|-----------|
| Publicar tweets | Read and Write | OAuth 1.0a |
| Leer timeline | Read | OAuth 2.0 o Bearer |
| Subir imágenes | Read and Write | OAuth 1.0a |
| Twitter Spaces | Elevated Access | OAuth 1.0a |

---

## Verificar que las Credenciales Funcionen

### Prueba Rápida (en el servidor):

```bash
ssh root@72.60.29.80
cd /var/www/hub_social_media_js
node -e "
const TwitterApi = require('twitter-api-v2').TwitterApi;
require('dotenv').config();

const client = new TwitterApi({
  appKey: process.env.TWITTER_CONSUMER_KEY,
  appSecret: process.env.TWITTER_CONSUMER_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

client.v2.me().then(user => {
  console.log('✅ Twitter conectado correctamente!');
  console.log('Usuario:', user.data.username);
}).catch(err => {
  console.log('❌ Error:', err.message);
});
"
```

Si ves **"✅ Twitter conectado correctamente!"** → Las credenciales funcionan

Si ves **"❌ Error: 401"** → Necesitas regenerar credenciales

---

## Tipos de Apps de Twitter

### Free Tier (Gratis)
- ✅ 1,500 tweets por mes
- ✅ 500 requests por mes
- ✅ Read and Write access
- ❌ Sin acceso a búsqueda avanzada

### Basic ($100/mes)
- ✅ 3,000 tweets por mes
- ✅ 10,000 requests por mes
- ✅ Todas las funciones Free
- ✅ Búsqueda reciente

### Pro ($5,000/mes)
- ✅ Tweets ilimitados
- ✅ 1,000,000 requests por mes
- ✅ Búsqueda completa
- ✅ Acceso a Spaces API

---

## Problemas Comunes

### Error 401 - No autorizado
**Causa**: Credenciales incorrectas o expiradas
**Solución**: Regenera las credenciales en el portal de Twitter

### Error 403 - Forbidden
**Causa**: Tu app no tiene permisos "Read and Write"
**Solución**: Actualiza permisos en User Authentication Settings

### Error 429 - Too Many Requests
**Causa**: Excediste el límite de requests
**Solución**: Espera o actualiza a plan superior

### Error "App suspended"
**Causa**: Violación de términos de Twitter
**Solución**: Contacta a Twitter Support

---

## Configuración Recomendada para tu Bot

Para un bot de Telegram que publica en Twitter:

```env
# OAuth 1.0a - Para publicar tweets
TWITTER_CONSUMER_KEY=tu_api_key
TWITTER_CONSUMER_SECRET=tu_api_secret
TWITTER_ACCESS_TOKEN=tu_access_token
TWITTER_ACCESS_TOKEN_SECRET=tu_access_token_secret

# OAuth 2.0 - Opcional, para lectura
TWITTER_BEARER_TOKEN=tu_bearer_token
TWITTER_CLIENT_ID=tu_client_id
TWITTER_CLIENT_SECRET=tu_client_secret
```

**Nota**: El bot usa OAuth 1.0a automáticamente si detecta Access Token & Secret

---

## Siguiente Paso

1. **Ve a**: https://developer.twitter.com/en/portal/dashboard
2. **Verifica** que tu app tenga "Read and Write" access
3. **Regenera** las credenciales si es necesario
4. **Actualiza** el archivo `.env` en el servidor
5. **Reinicia** el bot: `pm2 restart social-hub`
6. **Prueba** publicando desde tu bot de Telegram

---

## ¿Necesitas Ayuda?

Si sigues teniendo problemas:

1. Verifica los logs:
   ```bash
   ssh root@72.60.29.80 'pm2 logs social-hub --lines 50'
   ```

2. Busca estos errores:
   - Error 401 → Credenciales incorrectas
   - Error 403 → Permisos insuficientes
   - Error 429 → Límite de rate excedido

3. Comparte el error específico para más ayuda
