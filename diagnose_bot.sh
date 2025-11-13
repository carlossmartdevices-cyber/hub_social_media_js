#!/bin/bash

echo "========================================="
echo "🔍 Bot Diagnostic Tool"
echo "========================================="
echo ""

# Check 1: Environment Variables
echo "1️⃣  Checking environment variables..."
if grep -q "TELEGRAM_BOT_TOKEN=" .env 2>/dev/null; then
    echo "   ✅ TELEGRAM_BOT_TOKEN is set"
else
    echo "   ❌ TELEGRAM_BOT_TOKEN is missing!"
fi

if grep -q "TWITTER_API_KEY=" .env 2>/dev/null || grep -q "TWITTER_CONSUMER_KEY=" .env 2>/dev/null; then
    echo "   ✅ Twitter credentials are set"
else
    echo "   ⚠️  Twitter credentials might be missing"
fi
echo ""

# Check 2: Required files
echo "2️⃣  Checking required files..."
if [ -f "src/main_interactive_enhanced.js" ]; then
    echo "   ✅ Main bot file exists"
else
    echo "   ❌ Main bot file missing!"
fi

if [ -f "package.json" ]; then
    echo "   ✅ package.json exists"
else
    echo "   ❌ package.json missing!"
fi

if [ -d "node_modules" ]; then
    echo "   ✅ node_modules directory exists"
else
    echo "   ⚠️  node_modules missing - run 'npm install'"
fi
echo ""

# Check 3: Handler functions
echo "3️⃣  Checking for fix in code..."
if grep -q "async handlePlatformSelection" src/main_interactive_enhanced.js 2>/dev/null; then
    echo "   ✅ handlePlatformSelection exists"
else
    echo "   ❌ handlePlatformSelection missing!"
fi

if grep -q "async handleTimeSelection" src/main_interactive_enhanced.js 2>/dev/null; then
    echo "   ✅ handleTimeSelection exists"
else
    echo "   ❌ handleTimeSelection missing!"
fi

if grep -q "async handleConfirmation" src/main_interactive_enhanced.js 2>/dev/null; then
    echo "   ✅ handleConfirmation exists"
else
    echo "   ❌ handleConfirmation missing!"
fi
echo ""

# Check 4: Local process
echo "4️⃣  Checking if bot is running locally..."
if ps aux | grep -E "node.*main_interactive" | grep -v grep > /dev/null; then
    echo "   ✅ Bot process is running"
    ps aux | grep -E "node.*main_interactive" | grep -v grep
else
    echo "   ⚠️  Bot is not running locally"
fi
echo ""

# Check 5: Server status (if accessible)
echo "5️⃣  Checking server status..."
echo "   Run this to check server:"
echo "   ssh root@72.60.29.80 'pm2 status'"
echo ""

# Check 6: Test bot locally
echo "6️⃣  Test bot locally (optional)..."
echo "   To test the bot locally, run:"
echo "   npm start"
echo "   or"
echo "   node src/main_interactive_enhanced.js"
echo ""

echo "========================================="
echo "📋 Summary"
echo "========================================="
echo ""
echo "If bot is not responding, try:"
echo ""
echo "LOCAL TEST:"
echo "  npm start"
echo ""
echo "SERVER DEPLOYMENT:"
echo "  1. Upload: scp deploy_package.tar.gz root@72.60.29.80:/var/www/"
echo "  2. Deploy: ssh root@72.60.29.80 'cd /var/www && tar -xzf deploy_package.tar.gz && mv deploy_package hub_social_media_js'"
echo "  3. Restart: ssh root@72.60.29.80 'cd /var/www/hub_social_media_js && pm2 restart social-hub'"
echo ""
echo "CHECK SERVER LOGS:"
echo "  ssh root@72.60.29.80 'pm2 logs social-hub --lines 50'"
echo ""
