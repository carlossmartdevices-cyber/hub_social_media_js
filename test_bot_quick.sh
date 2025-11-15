#!/bin/bash

# Test rápido del bot - ejecuta opción 6 (test completo) automáticamente

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🤖 TELEGRAM BOT - QUICK AUTOMATED TEST                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# 1. Estado del sistema
echo -e "${BOLD}${CYAN}[1] ESTADO DEL SISTEMA${NC}\n"

if pm2 list | grep -q "social-hub.*online"; then
    echo -e "${GREEN}✓ Bot de Telegram: ONLINE${NC}"
else
    echo -e "${RED}✗ Bot de Telegram: OFFLINE${NC}"
    echo -e "${YELLOW}Intenta: pm2 restart social-hub${NC}"
fi

if pm2 list | grep -q "twitter-auth.*online"; then
    echo -e "${GREEN}✓ Servidor OAuth: ONLINE (puerto 3001)${NC}"
else
    echo -e "${RED}✗ Servidor OAuth: OFFLINE${NC}"
    echo -e "${YELLOW}Intenta: pm2 restart twitter-auth${NC}"
fi

echo ""

# 2. Cuentas de Twitter
echo -e "${BOLD}${CYAN}[2] CUENTAS DE TWITTER${NC}\n"

ACCOUNTS=$(curl -s http://localhost:3001/accounts 2>/dev/null)
if [ $? -eq 0 ] && [ ! -z "$ACCOUNTS" ]; then
    echo "$ACCOUNTS" | jq -r '.[] | "  ✓ @\(.username) (\(.accountName))"' 2>/dev/null
    COUNT=$(echo "$ACCOUNTS" | jq '. | length' 2>/dev/null)
    echo -e "\n${GREEN}Total: $COUNT cuenta(s) conectada(s)${NC}"
else
    echo -e "${RED}✗ No se pueden obtener cuentas${NC}"
fi

echo -e "\n"

# 3. Flujo simulado
echo -e "${BOLD}${CYAN}[3] FLUJO DE PUBLICACIÓN${NC}\n"

echo -e "${YELLOW}Paso 1:${NC} Usuario envía /start al bot"
echo -e "${YELLOW}Paso 2:${NC} Selecciona '📝 Post Content'"
echo -e "${YELLOW}Paso 3:${NC} Selecciona '🐦 Twitter/X'"
echo -e "${YELLOW}Paso 4:${NC} Bot muestra:"

if [ $? -eq 0 ] && [ ! -z "$ACCOUNTS" ]; then
    echo "$ACCOUNTS" | jq -r '.[] | "           • @\(.username)"' 2>/dev/null
fi

echo -e "${YELLOW}Paso 5:${NC} Usuario selecciona cuenta"
echo -e "${YELLOW}Paso 6:${NC} Usuario envía mensaje"
echo -e "${GREEN}Paso 7:${NC} ¡Publicado! ✓"

echo -e "\n"

# 4. Archivos críticos
echo -e "${BOLD}${CYAN}[4] ARCHIVOS CRÍTICOS${NC}\n"

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2 ${RED}[FALTA]${NC}"
    fi
}

check_file "/var/www/hub_social_media_js/src/main_interactive_enhanced.js" "Bot principal"
check_file "/var/www/hub_social_media_js/src/auth/authServer.js" "Servidor OAuth"
check_file "/var/www/hub_social_media_js/src/auth/multiAccountTwitterClient.js" "Cliente multi-cuenta"
check_file "/var/www/hub_social_media_js/src/utils/twitterAccountSelector.js" "Selector de cuentas"
check_file "/var/www/hub_social_media_js/credentials/twitter_accounts.json" "Credenciales"
check_file "/var/www/hub_social_media_js/.env" "Variables de entorno"

echo -e "\n"

# 5. Endpoints
echo -e "${BOLD}${CYAN}[5] ENDPOINTS API${NC}\n"

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/accounts | grep -q "200"; then
    echo -e "${GREEN}✓${NC} Local: http://localhost:3001/accounts"
else
    echo -e "${RED}✗${NC} Local: http://localhost:3001/accounts"
fi

if curl -k -s -o /dev/null -w "%{http_code}" https://pnptv.app/accounts | grep -q "200"; then
    echo -e "${GREEN}✓${NC} Nginx: https://pnptv.app/accounts"
else
    echo -e "${RED}✗${NC} Nginx: https://pnptv.app/accounts"
fi

echo -e "\n"

# 6. Logs recientes
echo -e "${BOLD}${CYAN}[6] ÚLTIMOS LOGS${NC}\n"

echo -e "${YELLOW}Bot (últimas 3 líneas):${NC}"
pm2 logs social-hub --lines 3 --nostream 2>&1 | grep -v "PM2" | tail -5

echo -e "\n${YELLOW}Auth Server (últimas 3 líneas):${NC}"
pm2 logs twitter-auth --lines 3 --nostream 2>&1 | grep -v "PM2" | tail -5

echo -e "\n"

# Resumen final
echo -e "${BOLD}${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    RESUMEN DE PRUEBAS                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

BOT_OK=$(pm2 list | grep -q "social-hub.*online" && echo "true" || echo "false")
AUTH_OK=$(pm2 list | grep -q "twitter-auth.*online" && echo "true" || echo "false")
ACCOUNTS_OK=$(curl -s http://localhost:3001/accounts 2>/dev/null | jq -e '. | length > 0' >/dev/null 2>&1 && echo "true" || echo "false")

if [ "$BOT_OK" = "true" ] && [ "$AUTH_OK" = "true" ] && [ "$ACCOUNTS_OK" = "true" ]; then
    echo -e "${GREEN}${BOLD}✅ SISTEMA COMPLETAMENTE OPERACIONAL${NC}\n"
    echo -e "Para probar:"
    echo -e "  1. Abre Telegram"
    echo -e "  2. Envía ${CYAN}/start${NC} a tu bot"
    echo -e "  3. Sigue el flujo: ${CYAN}Post Content → Twitter/X → Selecciona cuenta${NC}"
    echo -e "  4. Envía un mensaje de prueba\n"
    echo -e "Panel web: ${CYAN}https://pnptv.app${NC}"
else
    echo -e "${YELLOW}⚠ SISTEMA PARCIALMENTE OPERACIONAL${NC}\n"
    
    if [ "$BOT_OK" = "false" ]; then
        echo -e "  ${RED}✗${NC} Bot offline - Ejecuta: ${CYAN}pm2 restart social-hub${NC}"
    fi
    
    if [ "$AUTH_OK" = "false" ]; then
        echo -e "  ${RED}✗${NC} Auth server offline - Ejecuta: ${CYAN}pm2 restart twitter-auth${NC}"
    fi
    
    if [ "$ACCOUNTS_OK" = "false" ]; then
        echo -e "  ${RED}✗${NC} Sin cuentas - Visita: ${CYAN}https://pnptv.app${NC}"
    fi
fi

echo ""
