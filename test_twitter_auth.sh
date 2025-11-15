#!/bin/bash

echo "============================================"
echo "🧪 Testing Twitter Auth Server"
echo "============================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "\n${YELLOW}1. Checking if twitter-auth server is running...${NC}"
if pm2 list | grep -q twitter-auth; then
    echo -e "${GREEN}✅ twitter-auth is running${NC}"
    pm2 info twitter-auth | grep -E "status|uptime|memory"
else
    echo -e "${RED}❌ twitter-auth is NOT running${NC}"
    echo -e "${YELLOW}Starting twitter-auth server...${NC}"
    cd /var/www/hub_social_media_js
    pm2 start ecosystem.config.js --only twitter-auth
    sleep 3
fi

# Check port 3001
echo -e "\n${YELLOW}2. Checking if port 3001 is listening...${NC}"
if netstat -tlnp | grep -q :3001; then
    echo -e "${GREEN}✅ Port 3001 is listening${NC}"
    netstat -tlnp | grep :3001
else
    echo -e "${RED}❌ Port 3001 is NOT listening${NC}"
fi

# Test local endpoint
echo -e "\n${YELLOW}3. Testing local endpoint (localhost:3001)...${NC}"
if curl -s http://localhost:3001/accounts > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is responding on localhost${NC}"
    echo "Accounts found:"
    curl -s http://localhost:3001/accounts | jq -r '.[] | "  - @\(.username) (\(.accountName))"' 2>/dev/null || echo "  (No accounts configured yet)"
else
    echo -e "${RED}❌ Server is NOT responding on localhost${NC}"
fi

# Test nginx proxy
echo -e "\n${YELLOW}4. Testing nginx proxy (https://pnptv.app)...${NC}"
if curl -k -s https://pnptv.app/accounts > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx proxy is working${NC}"
    echo "Testing endpoints:"
    curl -k -s https://pnptv.app/accounts | jq -r '.[] | "  - @\(.username)"' 2>/dev/null || echo "  (No accounts)"
else
    echo -e "${RED}❌ Nginx proxy is NOT working (502 Bad Gateway)${NC}"
    echo -e "${YELLOW}Checking nginx configuration...${NC}"
    nginx -t
fi

# Check PM2 logs
echo -e "\n${YELLOW}5. Last 10 lines of twitter-auth logs:${NC}"
pm2 logs twitter-auth --lines 10 --nostream 2>/dev/null || echo "No logs available"

# Test with curl verbose
echo -e "\n${YELLOW}6. Detailed test with curl:${NC}"
curl -k -v https://pnptv.app/accounts 2>&1 | head -20

echo -e "\n============================================"
echo -e "${YELLOW}📋 Summary:${NC}"
echo "- Local server: http://localhost:3001"
echo "- Public URL: https://pnptv.app"
echo "- Endpoints to test:"
echo "  • GET /accounts - List connected accounts"
echo "  • GET /auth/twitter/start?accountName=test - Start auth"
echo "  • GET / or /index.html - Web panel"
echo "============================================"
