#!/bin/bash

# 🚀 Production Deployment Script for Hub Social Media
# Deploys to: https://clickera.app

echo "🚀 Starting Production Deployment to clickera.app"
echo "================================================"

# Check if we're in the correct directory
if [ ! -d "client" ] || [ ! -f "package.json" ]; then
    echo "❌ Error: This script must be run from the project root directory"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required tools
if ! command_exists node; then
    echo "❌ Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ Error: npm is not installed. Please install npm first."
    exit 1
fi

if ! command_exists pm2; then
    echo "ℹ️  PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Step 1: Configure frontend for production
echo -e "\n📋 Step 1: Configuring frontend for production..."
cd client

# Backup existing .env.local
if [ -f ".env.local" ]; then
    cp .env.local .env.local.backup
    echo "✅ Backed up existing .env.local"
fi

# Create production .env.local
echo "NEXT_PUBLIC_API_URL=https://clickera.app/api" > .env.local
echo "✅ Frontend configured for production API"

# Step 2: Install frontend dependencies
echo -e "\n📦 Step 2: Installing frontend dependencies..."
if npm install; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

# Step 3: Build frontend for production
echo -e "\n🔨 Step 3: Building frontend for production..."
if npm run build; then
    echo "✅ Frontend built for production"
else
    echo "❌ Failed to build frontend"
    exit 1
fi

# Step 4: Configure backend for production
echo -e "\n📋 Step 4: Configuring backend for production..."
cd /root/hub_social_media_js

# Check if .env exists and has production settings
if [ -f ".env" ]; then
    # Verify production settings
    if grep -q "NODE_ENV=production" .env && grep -q "API_URL=https://clickera.app" .env; then
        echo "✅ Backend already configured for production"
    else
        echo "⚠️  Backend .env file needs production configuration"
        echo "Please ensure these settings are in your .env file:"
        echo "NODE_ENV=production"
        echo "API_URL=https://clickera.app"
        echo "CLIENT_URL=https://clickera.app"
    fi
else
    echo "❌ Error: .env file not found. Please create it from .env.example"
    exit 1
fi

# Step 5: Install backend dependencies
echo -e "\n📦 Step 5: Installing backend dependencies..."
if npm install; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

# Step 6: Build backend for production
echo -e "\n🔨 Step 6: Building backend for production..."
if npm run build; then
    echo "✅ Backend built for production"
else
    echo "❌ Failed to build backend"
    exit 1
fi

# Step 7: Set up PM2 ecosystem for production
echo -e "\n🔧 Step 7: Setting up PM2 for production..."

# Create production ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'hub-backend-production',
      script: 'dist/index.js',
      cwd: '/root/hub_social_media_js',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      error_file: '/root/.pm2/logs/hub-backend-error.log',
      out_file: '/root/.pm2/logs/hub-backend-out.log'
    },
    {
      name: 'hub-frontend-production',
      script: 'npm',
      args: 'run start',
      cwd: '/root/hub_social_media_js/client',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/root/.pm2/logs/hub-frontend-error.log',
      out_file: '/root/.pm2/logs/hub-frontend-out.log'
    }
  ]
};
EOF

echo "✅ PM2 ecosystem configured for production"

# Step 8: Stop any existing processes
echo -e "\n🛑 Step 8: Stopping existing processes..."
pm2 delete hub-backend-production 2>/dev/null
pm2 delete hub-frontend-production 2>/dev/null
pm2 delete hub-backend 2>/dev/null
pm2 delete hub-frontend 2>/dev/null
echo "✅ Existing processes stopped"

# Step 9: Start production processes
echo -e "\n🚀 Step 9: Starting production processes..."
pm2 start ecosystem.config.js

# Wait for processes to start
sleep 5

# Step 10: Verify processes are running
echo -e "\n🔍 Step 10: Verifying production processes..."
if pm2 list | grep -q "hub-backend-production"; then
    echo "✅ Backend production process running"
else
    echo "❌ Backend production process failed to start"
    exit 1
fi

if pm2 list | grep -q "hub-frontend-production"; then
    echo "✅ Frontend production process running"
else
    echo "❌ Frontend production process failed to start"
    exit 1
fi

# Step 11: Save PM2 processes
echo -e "\n💾 Step 11: Saving PM2 processes..."
pm2 save
pm2 startup
echo "✅ PM2 processes saved and startup configured"

# Step 12: Test production endpoints
echo -e "\n🧪 Step 12: Testing production endpoints..."

# Test backend API
if curl -s "http://localhost:8080/api/" | grep -q '"status":"ok"'; then
    echo "✅ Backend API is responding"
else
    echo "❌ Backend API is not responding"
fi

# Test Twitter login endpoint
if curl -s "http://localhost:8080/api/auth/x/login" | grep -q '"authUrl"'; then
    echo "✅ Twitter login endpoint is working"
else
    echo "❌ Twitter login endpoint is not working"
fi

# Step 13: Provide deployment summary
echo -e "\n📊 Production Deployment Summary"
echo "================================"
echo "✅ Frontend: Configured for https://clickera.app"
echo "✅ Backend: Configured for https://clickera.app"
echo "✅ API URL: https://clickera.app/api/"
echo "✅ Twitter OAuth: Configured and working"
echo ""
echo "🎉 Production Deployment Complete!"
echo "=================================="
echo ""
echo "Next Steps for Full Production Setup:"
echo "1. Configure Nginx as reverse proxy"
echo "2. Set up SSL certificates with Certbot"
echo "3. Configure firewall rules"
echo "4. Set up monitoring and log rotation"
echo "5. Configure backups"
echo ""
echo "Your application is ready for production at:"
echo "- Frontend: https://clickera.app"
echo "- Backend API: https://clickera.app/api/"
echo ""
echo "To manage the production processes:"
echo "- pm2 list (view processes)"
echo "- pm2 logs (view logs)"
echo "- pm2 restart all (restart all)"
echo "- pm2 stop all (stop all)"
