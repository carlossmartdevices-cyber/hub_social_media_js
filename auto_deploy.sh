#!/bin/bash

# Auto-deployment script for Hostinger server
# This script will deploy the fixed Twitter posting code

SERVER_IP="72.60.29.80"
SERVER_USER="root"
SERVER_PATH="/var/www"
DEPLOY_FILE="deploy_package.tar.gz"

echo "========================================="
echo "Social Media Hub - Auto Deployment"
echo "========================================="
echo ""

# Check if deployment package exists
if [ ! -f "$DEPLOY_FILE" ]; then
    echo "❌ Error: $DEPLOY_FILE not found!"
    echo "Please run './deploy.sh' first to create the package."
    exit 1
fi

echo "📦 Deployment package found: $DEPLOY_FILE"
echo "🌐 Target server: $SERVER_USER@$SERVER_IP:$SERVER_PATH"
echo ""

# Option 1: Using SSH key (recommended)
if [ -f ~/.ssh/hostinger_deploy ]; then
    echo "🔐 Using SSH key authentication..."
    echo ""

    echo "Step 1: Uploading deployment package..."
    scp -i ~/.ssh/hostinger_deploy -o StrictHostKeyChecking=no "$DEPLOY_FILE" "$SERVER_USER@$SERVER_IP:$SERVER_PATH/"

    if [ $? -eq 0 ]; then
        echo "✅ Upload successful!"
        echo ""

        echo "Step 2: Extracting and deploying on server..."
        ssh -i ~/.ssh/hostinger_deploy -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
cd /var/www
tar -xzf deploy_package.tar.gz
rm -rf hub_social_media_js.old
mv hub_social_media_js hub_social_media_js.old 2>/dev/null || true
mv deploy_package hub_social_media_js
cd hub_social_media_js
ls -la
echo ""
echo "✅ Files extracted successfully!"
echo ""
echo "Step 3: Restarting PM2 service..."
pm2 restart social-hub 2>/dev/null || pm2 start ecosystem.config.js
pm2 status
echo ""
echo "✅ Service restarted!"
ENDSSH

        if [ $? -eq 0 ]; then
            echo ""
            echo "========================================="
            echo "✅ DEPLOYMENT SUCCESSFUL!"
            echo "========================================="
            echo ""
            echo "Your Twitter/X posting fix is now live!"
            echo "Try posting to X through your Telegram bot."
            echo ""
        else
            echo "❌ Deployment failed during server configuration"
            exit 1
        fi
    else
        echo "❌ Upload failed. Check your SSH key setup."
        exit 1
    fi
else
    # Option 2: Manual password entry
    echo "⚠️  SSH key not found at ~/.ssh/hostinger_deploy"
    echo ""
    echo "To use SSH key authentication (recommended):"
    echo "1. Copy this public key to your Hostinger server:"
    echo ""
    cat ~/.ssh/hostinger_deploy.pub 2>/dev/null || echo "   (Key not generated yet - run ssh-keygen first)"
    echo ""
    echo "2. Add it to ~/.ssh/authorized_keys on the server"
    echo "3. Run this script again"
    echo ""
    echo "OR use manual deployment:"
    echo ""
    echo "scp $DEPLOY_FILE $SERVER_USER@$SERVER_IP:$SERVER_PATH/"
    echo "ssh $SERVER_USER@$SERVER_IP"
    echo "cd $SERVER_PATH && tar -xzf $DEPLOY_FILE && mv deploy_package hub_social_media_js"
    echo "cd hub_social_media_js && pm2 restart social-hub"
    echo ""
fi
