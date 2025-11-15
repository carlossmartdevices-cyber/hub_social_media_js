#!/bin/bash

# Production deployment script for Twitter multi-account setup
set -e

echo "🚀 Setting up Twitter multi-account authentication system..."

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    echo "⚠️  Running as root. Consider using a dedicated user for production."
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p credentials
chmod 700 credentials  # Secure permissions for credentials

# Set proper file permissions
echo "🔒 Setting secure permissions..."
chmod 600 credentials/* 2>/dev/null || true

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Check environment variables
echo "🔧 Checking environment configuration..."

if [ -z "$TWITTER_CONSUMER_KEY" ] || [ -z "$TWITTER_CONSUMER_SECRET" ]; then
    echo "⚠️  WARNING: Twitter API credentials not set."
    echo "    Please set TWITTER_CONSUMER_KEY and TWITTER_CONSUMER_SECRET"
    echo "    You can:"
    echo "    1. Export them: export TWITTER_CONSUMER_KEY='your_key'"
    echo "    2. Add to .env file"
    echo "    3. Set in pm2 ecosystem.config.js"
fi

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "⚠️  WARNING: TELEGRAM_BOT_TOKEN not set."
    echo "    The Telegram bot will not work without this token."
fi

# Check if domain is configured
echo "🌐 Checking domain configuration..."
if command -v curl &> /dev/null; then
    if curl -s --connect-timeout 5 https://pnptv.app/health &> /dev/null; then
        echo "✅ Domain pnptv.app is reachable"
    else
        echo "⚠️  WARNING: pnptv.app is not reachable or no health endpoint"
        echo "    Make sure:"
        echo "    1. DNS points to this server"
        echo "    2. HTTPS is configured (required for Twitter OAuth)"
        echo "    3. Port 3001 is accessible (or proxied)"
    fi
else
    echo "ℹ️  curl not available, skipping domain check"
fi

# Create systemd service files for production (optional)
if command -v systemctl &> /dev/null; then
    echo "🔧 Creating systemd service files..."
    
    cat > /tmp/twitter-auth.service << EOF
[Unit]
Description=Twitter Auth Server
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node src/auth/authServer.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=TWITTER_AUTH_BASE_URL=https://pnptv.app
Environment=TWITTER_AUTH_PORT=3001
EnvironmentFile=-$(pwd)/.env

[Install]
WantedBy=multi-user.target
EOF

    echo "📄 Systemd service file created at /tmp/twitter-auth.service"
    echo "    To install: sudo cp /tmp/twitter-auth.service /etc/systemd/system/"
    echo "    Then: sudo systemctl enable twitter-auth && sudo systemctl start twitter-auth"
fi

# PM2 deployment
echo "🔄 Starting services with PM2..."

# Stop existing services
pm2 stop twitter-auth 2>/dev/null || echo "twitter-auth not running"
pm2 delete twitter-auth 2>/dev/null || echo "twitter-auth not found"

# Start the Twitter auth server
pm2 start ecosystem.config.js --only twitter-auth --update-env

# Restart the main social-hub if it's running
if pm2 list | grep -q social-hub; then
    echo "🔄 Restarting social-hub to pick up new multi-account system..."
    pm2 restart social-hub --update-env
else
    echo "ℹ️  social-hub not running. Start it with: pm2 start ecosystem.config.js --only social-hub"
fi

# Show status
echo "📊 Service status:"
pm2 list

echo ""
echo "✅ Setup complete!"
echo ""
echo "🔗 Next steps:"
echo "1. Set Twitter API credentials in .env or pm2 environment"
echo "2. Configure callback URL in Twitter Developer Portal:"
echo "   https://pnptv.app/auth/twitter/callback"
echo "3. Add Twitter accounts:"
echo "   https://pnptv.app/auth/twitter/start?accountName=your_alias"
echo "4. List accounts: https://pnptv.app/accounts"
echo "5. Test posting: curl -X POST https://pnptv.app/test/your_alias -H 'Content-Type: application/json' -d '{\"message\":\"test\"}'"
echo ""
echo "📊 Monitor logs:"
echo "   pm2 logs twitter-auth"
echo "   pm2 logs social-hub"
echo ""
echo "🔒 Credentials are stored in: $(pwd)/credentials/twitter_accounts.json"
echo "   Make sure this file is secure and backed up!"