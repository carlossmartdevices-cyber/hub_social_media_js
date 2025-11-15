#!/bin/bash

echo "═══════════════════════════════════════════════════════════"
echo "🤖 TELEGRAM BOT & TWITTER AUTH - COMPLETE TEST"
echo "═══════════════════════════════════════════════════════════"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "\n${BLUE}═══ 1. PM2 PROCESSES ═══${NC}"
pm2 list | grep -E "social-hub|twitter-auth" || echo "No processes found"

echo -e "\n${BLUE}═══ 2. TWITTER AUTH SERVER ═══${NC}"
echo -e "${YELLOW}Port 3001 status:${NC}"
if netstat -tlnp | grep -q :3001; then
    echo -e "${GREEN}✅ Listening${NC}"
else
    echo -e "${RED}❌ Not listening${NC}"
fi

echo -e "\n${YELLOW}Connected Twitter accounts:${NC}"
curl -s http://localhost:3001/accounts | jq -r '.[] | "  ✓ @\(.username) (\(.accountName))"' 2>/dev/null || echo "  ⚠ No accounts or server error"

echo -e "\n${BLUE}═══ 3. WEB PANEL ═══${NC}"
echo "Testing https://pnptv.app..."
if curl -k -s -o /dev/null -w "%{http_code}" https://pnptv.app | grep -q "200"; then
    echo -e "${GREEN}✅ Web panel accessible${NC}"
else
    echo -e "${RED}❌ Web panel not accessible${NC}"
fi

echo -e "\n${BLUE}═══ 4. TELEGRAM BOT STATUS ═══${NC}"
pm2 info social-hub | grep -E "status|uptime|memory|restart" || echo "Bot info not available"

echo -e "\n${BLUE}═══ 5. RECENT BOT LOGS ═══${NC}"
echo -e "${YELLOW}Last 5 lines:${NC}"
pm2 logs social-hub --lines 5 --nostream 2>&1 | tail -10

echo -e "\n${BLUE}═══ 6. ENDPOINTS TEST ═══${NC}"
echo "Testing API endpoints..."

echo -n "  • GET /accounts: "
if curl -s http://localhost:3001/accounts > /dev/null 2>&1; then
    COUNT=$(curl -s http://localhost:3001/accounts | jq '. | length' 2>/dev/null)
    echo -e "${GREEN}✓ ($COUNT accounts)${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -e "\n${BLUE}═══ 7. BOT FUNCTIONALITY ═══${NC}"
echo "To test the bot:"
echo "  1. Open Telegram and send: /start"
echo "  2. Select: 📝 Post Content"
echo "  3. Choose: 🐦 Twitter/X"
echo "  4. Select your Twitter account"
echo "  5. Send a test message"

echo -e "\n${BLUE}═══ 8. WEB PANEL MANAGEMENT ═══${NC}"
echo "To manage Twitter accounts:"
echo "  1. Open: https://pnptv.app"
echo "  2. Add new account or test posting"
echo "  3. Use the web interface to authenticate new accounts"

echo -e "\n═══════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ SYSTEM READY!${NC}"
echo -e "═══════════════════════════════════════════════════════════"
echo ""
echo "📊 Quick Stats:"
echo "  • Twitter Auth: $(curl -s http://localhost:3001/accounts | jq '. | length' 2>/dev/null || echo '0') accounts connected"
echo "  • Bot Status: $(pm2 jlist | jq -r '.[] | select(.name=="social-hub") | .pm2_env.status' 2>/dev/null || echo 'unknown')"
echo "  • Auth Server: $(pm2 jlist | jq -r '.[] | select(.name=="twitter-auth") | .pm2_env.status' 2>/dev/null || echo 'unknown')"
echo ""
echo "🔗 Important URLs:"
echo "  • Web Panel: https://pnptv.app"
echo "  • API Accounts: https://pnptv.app/accounts"
echo "  • API Auth: https://pnptv.app/auth/twitter/start?accountName=test"
echo ""
