#!/bin/bash

# Deployment Verification Script
# This script checks if the Twitter/X posting fix was deployed successfully

SERVER_IP="72.60.29.80"
SERVER_USER="root"

echo "========================================="
echo "Deployment Verification"
echo "========================================="
echo ""

echo "Connecting to server: $SERVER_USER@$SERVER_IP"
echo ""

ssh -o ConnectTimeout=10 "$SERVER_USER@$SERVER_IP" << 'ENDSSH'

echo "1️⃣  Checking if deployment directory exists..."
if [ -d "/var/www/hub_social_media_js" ]; then
    echo "✅ Deployment directory found: /var/www/hub_social_media_js"
    echo ""
else
    echo "❌ Deployment directory not found!"
    exit 1
fi

echo "2️⃣  Checking latest files..."
cd /var/www/hub_social_media_js
echo "Main enhanced file:"
ls -lh src/main_interactive_enhanced.js
echo ""

echo "3️⃣  Checking for fixed handler functions..."
if grep -q "handlePlatformSelection" src/main_interactive_enhanced.js; then
    echo "✅ handlePlatformSelection found"
else
    echo "❌ handlePlatformSelection NOT found"
fi

if grep -q "handleTimeSelection" src/main_interactive_enhanced.js; then
    echo "✅ handleTimeSelection found"
else
    echo "❌ handleTimeSelection NOT found"
fi

if grep -q "handleConfirmation" src/main_interactive_enhanced.js; then
    echo "✅ handleConfirmation found"
else
    echo "❌ handleConfirmation NOT found"
fi
echo ""

echo "4️⃣  Checking PM2 process status..."
pm2 status social-hub
echo ""

echo "5️⃣  Checking if bot is running..."
pm2 describe social-hub | grep -E "status|uptime|restarts"
echo ""

echo "6️⃣  Recent logs (last 20 lines)..."
pm2 logs social-hub --lines 20 --nostream
echo ""

echo "========================================="
echo "Verification Complete!"
echo "========================================="
echo ""
echo "If you see '✅' for all handler functions and"
echo "PM2 status shows 'online', deployment succeeded!"
echo ""

ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Server connection successful!"
    echo ""
    echo "Next steps:"
    echo "1. Test the bot by sending /start to your Telegram bot"
    echo "2. Click '📝 Post Content'"
    echo "3. Click '🐦 Post to Twitter/X'"
    echo "4. You should see: 'Send the content you want to post to Twitter/X'"
    echo ""
else
    echo ""
    echo "❌ Could not connect to server"
    echo "Please check your connection and credentials"
    echo ""
fi
