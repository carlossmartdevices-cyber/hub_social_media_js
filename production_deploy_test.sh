#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════╗"
echo -e "║   🚀 PRODUCTION DEPLOYMENT VALIDATION - SOCIAL HUB BOT   ║"
echo -e "╚════════════════════════════════════════════════════════════╝${NC}\n"

# 1. PM2 process check
echo -e "${YELLOW}Checking PM2 processes...${NC}"
pm2 list | grep -E "social-hub|twitter-auth" || echo -e "${RED}No bot/auth process found!${NC}"

# 2. Service status
echo -e "\n${YELLOW}Checking bot and auth server status...${NC}"
BOT_OK=$(pm2 list | grep -q "social-hub.*online" && echo "true" || echo "false")
AUTH_OK=$(pm2 list | grep -q "twitter-auth.*online" && echo "true" || echo "false")
if [ "$BOT_OK" = "true" ]; then
    echo -e "${GREEN}✓ Bot online${NC}"
else
    echo -e "${RED}✗ Bot offline${NC}"
fi
if [ "$AUTH_OK" = "true" ]; then
    echo -e "${GREEN}✓ Auth server online${NC}"
else
    echo -e "${RED}✗ Auth server offline${NC}"
fi

# 3. Twitter accounts
echo -e "\n${YELLOW}Checking Twitter accounts...${NC}"
ACCOUNTS=$(curl -s http://localhost:3001/accounts 2>/dev/null)
if [ $? -eq 0 ] && [ ! -z "$ACCOUNTS" ]; then
    echo "$ACCOUNTS" | jq -r '.[] | "  ✓ @\(.username) (\(.accountName))"' 2>/dev/null
    COUNT=$(echo "$ACCOUNTS" | jq '. | length' 2>/dev/null)
    echo -e "${GREEN}Total: $COUNT account(s) connected${NC}"
else
    echo -e "${RED}✗ No Twitter accounts found${NC}"
fi

# 4. Critical files
echo -e "\n${YELLOW}Checking critical files...${NC}"
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
        echo -e "${GREEN}✓${NC} $(basename $file)"
    else
        echo -e "${RED}✗${NC} $(basename $file) ${RED}[MISSING]${NC}"
    fi
    done

# 5. Endpoints
echo -e "\n${YELLOW}Checking API endpoints...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/accounts | grep -q "200"; then
    echo -e "${GREEN}✓ Local: http://localhost:3001/accounts${NC}"
else
    echo -e "${RED}✗ Local: http://localhost:3001/accounts${NC}"
fi
if curl -k -s -o /dev/null -w "%{http_code}" https://pnptv.app/accounts | grep -q "200"; then
    echo -e "${GREEN}✓ Nginx: https://pnptv.app/accounts${NC}"
else
    echo -e "${RED}✗ Nginx: https://pnptv.app/accounts${NC}"
fi

# 6. Last logs
echo -e "\n${YELLOW}Last bot logs:${NC}"
pm2 logs social-hub --lines 5 --nostream 2>&1 | tail -10
echo -e "\n${YELLOW}Last auth server logs:${NC}"
pm2 logs twitter-auth --lines 5 --nostream 2>&1 | tail -10

# 7. Final summary
echo -e "\n${BOLD}${CYAN}╔════════════════════════════════════════════════════════════╗"
echo -e "║                  FINAL DEPLOYMENT STATUS                  ║"
echo -e "╚════════════════════════════════════════════════════════════╝${NC}"

if [ "$BOT_OK" = "true" ] && [ "$AUTH_OK" = "true" ] && [ ! -z "$ACCOUNTS" ]; then
    echo -e "${GREEN}${BOLD}✅ READY FOR PRODUCTION DEPLOYMENT${NC}\n"
    echo -e "Test the bot in Telegram:\n  1. /start\n  2. Post Content → Twitter/X → Select account\n  3. Send message\n"
    echo -e "Web panel: https://pnptv.app"
else
    echo -e "${RED}${BOLD}⚠ NOT READY - Fix errors above before deploying${NC}\n"
fi
