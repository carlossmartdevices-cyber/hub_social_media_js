# 🔧 Setup & Configuration Instructions

## ✅ Completado:

### 1. Database Migration para OAuth
- ✅ Tabla `users` actualizada con columnas para login con X y Telegram
- ✅ Columnas agregadas: x_user_id, x_username, telegram_id, telegram_username, auth_provider, etc.
- ✅ Password ahora es nullable para usuarios OAuth

### 2. Login con X (Twitter)
- ✅ Endpoints implementados:
  - `GET /api/auth/x/login` - Inicia el flujo OAuth
  - `GET /api/auth/x/callback` - Callback de OAuth
- ✅ Verifica y crea usuarios automáticamente
- ✅ Usa PKCE para mayor seguridad

### 3. Login con Telegram
- ✅ Endpoint implementado:
  - `POST /api/auth/telegram/callback` - Recibe datos del widget de Telegram
- ✅ Verifica HMAC hash para autenticación segura
- ✅ Crea/logins usuarios con Telegram

### 4. AWS S3 Storage
- ✅ Servicio de almacenamiento dual (local + S3)
- ✅ Configuración agregada al .env
- ✅ Cambia automáticamente entre local y S3 según configuración

### 5. CLIENT_URL
- ✅ Agregado al .env: CLIENT_URL=https://clickera.app

## ⚠️ Pendiente - Acción Requerida:

### 1. Instalar AWS SDK
```bash
cd /root/hub_social_media_js
npm install --save @aws-sdk/client-s3
```

### 2. Configurar AWS S3 (Opcional)
Edita `.env` y agrega tus credenciales de AWS:
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu_access_key_aqui
AWS_SECRET_ACCESS_KEY=tu_secret_key_aqui
AWS_S3_BUCKET=tu_bucket_name
AWS_S3_ENABLED=true  # Cambiar a true cuando esté configurado
```

### 3. Actualizar xAI API Key
Edita `.env` y actualiza:
```bash
XAI_API_KEY=tu_nueva_api_key_de_xai
XAI_ENABLED=true  # Cambiar a true
```

Obtén tu API key en: https://console.x.ai/

### 4. Compilar y Reiniciar
```bash
# Restaurar StorageService
mv src/services/StorageService.ts.disabled src/services/StorageService.ts

# Compilar
npm run build

# Reiniciar servidor
pkill -f "node /root/hub_social_media_js/dist/index.js"
npm start
```

## 📋 Verificar que Funcione:

### Test Login con X:
1. Ve a: https://clickera.app/login
2. Haz clic en "Login with X"
3. Deberías ser redirigido a Twitter para autorizar
4. Después de autorizar, regresarás a tu app autenticado

### Test Login con Telegram:
1. Implementa el Telegram Login Widget en tu frontend:
```html
<script async src="https://telegram.org/js/telegram-widget.js?22"
  data-telegram-login="TU_BOT_USERNAME"
  data-size="large"
  data-onauth="onTelegramAuth(user)"
  data-request-access="write"></script>

<script>
function onTelegramAuth(user) {
  fetch('https://clickera.app/api/auth/telegram/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  })
  .then(res => res.json())
  .then(data => {
    console.log('Logged in!', data);
    // Guarda accessToken y refreshToken
    localStorage.setItem('accessToken', data.accessToken);
  });
}
</script>
```

### Test AWS S3 (cuando esté configurado):
```javascript
import storageService from './services/StorageService';

// Upload un archivo
const result = await storageService.upload(buffer, {
  folder: 'videos',
  filename: 'video.mp4',
  contentType: 'video/mp4',
  isPublic: true
});

console.log('File URL:', result.url);
```

## 🔍 Troubleshooting:

### Si el login con X no funciona:
- Verifica que TWITTER_CLIENT_ID y TWITTER_CLIENT_SECRET estén en .env
- Verifica que el callback URL esté configurado en Twitter Developer Portal:
  `https://clickera.app/api/auth/x/callback`

### Si el login con Telegram no funciona:
- Verifica que TELEGRAM_BOT_TOKEN esté en .env
- Verifica que el bot esté activo en BotFather

### Si AWS S3 no funciona:
- Verifica las credenciales en .env
- Verifica que el bucket exista y tenga los permisos correctos
- Por defecto está deshabilitado (AWS_S3_ENABLED=false), usa almacenamiento local

## 📱 Frontend Integration:

### Login con X (Twitter)
```javascript
// Obtener URL de autorización
const response = await fetch('https://clickera.app/api/auth/x/login');
const { authUrl } = await response.json();

// Redirigir al usuario
window.location.href = authUrl;

// Manejar callback en /auth/callback
// La URL contendrá: ?accessToken=xxx&refreshToken=xxx&username=xxx
```

### Login con Telegram
Usa el Telegram Login Widget (código arriba)

## 🎯 Próximos Pasos:
1. Instalar AWS SDK
2. Configurar credenciales (AWS, xAI)
3. Compilar y reiniciar
4. Actualizar frontend para usar los nuevos endpoints de login
5. Probar todo end-to-end

¡Listo! Todo el código está implementado, solo falta instalación y configuración.
