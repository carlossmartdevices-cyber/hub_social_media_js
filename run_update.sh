#!/bin/bash
ssh root@72.60.29.80 << 'ENDSSH'
cd /var/www/hub_social_media_js

# Hacer backup del .env actual
cp .env .env.backup_$(date +%Y%m%d_%H%M%S)
echo "✅ Backup creado"

# Actualizar las credenciales de Twitter
sed -i 's|^TWITTER_CONSUMER_KEY=.*|TWITTER_CONSUMER_KEY=KriW4BjDrZmdJPCtlgfNs8HNa|' .env
sed -i 's|^TWITTER_CONSUMER_SECRET=.*|TWITTER_CONSUMER_SECRET=8FiHGxJit8e7pzccwcQYNDToLFfsq0G55FOZszOhX1LAIlmXnT|' .env
sed -i 's|^TWITTER_BEARER_TOKEN=.*|TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAGlp5QEAAAAA8pnhE29%2BfGibKbHDtpPa9jQDP6I%3DBRQXNgQ0l1hcUACxxajfbO3qMD0UI6Dq8LpQFvtghYFxItU7B6|' .env
sed -i 's|^TWITTER_ACCESS_TOKEN=.*|TWITTER_ACCESS_TOKEN=1614126754892767233-sFsAxWmtll25MJmgszbQixQvVGNo0b|' .env
sed -i 's|^TWITTER_ACCESS_TOKEN_SECRET=.*|TWITTER_ACCESS_TOKEN_SECRET=oPX3BFoP4DhZyqPvijAkNfixc33KkGFTRcnKx3JVnEjxt|' .env

echo ""
echo "✅ Credenciales actualizadas:"
grep '^TWITTER_CONSUMER_KEY=' .env
grep '^TWITTER_ACCESS_TOKEN=' .env | cut -c1-40
echo ""

# Actualizar ecosystem.config.js para usar el script correcto
sed -i "s|script: './src/main.js'|script: './src/main_interactive_enhanced.js'|g" ecosystem.config.js
echo "✅ Ecosystem config actualizado"

# Reiniciar el bot
echo ""
echo "🔄 Reiniciando bot..."
pm2 delete social-hub 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "⏳ Esperando 3 segundos..."
sleep 3

echo ""
echo "📋 Estado del bot:"
pm2 status social-hub

echo ""
echo "📝 Logs recientes:"
pm2 logs social-hub --lines 30 --nostream

ENDSSH
