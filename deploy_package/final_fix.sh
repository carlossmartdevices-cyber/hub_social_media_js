#!/bin/bash

echo "========================================="
echo "🔧 Solución Final - Twitter Fix"
echo "========================================="
echo ""
echo "Este script:"
echo "1. ✅ Sube el archivo corregido main_interactive_enhanced.js"
echo "2. ✅ Actualiza credenciales de Twitter en .env"  
echo "3. ✅ Reinicia el bot"
echo ""
echo "Ejecutando..."
echo ""

# Subir el archivo corregido
echo "📤 Subiendo main_interactive_enhanced.js corregido..."
scp src/main_interactive_enhanced.js root@72.60.29.80:/var/www/hub_social_media_js/src/

# Actualizar .env y reiniciar
echo ""
echo "🔄 Actualizando credenciales y reiniciando..."
ssh root@72.60.29.80 << 'ENDSSH'
cd /var/www/hub_social_media_js

# Agregar/actualizar credenciales
grep -q "^TWITTER_CONSUMER_KEY=" .env && sed -i "s|^TWITTER_CONSUMER_KEY=.*|TWITTER_CONSUMER_KEY=KriW4BjDrZmdJPCtlgfNs8HNa|" .env || echo "TWITTER_CONSUMER_KEY=KriW4BjDrZmdJPCtlgfNs8HNa" >> .env
grep -q "^TWITTER_CONSUMER_SECRET=" .env && sed -i "s|^TWITTER_CONSUMER_SECRET=.*|TWITTER_CONSUMER_SECRET=8FiHGxJit8e7pzccwcQYNDToLFfsq0G55FOZszOhX1LAIlmXnT|" .env || echo "TWITTER_CONSUMER_SECRET=8FiHGxJit8e7pzccwcQYNDToLFfsq0G55FOZszOhX1LAIlmXnT" >> .env
grep -q "^TWITTER_ACCESS_TOKEN=" .env && sed -i "s|^TWITTER_ACCESS_TOKEN=.*|TWITTER_ACCESS_TOKEN=1614126754892767233-sFsAxWmtll25MJmgszbQixQvVGNo0b|" .env || echo "TWITTER_ACCESS_TOKEN=1614126754892767233-sFsAxWmtll25MJmgszbQixQvVGNo0b" >> .env
grep -q "^TWITTER_ACCESS_TOKEN_SECRET=" .env && sed -i "s|^TWITTER_ACCESS_TOKEN_SECRET=.*|TWITTER_ACCESS_TOKEN_SECRET=oPX3BFoP4DhZyqPvijAkNfixc33KkGFTRcnKx3JVnEjxt|" .env || echo "TWITTER_ACCESS_TOKEN_SECRET=oPX3BFoP4DhZyqPvijAkNfixc33KkGFTRcnKx3JVnEjxt" >> .env

echo "✅ Credenciales configuradas"

# Reiniciar bot
pm2 restart social-hub

echo ""
echo "⏳ Esperando 3 segundos..."
sleep 3

echo ""
echo "📊 Estado:"
pm2 status social-hub

echo ""
echo "📝 Logs:"
pm2 logs social-hub --lines 25 --nostream

ENDSSH

echo ""
echo "========================================="
echo "✅ ¡Listo! Verifica los logs arriba"
echo "========================================="
echo ""
echo "Deberías ver:"
echo "  ✅ 'Twitter API client initialized'"
echo "  ✅ 'Enhanced Bot is now running!'"
echo ""

