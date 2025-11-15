#!/bin/bash

echo "🔧 Hub Social Media Bot - Quick Start Script"
echo "=============================================="
echo ""

# Check if bot is already running
if pm2 describe social-hub &>/dev/null; then
    echo "⚠️  Bot is already running. Restarting..."
    pm2 restart social-hub
else
    echo "🚀 Starting bot for the first time..."
    pm2 start ecosystem.config.js
fi

echo ""
echo "Waiting for bot to initialize..."
sleep 3

echo ""
echo "=============================================="
echo "✅ Bot Status:"
echo "=============================================="
pm2 describe social-hub | grep -E "(status|uptime|restarts)"

echo ""
echo "=============================================="
echo "📊 Recent Logs:"
echo "=============================================="
pm2 logs social-hub --lines 10 --nostream

echo ""
echo "=============================================="
echo "💡 Useful Commands:"
echo "=============================================="
echo "  pm2 logs social-hub        - View live logs"
echo "  pm2 monit                  - Monitor resources"
echo "  pm2 restart social-hub     - Restart bot"
echo "  pm2 stop social-hub        - Stop bot"
echo "  pm2 delete social-hub      - Remove from PM2"
echo ""
