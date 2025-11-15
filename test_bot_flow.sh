#!/bin/bash

# Script de prueba del bot de Telegram con publicación real en Twitter

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

clear

echo -e "${BOLD}${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🤖 TELEGRAM BOT - TWITTER MULTI-ACCOUNT TEST             ║
║                                                               ║
║     Prueba el flujo completo de publicación                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

# Variables
BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN /var/www/hub_social_media_js/.env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
CHAT_ID=""

echo -e "${CYAN}${BOLD}Paso 1: Obtener tu Chat ID${NC}\n"
echo -e "Para probar el bot necesito tu Chat ID de Telegram."
echo -e "${YELLOW}Opciones:${NC}"
echo -e "  a) Ingresa manualmente tu Chat ID"
echo -e "  b) Envía un mensaje a tu bot y lo detectaré"
echo ""
read -p "Selecciona (a/b): " option

if [ "$option" = "b" ]; then
    echo -e "\n${YELLOW}► Envía cualquier mensaje a tu bot ahora...${NC}"
    echo -e "${YELLOW}► Esperando 10 segundos...${NC}\n"
    
    sleep 10
    
    # Intentar obtener actualizaciones
    RESPONSE=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates")
    CHAT_ID=$(echo "$RESPONSE" | jq -r '.result[-1].message.chat.id' 2>/dev/null)
    
    if [ "$CHAT_ID" != "null" ] && [ ! -z "$CHAT_ID" ]; then
        echo -e "${GREEN}✓ Chat ID detectado: $CHAT_ID${NC}\n"
    else
        echo -e "${RED}✗ No se pudo detectar el Chat ID${NC}"
        read -p "Ingresa tu Chat ID manualmente: " CHAT_ID
    fi
else
    read -p "Ingresa tu Chat ID: " CHAT_ID
fi

if [ -z "$CHAT_ID" ] || [ "$CHAT_ID" = "null" ]; then
    echo -e "${RED}Error: Chat ID inválido${NC}"
    exit 1
fi

echo -e "\n${CYAN}${BOLD}Paso 2: Verificar estado del sistema${NC}\n"

# Verificar bot
if pm2 list | grep -q "social-hub.*online"; then
    echo -e "${GREEN}✓ Bot de Telegram: ONLINE${NC}"
else
    echo -e "${RED}✗ Bot de Telegram: OFFLINE${NC}"
    echo -e "${YELLOW}Iniciando bot...${NC}"
    pm2 restart social-hub
    sleep 3
fi

# Verificar OAuth server
if pm2 list | grep -q "twitter-auth.*online"; then
    echo -e "${GREEN}✓ Servidor OAuth: ONLINE${NC}"
else
    echo -e "${RED}✗ Servidor OAuth: OFFLINE${NC}"
    echo -e "${YELLOW}Iniciando servidor...${NC}"
    pm2 restart twitter-auth
    sleep 3
fi

# Obtener cuentas de Twitter
echo -e "\n${CYAN}${BOLD}Paso 3: Cuentas de Twitter disponibles${NC}\n"

ACCOUNTS=$(curl -s http://localhost:3001/accounts 2>/dev/null)
if [ $? -eq 0 ] && [ ! -z "$ACCOUNTS" ]; then
    echo "$ACCOUNTS" | jq -r '.[] | "  ✓ @\(.username) (\(.accountName))"' 2>/dev/null
    ACCOUNT_COUNT=$(echo "$ACCOUNTS" | jq '. | length' 2>/dev/null)
    echo -e "\n${GREEN}Total: $ACCOUNT_COUNT cuenta(s)${NC}"
    
    # Obtener nombre de la primera cuenta
    FIRST_ACCOUNT=$(echo "$ACCOUNTS" | jq -r '.[0].username' 2>/dev/null)
else
    echo -e "${RED}✗ No se pueden obtener cuentas${NC}"
    exit 1
fi

echo -e "\n${CYAN}${BOLD}Paso 4: Enviar mensajes de prueba al bot${NC}\n"

send_message() {
    local text="$1"
    curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
        -d chat_id="$CHAT_ID" \
        -d text="$text" \
        -d parse_mode="HTML" > /dev/null
}

echo -e "${YELLOW}► Enviando comando /start...${NC}"
send_message "/start"
sleep 2

echo -e "${GREEN}✓ Mensaje enviado${NC}"
echo -e "${BLUE}Revisa tu bot en Telegram, deberías ver el menú principal${NC}\n"

echo -e "${CYAN}${BOLD}Paso 5: Simular flujo de publicación${NC}\n"

echo -e "${YELLOW}El bot debería mostrar:${NC}"
echo -e "  1. Menú principal con botón: 📝 Post Content"
echo -e "  2. Al hacer clic: opciones de plataforma (Twitter, Instagram, etc.)"
echo -e "  3. Al seleccionar Twitter: lista de cuentas disponibles"
echo -e "  4. Al seleccionar cuenta: pedir el mensaje a publicar"
echo -e "  5. Al enviar mensaje: publicar en Twitter\n"

echo -e "${CYAN}${BOLD}Paso 6: Instrucciones para prueba manual${NC}\n"

echo -e "${BOLD}En tu aplicación de Telegram:${NC}"
echo -e "  ${YELLOW}1.${NC} Busca el mensaje del bot con el menú"
echo -e "  ${YELLOW}2.${NC} Presiona el botón ${CYAN}📝 Post Content${NC}"
echo -e "  ${YELLOW}3.${NC} Presiona el botón ${CYAN}🐦 Twitter/X${NC}"
echo -e "  ${YELLOW}4.${NC} Deberías ver tus cuentas:"
echo "$ACCOUNTS" | jq -r '.[] | "       • @\(.username)"' 2>/dev/null
echo -e "  ${YELLOW}5.${NC} Selecciona ${CYAN}@${FIRST_ACCOUNT}${NC}"
echo -e "  ${YELLOW}6.${NC} Envía un mensaje: ${CYAN}\"Test desde bot multi-cuenta 🚀\"${NC}"
echo -e "  ${YELLOW}7.${NC} El bot debería publicarlo y confirmarte\n"

echo -e "${CYAN}${BOLD}Paso 7: Verificar publicación${NC}\n"

echo -e "Después de publicar, verifica en:"
echo -e "  • Twitter: https://twitter.com/${FIRST_ACCOUNT}"
echo -e "  • Panel web: https://pnptv.app\n"

echo -e "${CYAN}${BOLD}Paso 8: Monitorear logs en tiempo real${NC}\n"

echo -e "${YELLOW}¿Quieres ver los logs del bot en tiempo real? (s/n)${NC}"
read -p "> " show_logs

if [ "$show_logs" = "s" ] || [ "$show_logs" = "S" ]; then
    echo -e "\n${BLUE}Mostrando logs... (Ctrl+C para salir)${NC}\n"
    pm2 logs social-hub --lines 20
else
    echo -e "\n${GREEN}Para ver logs ejecuta: ${CYAN}pm2 logs social-hub${NC}\n"
fi

echo -e "${BOLD}${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     ✅ PRUEBA DEL BOT LISTA                                  ║
║                                                               ║
║     El bot está listo para recibir y publicar mensajes       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

echo -e "${CYAN}Comandos útiles:${NC}"
echo -e "  ${YELLOW}pm2 logs social-hub${NC}        - Ver logs del bot"
echo -e "  ${YELLOW}pm2 logs twitter-auth${NC}      - Ver logs del servidor OAuth"
echo -e "  ${YELLOW}pm2 restart social-hub${NC}     - Reiniciar bot"
echo -e "  ${YELLOW}curl localhost:3001/accounts${NC} - Ver cuentas conectadas"
echo ""
