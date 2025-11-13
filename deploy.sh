#!/bin/bash

# Exit on error
set -e

# Deployment Script for Hostinger Server
# This script helps prepare your application for deployment

echo "========================================="
echo "Social Media Hub - Deployment Preparation"
echo "========================================="
echo ""

# Check if rsync is installed, use fallback if not
USE_RSYNC=false
if command -v rsync &> /dev/null; then
    USE_RSYNC=true
    echo "Using rsync for file copying..."
else
    echo "rsync not found, using cp command..."
fi

# Check if required files exist
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found!"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. Make sure to configure it on the server!"
fi

# Create logs directory if it doesn't exist
mkdir -p logs
echo "Created logs directory"

# Create deployment package
echo "Creating deployment package..."
DEPLOY_DIR="deploy_package"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy necessary files (excluding node_modules)
echo "Copying project files..."
if [ "$USE_RSYNC" = true ]; then
    rsync -av --progress . "$DEPLOY_DIR" \
        --exclude node_modules \
        --exclude .git \
        --exclude logs \
        --exclude "$DEPLOY_DIR" \
        --exclude '*.log'
else
    # Fallback: use cp command
    cp -r . "$DEPLOY_DIR" 2>/dev/null || true
    # Remove excluded directories/files
    rm -rf "$DEPLOY_DIR/node_modules" 2>/dev/null || true
    rm -rf "$DEPLOY_DIR/.git" 2>/dev/null || true
    rm -rf "$DEPLOY_DIR/logs" 2>/dev/null || true
    rm -rf "$DEPLOY_DIR/$DEPLOY_DIR" 2>/dev/null || true
    find "$DEPLOY_DIR" -name "*.log" -type f -delete 2>/dev/null || true
    echo "Files copied successfully"
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "Deployment package created in: $DEPLOY_DIR"
    echo "========================================="
    echo ""
    echo "Next steps:"
    echo "1. Compress the deployment package:"
    echo "   tar -czf deploy_package.tar.gz \"$DEPLOY_DIR\""
    echo ""
    echo "2. Upload to your Hostinger server:"
    echo "   scp deploy_package.tar.gz username@your-server-ip:/var/www/"
    echo ""
    echo "3. SSH into your server and extract:"
    echo "   ssh username@your-server-ip"
    echo "   cd /var/www"
    echo "   tar -xzf deploy_package.tar.gz"
    echo "   mv deploy_package hub_social_media_js"
    echo ""
    echo "4. Follow the instructions in HOSTINGER_DEPLOY.md"
    echo ""
else
    echo "Error: Failed to create deployment package!"
    exit 1
fi
