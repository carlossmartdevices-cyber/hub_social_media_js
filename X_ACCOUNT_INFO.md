# ¿A Cuáles Cuentas de X Puedo Postear? 🐦

## Respuesta Corta

**Solo puedes postear a LA CUENTA que autorizó la app.**

Cuando generas el Access Token en el portal de Twitter, ese token está vinculado a UNA cuenta específica de X (la cuenta con la que iniciaste sesión al crear/autorizar la app).

---

## Cómo Funciona

### 1. **Una App = Una Cuenta**

```
Tu App de Twitter → Access Token → Cuenta Específica
```

El Access Token que generaste está vinculado a:
- ✅ La cuenta que autorizó la aplicación
- ❌ NO puedes publicar en otras cuentas con el mismo token

### 2. **¿Qué Cuenta Está Vinculada Actualmente?**

Para saber a qué cuenta estás publicando, puedes verificarlo:

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
  console.log('📱 Tu bot publicará en la cuenta:');
  console.log('   Username: @' + user.data.username);
  console.log('   Name:', user.data.name);
  console.log('   ID:', user.data.id);
}).catch(err => {
  console.log('❌ Error:', err.message);
});
"
```

---

## Opciones para Publicar en Múltiples Cuentas

### Opción 1: Múltiples Apps (Recomendado)

Crea una app diferente para cada cuenta:

```
App 1 (Account @cuenta1) → Token 1 → Publica en @cuenta1
App 2 (Account @cuenta2) → Token 2 → Publica en @cuenta2
App 3 (Account @cuenta3) → Token 3 → Publica en @cuenta3
```

**Pasos:**
1. Inicia sesión en la cuenta de X donde quieres publicar
2. Ve a https://developer.twitter.com/en/portal/dashboard
3. Crea una nueva app O autoriza tu app existente con esa cuenta
4. Genera Access Token para esa cuenta
5. Guarda las credenciales separadas

**Configuración en tu bot:**
```env
# Cuenta 1
TWITTER_1_CONSUMER_KEY=xxx
TWITTER_1_CONSUMER_SECRET=xxx
TWITTER_1_ACCESS_TOKEN=xxx
TWITTER_1_ACCESS_TOKEN_SECRET=xxx

# Cuenta 2
TWITTER_2_CONSUMER_KEY=xxx
TWITTER_2_CONSUMER_SECRET=xxx
TWITTER_2_ACCESS_TOKEN=xxx
TWITTER_2_ACCESS_TOKEN_SECRET=xxx
```

### Opción 2: OAuth Flow Dinámico

Implementar un flujo OAuth donde cada usuario autoriza su propia cuenta:

```
Usuario 1 → Autoriza → Token para @usuario1
Usuario 2 → Autoriza → Token para @usuario2
```

**Pros:**
- ✅ Permite múltiples usuarios
- ✅ Cada usuario controla su cuenta

**Contras:**
- ❌ Más complejo de implementar
- ❌ Requiere servidor web para callback
- ❌ Usuarios deben autorizar manualmente

### Opción 3: Una App, Cambiar Tokens Manualmente

Puedes cambiar los Access Tokens en el .env cuando quieras publicar en otra cuenta:

```bash
# Para publicar en @cuenta1
TWITTER_ACCESS_TOKEN=token_de_cuenta1
TWITTER_ACCESS_TOKEN_SECRET=secret_de_cuenta1

# Para publicar en @cuenta2
TWITTER_ACCESS_TOKEN=token_de_cuenta2
TWITTER_ACCESS_TOKEN_SECRET=secret_de_cuenta2
```

Luego reinicia el bot: `pm2 restart social-hub`

**Pros:**
- ✅ Simple, usa la misma app

**Contras:**
- ❌ Manual, requiere cambiar .env cada vez
- ❌ Requiere reiniciar el bot

---

## Limitaciones de Twitter API

### Free Tier
- 1 app por proyecto
- 1,500 tweets por mes (total, todas las cuentas combinadas si usas múltiples tokens)
- 500 requests por mes

### Límites por Cuenta
- **Tweets**: 2,400 por día (100 por hora)
- **Follows**: 400 por día
- **DMs**: 500 por día

---

## Recomendación para Tu Bot

### Si solo necesitas publicar en 1 cuenta:
✅ Usa la configuración actual
✅ Verifica que el Access Token sea de la cuenta correcta

### Si necesitas publicar en múltiples cuentas:

**Opción A (Simple):** Crea múltiples instancias del bot
```bash
# Bot para cuenta 1
cp -r hub_social_media_js hub_bot_cuenta1
# Edita .env con credenciales de cuenta 1
cd hub_bot_cuenta1 && pm2 start ecosystem.config.js --name social-hub-cuenta1

# Bot para cuenta 2
cp -r hub_social_media_js hub_bot_cuenta2
# Edita .env con credenciales de cuenta 2
cd hub_bot_cuenta2 && pm2 start ecosystem.config.js --name social-hub-cuenta2
```

**Opción B (Avanzado):** Modifica el bot para soportar múltiples cuentas
- Guardar múltiples tokens en la base de datos
- Permitir seleccionar cuenta desde Telegram
- Publicar a cuenta específica según selección

---

## Verificar Tu Cuenta Actual

Para saber exactamente a qué cuenta estás posteando ahora:

1. **Desde el servidor:**
```bash
ssh root@72.60.29.80 'cd /var/www/hub_social_media_js && grep TWITTER_ACCESS_TOKEN .env | head -1'
```

2. **Verifica el username asociado:**

Ve a https://developer.twitter.com/en/portal/dashboard, selecciona tu app, y en "Keys and tokens" verás:
```
Access Token and Secret
Created by @tu_cuenta_actual
```

---

## Ejemplo Práctico

Si tu Access Token fue generado por la cuenta **@MiNegocio**:

- ✅ Puedes publicar tweets en **@MiNegocio**
- ✅ Los tweets aparecerán como si **@MiNegocio** los publicó
- ❌ NO puedes publicar en **@OtraCuenta** con el mismo token
- ❌ NO puedes publicar en **@CuentaPersonal** con el mismo token

Para publicar en **@OtraCuenta**, necesitarías:
1. Iniciar sesión en **@OtraCuenta**
2. Crear/autorizar una app con **@OtraCuenta**
3. Generar un nuevo Access Token para **@OtraCuenta**
4. Usar ese token en tu bot

---

## ¿Necesitas Ayuda?

**Dime:**
1. ¿En cuántas cuentas necesitas publicar?
2. ¿Son cuentas que tú controlas?
3. ¿Necesitas publicar simultáneamente o una a la vez?

Según tu respuesta, te puedo ayudar a configurar la mejor solución! 🚀
