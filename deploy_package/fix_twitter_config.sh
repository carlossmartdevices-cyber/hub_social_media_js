#!/bin/bash

echo "========================================="
echo "🔧 Diagnosticando y Corrigiendo Twitter"
echo "========================================="
echo ""

ssh root@72.60.29.80 << 'ENDSSH'
cd /var/www/hub_social_media_js

echo "1️⃣ Verificando si el archivo .env existe..."
if [ -f .env ]; then
    echo "✅ .env existe"
else
    echo "❌ .env NO existe - creando desde .env.example"
    cp .env.example .env
fi

echo ""
echo "2️⃣ Verificando variables de Twitter actuales..."
echo "Variables encontradas:"
grep "^TWITTER" .env 2>/dev/null || echo "⚠️ No se encontraron variables TWITTER"

echo ""
echo "3️⃣ Actualizando/Agregando credenciales de Twitter..."

# Crear función para agregar o actualizar variable
update_or_add() {
    local key=$1
    local value=$2
    if grep -q "^${key}=" .env; then
        # Variable existe - actualizar
        sed -i "s|^${key}=.*|${key}=${value}|" .env
        echo "✅ Actualizado: $key"
    else
        # Variable no existe - agregar
        echo "${key}=${value}" >> .env
        echo "✅ Agregado: $key"
    fi
}

# Actualizar todas las credenciales
update_or_add "TWITTER_CONSUMER_KEY" "KriW4BjDrZmdJPCtlgfNs8HNa"
update_or_add "TWITTER_CONSUMER_SECRET" "8FiHGxJit8e7pzccwcQYNDToLFfsq0G55FOZszOhX1LAIlmXnT"
update_or_add "TWITTER_ACCESS_TOKEN" "1614126754892767233-sFsAxWmtll25MJmgszbQixQvVGNo0b"
update_or_add "TWITTER_ACCESS_TOKEN_SECRET" "oPX3BFoP4DhZyqPvijAkNfixc33KkGFTRcnKx3JVnEjxt"
update_or_add "TWITTER_BEARER_TOKEN" "AAAAAAAAAAAAAAAAAAAAAGlp5QEAAAAA8pnhE29%2BfGibKbHDtpPa9jQDP6I%3DBRQXNgQ0l1hcUACxxajfbO3qMD0UI6Dq8LpQFvtghYFxItU7B6"
update_or_add "TWITTER_CLIENT_ID" "KriW4BjDrZmdJPCtlgfNs8HNa"
update_or_add "TWITTER_CLIENT_SECRET" "8FiHGxJit8e7pzccwcQYNDToLFfsq0G55FOZszOhX1LAIlmXnT"

# También agregar TWITTER_API_KEY si no existe (algunas versiones lo usan)
update_or_add "TWITTER_API_KEY" "KriW4BjDrZmdJPCtlgfNs8HNa"
update_or_add "TWITTER_API_SECRET" "8FiHGxJit8e7pzccwcQYNDToLFfsq0G55FOZszOhX1LAIlmXnT"

echo ""
echo "4️⃣ Verificando que se guardaron correctamente..."
echo "Variables de Twitter en .env:"
grep "^TWITTER" .env

echo ""
echo "5️⃣ Verificando ecosystem.config.js..."
if grep -q "main_interactive_enhanced.js" ecosystem.config.js; then
    echo "✅ Usando script correcto: main_interactive_enhanced.js"
else
    echo "⚠️ Corrigiendo script en ecosystem.config.js..."
    sed -i "s|script: './src/main.js'|script: './src/main_interactive_enhanced.js'|" ecosystem.config.js
    echo "✅ Script corregido"
fi

echo ""
echo "6️⃣ Reiniciando bot..."
pm2 delete social-hub 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "7️⃣ Esperando que el bot inicie..."
sleep 5

echo ""
echo "8️⃣ Estado del bot:"
pm2 status social-hub

echo ""
echo "9️⃣ Últimos logs:"
pm2 logs social-hub --lines 40 --nostream

echo ""
echo "========================================="
echo "🔍 Verificando conexión con Twitter..."
echo "========================================="

node -e "
const TwitterApi = require('twitter-api-v2').TwitterApi;
require('dotenv').config();

console.log('Credenciales detectadas:');
console.log('CONSUMER_KEY:', process.env.TWITTER_CONSUMER_KEY ? '✅ Configurado' : '❌ Falta');
console.log('CONSUMER_SECRET:', process.env.TWITTER_CONSUMER_SECRET ? '✅ Configurado' : '❌ Falta');
console.log('ACCESS_TOKEN:', process.env.TWITTER_ACCESS_TOKEN ? '✅ Configurado' : '❌ Falta');
console.log('ACCESS_TOKEN_SECRET:', process.env.TWITTER_ACCESS_TOKEN_SECRET ? '✅ Configurado' : '❌ Falta');
console.log('');

if (!process.env.TWITTER_CONSUMER_KEY || !process.env.TWITTER_CONSUMER_SECRET) {
    console.log('❌ Faltan credenciales básicas de Twitter');
    process.exit(1);
}

const client = new TwitterApi({
    appKey: process.env.TWITTER_CONSUMER_KEY,
    appSecret: process.env.TWITTER_CONSUMER_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

client.v2.me().then(user => {
    console.log('✅ ¡TWITTER CONECTADO CORRECTAMENTE!');
    console.log('📱 Cuenta vinculada: @' + user.data.username);
    console.log('👤 Nombre: ' + user.data.name);
    console.log('🆔 ID: ' + user.data.id);
}).catch(err => {
    console.log('❌ Error al conectar con Twitter:');
    console.log('   ' + err.message);
    if (err.code === 401) {
        console.log('   → Las credenciales son incorrectas o están expiradas');
        console.log('   → Verifica en: https://developer.twitter.com/en/portal/dashboard');
    }
});
" 2>&1

ENDSSH

