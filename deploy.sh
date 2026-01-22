#!/bin/bash

# 🚀 Hub Social Media Deployment Script
# This script builds and deploys both frontend and backend

echo "🚀 Starting Hub Social Media Deployment"
echo "========================================"

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

# Step 1: Install backend dependencies
echo -e "\n📦 Step 1: Installing backend dependencies..."
cd /root/hub_social_media_js
if npm install; then
    echo "✅ Backend dependencies installed successfully"
else
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

# Step 2: Build backend
echo -e "\n🔨 Step 2: Building backend..."
if npm run build; then
    echo "✅ Backend built successfully"
else
    echo "❌ Failed to build backend"
    exit 1
fi

# Step 3: Install frontend dependencies
echo -e "\n📦 Step 3: Installing frontend dependencies..."
cd client
if npm install; then
    echo "✅ Frontend dependencies installed successfully"
else
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

# Step 4: Build frontend
echo -e "\n🔨 Step 4: Building frontend..."
if npm run build; then
    echo "✅ Frontend built successfully"
else
    echo "❌ Failed to build frontend"
    exit 1
fi

# Step 5: Check if PM2 is installed
echo -e "\n🔍 Step 5: Checking PM2 installation..."
if ! command_exists pm2; then
    echo "ℹ️  PM2 not found. Installing PM2..."
    npm install -g pm2
    if [ $? -eq 0 ]; then
        echo "✅ PM2 installed successfully"
    else
        echo "⚠️  PM2 installation failed. You can still run manually with 'npm run start'"
    fi
fi

# Step 6: Start backend
echo -e "\n🚀 Step 6: Starting backend..."
cd /root/hub_social_media_js
if command_exists pm2; then
    # Check if backend is already running
    if pm2 list | grep -q "hub-backend"; then
        echo "ℹ️  Backend is already running. Restarting..."
        pm2 restart hub-backend
    else
        pm2 start src/index.ts --name "hub-backend" --interpreter none
    fi
    
    if [ $? -eq 0 ]; then
        echo "✅ Backend started successfully with PM2"
    else
        echo "❌ Failed to start backend with PM2"
        exit 1
    fi
else
    echo "ℹ️  Starting backend with npm..."
    npm run start &
    echo "✅ Backend started (running in background)"
fi

# Step 7: Start frontend
echo -e "\n🚀 Step 7: Starting frontend..."
cd client
if command_exists pm2; then
    # Check if frontend is already running
    if pm2 list | grep -q "hub-frontend"; then
        echo "ℹ️  Frontend is already running. Restarting..."
        pm2 restart hub-frontend
    else
        pm2 start npm --name "hub-frontend" -- run start
    fi
    
    if [ $? -eq 0 ]; then
        echo "✅ Frontend started successfully with PM2"
    else
        echo "❌ Failed to start frontend with PM2"
        exit 1
    fi
else
    echo "ℹ️  Starting frontend with npm..."
    npm run start &
    echo "✅ Frontend started (running in background)"
fi

# Step 8: Save PM2 processes
echo -e "\n💾 Step 8: Saving PM2 processes..."
if command_exists pm2; then
    pm2 save
    pm2 startup
    echo "✅ PM2 processes saved and startup configured"
fi

# Step 9: Show deployment summary
echo -e "\n📊 Deployment Summary"
echo "===================="
echo "✅ Backend: Running on http://localhost:8080"
echo "✅ Frontend: Running on http://localhost:3000"
echo "✅ API Endpoint: http://localhost:8080/api/"

echo -e "\n🎉 Deployment Complete!"
echo "======================"
echo "Your Hub Social Media application is now running."
echo ""
echo "Access the application at:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:8080/api/"
echo "- Health check: http://localhost:8080/api/"
echo ""
echo "To check running processes:"
echo "- pm2 list (if using PM2)"
echo "- pm2 logs (to view logs)"
echo ""
echo "To stop the application:"
echo "- pm2 stop all (if using PM2)"
echo "- pm2 delete all (to remove from PM2)"
