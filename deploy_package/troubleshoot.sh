#!/bin/bash

echo "========================================="
echo "🔍 Troubleshooting Bot Not Responding"
echo "========================================="
echo ""

SERVER_IP="72.60.29.80"
SERVER_USER="root"

echo "Step 1: Checking if you can connect to the server..."
ssh -o ConnectTimeout=5 "$SERVER_USER@$SERVER_IP" "echo 'Connection successful!'" 2>&1

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Cannot connect to server. This might be why auto_deploy.sh failed."
    echo ""
    echo "To deploy manually, run these commands and enter your password:"
    echo ""
    echo "scp deploy_package.tar.gz root@72.60.29.80:/var/www/"
    echo "ssh root@72.60.29.80"
    echo ""
    echo "Then on the server:"
    echo "cd /var/www"
    echo "tar -xzf deploy_package.tar.gz"
    echo "mv deploy_package hub_social_media_js"
    echo "cd hub_social_media_js"
    echo "pm2 restart social-hub"
    echo "pm2 logs social-hub"
    exit 1
fi

echo ""
echo "Step 2: Checking PM2 status on server..."
ssh "$SERVER_USER@$SERVER_IP" "pm2 status" 2>&1

echo ""
echo "Step 3: Checking if files were deployed..."
ssh "$SERVER_USER@$SERVER_IP" "ls -lh /var/www/hub_social_media_js/src/main_interactive_enhanced.js 2>&1"

echo ""
echo "Step 4: Checking if handler functions exist..."
HANDLER_COUNT=$(ssh "$SERVER_USER@$SERVER_IP" "grep -c 'async handlePlatformSelection\|async handleTimeSelection\|async handleConfirmation' /var/www/hub_social_media_js/src/main_interactive_enhanced.js 2>&1")
echo "Handler functions found: $HANDLER_COUNT (should be 3)"

echo ""
echo "Step 5: Checking recent logs..."
ssh "$SERVER_USER@$SERVER_IP" "pm2 logs social-hub --lines 20 --nostream 2>&1"

echo ""
echo "========================================="
echo "📋 Analysis"
echo "========================================="
