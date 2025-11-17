# Configuración del Webhook de Telegram

Este documento explica cómo configurar el bot de Telegram para funcionar en modo webhook (recomendado para producción).

## 📋 Requisitos Previos

1. **Dominio con HTTPS**: El webhook de Telegram requiere HTTPS (no funciona con HTTP)
2. **Certificado SSL válido**: Puede ser de Let's Encrypt o cualquier CA confiable
3. **Puerto accesible**: El servidor debe ser accesible desde Internet
4. **Nginx/Apache configurado**: Para hacer proxy al contenedor Docker

## 🔧 Configuración

### 1. Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```bash
# Token del bot (obtener de @BotFather en Telegram)
TELEGRAM_BOT_TOKEN=tu_token_aqui

# URL base de tu dominio (SIN trailing slash)
TELEGRAM_WEBHOOK_URL=https://tu-dominio.com/hub

# Path del endpoint webhook (default: /webhook/telegram)
TELEGRAM_WEBHOOK_PATH=/webhook/telegram

# Secret token para validación (genera uno seguro)
TELEGRAM_WEBHOOK_SECRET=un_token_secreto_aleatorio

# Habilitar modo webhook (true para producción, false para desarrollo/polling)
TELEGRAM_USE_WEBHOOK=true
```

### 2. Configuración de Nginx

Agrega esta configuración a tu nginx:

```nginx
# Webhook de Telegram
location /hub/webhook/telegram {
    proxy_pass http://localhost:3010/webhook/telegram;
    proxy_http_version 1.1;

    # Headers necesarios
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # No cachear requests de Telegram
    proxy_cache_bypass $http_upgrade;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

### 3. Reiniciar la Aplicación

```bash
# Reconstruir y reiniciar
docker-compose down
docker-compose build app
docker-compose up -d

# Ver logs para confirmar
docker logs -f content-hub-app
```

## ✅ Verificación

### Logs Esperados

Si el webhook está configurado correctamente, verás estos logs:

```
[info]: Telegram webhook endpoint registered: /webhook/telegram
[info]: Server running on port 3000 in production mode
[info]: Telegram bot webhook configured: https://tu-dominio.com/hub/webhook/telegram
[info]: Telegram bot webhook configured successfully
```

### Verificar Webhook Info

Puedes verificar el estado del webhook usando la API de Telegram:

```bash
curl https://api.telegram.org/bot<TU_TOKEN>/getWebhookInfo
```

Respuesta esperada:
```json
{
  "ok": true,
  "result": {
    "url": "https://tu-dominio.com/hub/webhook/telegram",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

## 🧪 Probar el Bot

1. Busca tu bot en Telegram usando su username
2. Envía el comando `/start`
3. Deberías recibir una respuesta con el menú principal

## 🔄 Cambiar de Webhook a Polling

Si necesitas volver a polling mode (desarrollo):

```bash
# En .env
TELEGRAM_USE_WEBHOOK=false

# Reiniciar
docker-compose restart app
```

## 🐛 Troubleshooting

### El bot no responde

1. **Verificar logs**:
   ```bash
   docker logs content-hub-app --tail 50
   ```

2. **Verificar que nginx está funcionando**:
   ```bash
   curl -I https://tu-dominio.com/hub/webhook/telegram
   ```
   Debería devolver 404 o 400 (normal si no hay POST body)

3. **Verificar webhook en Telegram**:
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
   ```

4. **Verificar que el puerto 3010 está escuchando**:
   ```bash
   netstat -tlnp | grep 3010
   ```

### Error: "Webhook can only be set up for public IPs"

Tu servidor debe ser accesible desde Internet. Verifica:
- El dominio resuelve a la IP pública correcta
- El firewall permite conexiones HTTPS (puerto 443)
- Nginx está escuchando en puerto 443

### Error: "SSL certificate problem"

Telegram requiere un certificado SSL válido:
- Usa Let's Encrypt (gratis)
- Verifica que el certificado no esté expirado
- El certificado debe ser para el dominio correcto

## 📊 Ventajas del Webhook

| Característica | Webhook | Polling |
|----------------|---------|---------|
| **Eficiencia** | ✅ Alta (solo recibe cuando hay updates) | ❌ Baja (consulta constantemente) |
| **Latencia** | ✅ Mínima (~100-200ms) | ⚠️ Media (1-2s) |
| **Uso de CPU** | ✅ Muy bajo | ⚠️ Constante |
| **Uso de red** | ✅ Mínimo | ⚠️ Constante |
| **Escalabilidad** | ✅ Excelente | ⚠️ Limitada |
| **Recomendado para** | Producción | Desarrollo |
| **Requisitos** | HTTPS + dominio | Ninguno |

## 📚 Referencias

- [Telegram Bot API - Webhooks](https://core.telegram.org/bots/api#setwebhook)
- [Telegraf Documentation](https://telegraf.js.org/)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
