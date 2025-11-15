#!/bin/bash

# Script de prueba interactiva del bot de Telegram con multi-cuentas de Twitter

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

clear

echo -e "${BOLD}${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║     🤖 TELEGRAM BOT - TWITTER MULTI-ACCOUNT TESTER        ║${NC}"
echo -e "${BOLD}${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Función para mostrar estado
show_status() {
    echo -e "${CYAN}► Verificando estado del sistema...${NC}\n"
    
    # 1. PM2 Processes
    echo -e "${YELLOW}[1] Procesos PM2:${NC}"
    if pm2 list | grep -q "social-hub.*online"; then
        echo -e "  ${GREEN}✓ Bot de Telegram: ONLINE${NC}"
        UPTIME=$(pm2 jlist | jq -r '.[] | select(.name=="social-hub") | .pm2_env.pm_uptime' | xargs -I {} date -d @{} +"%H:%M:%S" 2>/dev/null)
        RESTARTS=$(pm2 jlist | jq -r '.[] | select(.name=="social-hub") | .pm2_env.restart_time' 2>/dev/null)
        echo -e "    Uptime: $UPTIME | Reinicios: $RESTARTS"
    else
        echo -e "  ${RED}✗ Bot de Telegram: OFFLINE${NC}"
    fi
    
    if pm2 list | grep -q "twitter-auth.*online"; then
        echo -e "  ${GREEN}✓ Servidor OAuth: ONLINE${NC}"
        echo -e "    Puerto: 3001"
    else
        echo -e "  ${RED}✗ Servidor OAuth: OFFLINE${NC}"
    fi
    
    echo ""
    
    # 2. Twitter Accounts
    echo -e "${YELLOW}[2] Cuentas de Twitter conectadas:${NC}"
    ACCOUNTS=$(curl -s http://localhost:3001/accounts 2>/dev/null)
    if [ $? -eq 0 ] && [ ! -z "$ACCOUNTS" ]; then
        echo "$ACCOUNTS" | jq -r '.[] | "  ✓ @\(.username) (\(.accountName))"' 2>/dev/null
        ACCOUNT_COUNT=$(echo "$ACCOUNTS" | jq '. | length' 2>/dev/null)
        echo -e "  ${GREEN}Total: $ACCOUNT_COUNT cuenta(s)${NC}"
    else
        echo -e "  ${RED}✗ No se pueden obtener cuentas${NC}"
    fi
    
    echo ""
    
    # 3. Endpoints
    echo -e "${YELLOW}[3] Endpoints de API:${NC}"
    
    # Test local
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/accounts | grep -q "200"; then
        echo -e "  ${GREEN}✓ Local (3001): Funcionando${NC}"
    else
        echo -e "  ${RED}✗ Local (3001): Error${NC}"
    fi
    
    # Test nginx
    if curl -k -s -o /dev/null -w "%{http_code}" https://pnptv.app/accounts | grep -q "200"; then
        echo -e "  ${GREEN}✓ Nginx (pnptv.app): Funcionando${NC}"
    else
        echo -e "  ${RED}✗ Nginx (pnptv.app): Error${NC}"
    fi
    
    echo ""
}

# Función para simular interacción del bot
test_bot_flow() {
    echo -e "${CYAN}► Simulando flujo del bot...${NC}\n"
    
    echo -e "${YELLOW}[PASO 1] Usuario envía: /start${NC}"
    echo -e "  ${BLUE}→ Bot muestra menú principal con:${NC}"
    echo -e "    • 📝 Post Content"
    echo -e "    • 📅 Schedule Post"
    echo -e "    • 📊 View Schedule"
    echo ""
    
    echo -e "${YELLOW}[PASO 2] Usuario selecciona: 📝 Post Content${NC}"
    echo -e "  ${BLUE}→ Bot muestra opciones de plataforma:${NC}"
    echo -e "    • 🐦 Twitter/X"
    echo -e "    • 📸 Instagram"
    echo -e "    • 🎵 TikTok"
    echo ""
    
    echo -e "${YELLOW}[PASO 3] Usuario selecciona: 🐦 Twitter/X${NC}"
    echo -e "  ${BLUE}→ Bot consulta cuentas disponibles...${NC}"
    
    # Obtener cuentas reales
    ACCOUNTS=$(curl -s http://localhost:3001/accounts 2>/dev/null)
    if [ $? -eq 0 ] && [ ! -z "$ACCOUNTS" ]; then
        echo -e "  ${GREEN}→ Mostrando selector de cuentas:${NC}"
        echo "$ACCOUNTS" | jq -r '.[] | "    • @\(.username)"' 2>/dev/null
    else
        echo -e "  ${RED}→ Error al obtener cuentas${NC}"
        return 1
    fi
    
    echo ""
    
    echo -e "${YELLOW}[PASO 4] Usuario selecciona cuenta (ej: @PNPMethDaddy)${NC}"
    echo -e "  ${BLUE}→ Bot guarda selección en estado del usuario${NC}"
    echo -e "  ${BLUE}→ Bot pide el contenido a publicar${NC}"
    echo ""
    
    echo -e "${YELLOW}[PASO 5] Usuario envía: \"Hola desde el bot multi-cuenta! 🚀\"${NC}"
    echo -e "  ${BLUE}→ Bot procesa el mensaje${NC}"
    echo -e "  ${BLUE}→ Bot publica en la cuenta seleccionada${NC}"
    echo -e "  ${GREEN}→ Confirmación enviada al usuario${NC}"
    echo ""
}

# Función para mostrar logs recientes
show_logs() {
    echo -e "${CYAN}► Últimos logs del bot:${NC}\n"
    
    echo -e "${YELLOW}[Logs de social-hub]${NC}"
    pm2 logs social-hub --lines 10 --nostream 2>&1 | grep -v "PM2" | tail -15
    
    echo ""
    
    echo -e "${YELLOW}[Logs de twitter-auth]${NC}"
    pm2 logs twitter-auth --lines 5 --nostream 2>&1 | grep -v "PM2" | tail -10
    
    echo ""
}

# Función para probar posting real
test_real_post() {
    echo -e "${CYAN}► Prueba de publicación real (simulada)...${NC}\n"
    
    # Obtener primera cuenta
    FIRST_ACCOUNT=$(curl -s http://localhost:3001/accounts 2>/dev/null | jq -r '.[0].accountName' 2>/dev/null)
    
    if [ -z "$FIRST_ACCOUNT" ]; then
        echo -e "${RED}✗ No hay cuentas disponibles${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Cuenta seleccionada: $FIRST_ACCOUNT${NC}"
    echo -e "${YELLOW}Mensaje: \"Test desde script automatizado - $(date +%H:%M:%S)\"${NC}"
    echo ""
    echo -e "${BLUE}Para publicar realmente, usa el bot de Telegram:${NC}"
    echo -e "  1. /start"
    echo -e "  2. 📝 Post Content"
    echo -e "  3. 🐦 Twitter/X"
    echo -e "  4. Selecciona @$FIRST_ACCOUNT"
    echo -e "  5. Envía tu mensaje"
    echo ""
}

# Función para verificar archivos críticos
check_files() {
    echo -e "${CYAN}► Verificando archivos críticos...${NC}\n"
    
    FILES=(
        "/var/www/hub_social_media_js/src/main_interactive_enhanced.js"
        "/var/www/hub_social_media_js/src/auth/authServer.js"
        "/var/www/hub_social_media_js/src/auth/twitterAuth.js"
        "/var/www/hub_social_media_js/src/auth/multiAccountTwitterClient.js"
        "/var/www/hub_social_media_js/src/utils/twitterAccountSelector.js"
        "/var/www/hub_social_media_js/ecosystem.config.js"
        "/var/www/hub_social_media_js/.env"
        "/var/www/hub_social_media_js/credentials/twitter_accounts.json"
    )
    
    for file in "${FILES[@]}"; do
        if [ -f "$file" ]; then
            echo -e "  ${GREEN}✓${NC} $(basename $file)"
        else
            echo -e "  ${RED}✗${NC} $(basename $file) ${RED}[FALTA]${NC}"
        fi
    done
    
    echo ""
}

# Menú principal
while true; do
    echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}Selecciona una opción:${NC}"
    echo ""
    echo -e "  ${GREEN}1)${NC} Ver estado del sistema"
    echo -e "  ${GREEN}2)${NC} Simular flujo del bot"
    echo -e "  ${GREEN}3)${NC} Ver logs recientes"
    echo -e "  ${GREEN}4)${NC} Probar publicación (guía)"
    echo -e "  ${GREEN}5)${NC} Verificar archivos críticos"
    echo -e "  ${GREEN}6)${NC} Test completo (todo)"
    echo -e "  ${GREEN}0)${NC} Salir"
    echo ""
    echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -n -e "${YELLOW}Opción:${NC} "
    
    read option
    
    echo ""
    
    case $option in
        1)
            show_status
            ;;
        2)
            test_bot_flow
            ;;
        3)
            show_logs
            ;;
        4)
            test_real_post
            ;;
        5)
            check_files
            ;;
        6)
            show_status
            echo ""
            test_bot_flow
            echo ""
            show_logs
            echo ""
            check_files
            ;;
        0)
            echo -e "${GREEN}¡Hasta luego!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Opción inválida${NC}"
            ;;
    esac
    
    echo ""
    echo -e "${YELLOW}Presiona ENTER para continuar...${NC}"
    read
    clear
done
