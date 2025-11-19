# Twitter OAuth 2.0 Setup Guide

Este sistema usa **OAuth 2.0** para conectar múltiples cuentas de Twitter de forma segura y fácil. Solo necesitas configurar tu app de Twitter UNA VEZ, y luego los usuarios pueden conectar tantas cuentas como quieran con un simple clic.

## 📋 Paso 1: Crear App en Twitter Developer Portal

1. **Ve a**: [developer.twitter.com/en/portal/dashboard](https://developer.twitter.com/en/portal/dashboard)

2. **Inicia sesión** con tu cuenta de Twitter

3. **Crea un nuevo proyecto**:
   - Click en "Create Project"
   - Nombre del proyecto: "Content Hub" (o el que prefieras)
   - Use case: "Making a bot" o "Exploring the API"
   - Project description: "Social media content management"

4. **Crea una App** dentro del proyecto:
   - Click en "Create App"
   - Nombre de la app: "Content Hub App"

## 🔑 Paso 2: Configurar OAuth 2.0

1. **Ve a la configuración de tu App**:
   - En el Dashboard, selecciona tu app
   - Click en "Settings"

2. **Configurar User authentication settings**:
   - Click en "Set up" en la sección "User authentication settings"

3. **Configuración OAuth 2.0**:
   - ✅ **App permissions**: Read and write
   - ✅ **Type of App**: Web App
   - ✅ **Callback URLs**:
     ```
     http://localhost:33010/api/oauth/twitter/callback
     https://tudominio.com/api/oauth/twitter/callback
     ```
   - ✅ **Website URL**: `https://tudominio.com` (o http://localhost:33010 para desarrollo)

4. **Guardar** los cambios

## 📝 Paso 3: Obtener Credenciales

1. **Ve a la pestaña "Keys and tokens"**

2. **Copia estas credenciales** (las necesitarás en el paso 4):
   - **Client ID** (OAuth 2.0)
   - **Client Secret** (OAuth 2.0) - Click en "Generate" si no existe

> ⚠️ **IMPORTANTE**: Guarda el Client Secret en un lugar seguro. No se mostrará de nuevo.

## 🔧 Paso 4: Configurar Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```env
# Twitter OAuth 2.0 Credentials
TWITTER_CLIENT_ID=your_client_id_here
TWITTER_CLIENT_SECRET=your_client_secret_here
TWITTER_REDIRECT_URI=http://localhost:33010/api/oauth/twitter/callback

# Para producción, usa tu dominio real:
# TWITTER_REDIRECT_URI=https://tudominio.com/api/oauth/twitter/callback
```

## 🚀 Paso 5: Usar el Sistema

### Para Desarrolladores:

1. **Inicia el servidor**:
   ```bash
   npm run dev
   ```

2. **Accede a la interfaz**:
   - Ve a: `http://localhost:33010/settings`
   - Click en "Connect Twitter Account"
   - Autoriza la aplicación en Twitter
   - ¡Listo! La cuenta está conectada

### Para Usuarios:

1. **Ir a Settings**:
   - Click en el botón "Settings" en la navegación

2. **Conectar cuenta de Twitter**:
   - Click en "Connect" en la tarjeta de Twitter
   - Serás redirigido a Twitter
   - Autoriza la aplicación
   - Serás redirigido de vuelta automáticamente

3. **Conectar múltiples cuentas**:
   - Para conectar otra cuenta, haz logout de Twitter en tu navegador
   - Vuelve a hacer click en "Connect"
   - Inicia sesión con la otra cuenta de Twitter
   - Autoriza de nuevo
   - ¡Ahora tienes 2 cuentas conectadas!

## 🔐 Seguridad

- ✅ Las credenciales se almacenan **encriptadas** en la base de datos
- ✅ Usamos **PKCE** (Proof Key for Code Exchange) para mayor seguridad
- ✅ Los tokens se **refrescan automáticamente** cuando expiran
- ✅ Cada cuenta está aislada por usuario

## 🛠️ Endpoints Disponibles

### Backend API:

```bash
# Obtener URL de autorización
GET /api/oauth/twitter/authorize

# Callback de Twitter (automático)
GET /api/oauth/twitter/callback?code=xxx&state=xxx

# Listar cuentas conectadas
GET /api/platform-accounts

# Eliminar cuenta
DELETE /api/platform-accounts/:id

# Probar credenciales
POST /api/platform-accounts/:id/test

# Refrescar token
POST /api/oauth/twitter/refresh/:accountId
```

## 📊 Cómo Funciona el Flujo

```
Usuario                 Frontend                Backend              Twitter
  |                       |                       |                     |
  |--[Click Connect]----->|                       |                     |
  |                       |--[GET /authorize]---->|                     |
  |                       |<--[authUrl]-----------| |
  |                       |                       |                     |
  |<--[Redirect]----------|                       |                     |
  |                       |                       |                     |
  |--------------[Authorize App]-------------------------------->|
  |                       |                       |                     |
  |<--[Redirect con code]-------------------------|<-[code & state]-----|
  |                       |                       |                     |
  |                       |                       |--[Exchange code]--->|
  |                       |                       |<--[access_token]----|
  |                       |                       |                     |
  |                       |                       |--[Get user info]--->|
  |                       |                       |<--[user data]-------|
  |                       |                       |                     |
  |                       |                       |--[Store encrypted]  |
  |                       |                       |     credentials     |
  |<--[Success page]------|<--[Redirect]----------|                     |
```

## 🐛 Troubleshooting

### Error: "Invalid redirect_uri"
- **Solución**: Verifica que la URL en `.env` coincida EXACTAMENTE con la configurada en Twitter

### Error: "App is not authorized"
- **Solución**: Verifica que hayas habilitado "User authentication settings" en Twitter

### Error: "Client credentials are not valid"
- **Solución**: Verifica que el Client ID y Client Secret sean correctos

### No se redirige después de autorizar
- **Solución**: Verifica que el servidor esté corriendo en el puerto correcto (33010)

## 💡 Consejos

1. **Desarrollo local**: Usa `http://localhost:33010` en las URLs
2. **Producción**: Usa tu dominio real con HTTPS
3. **Múltiples entornos**: Puedes tener diferentes apps de Twitter para dev/staging/prod
4. **Rate limits**: Twitter tiene límites de API - monitorea tu uso

## 🔗 Referencias

- [Twitter OAuth 2.0 Documentation](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
- [Twitter API v2 Reference](https://developer.twitter.com/en/docs/api-reference-index)
- [PKCE Specification](https://oauth.net/2/pkce/)
