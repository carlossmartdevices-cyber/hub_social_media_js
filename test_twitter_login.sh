#!/bin/bash

# Twitter/X Login Test Script
# This script tests the Twitter/X OAuth 2.0 login functionality

echo "🔍 Testing Twitter/X Login Functionality"
echo "========================================"

# Load environment variables
if [ -f .env ]; then
    echo "✅ Loading environment variables from .env"
    export $(grep -v '^#' .env | xargs)
else
    echo "❌ .env file not found!"
    exit 1
fi

# Test 1: Check Twitter OAuth 2.0 Configuration
echo -e "\n📋 Test 1: Checking Twitter OAuth 2.0 Configuration"
echo "------------------------------------------------"

if [ -z "$TWITTER_CLIENT_ID" ]; then
    echo "❌ TWITTER_CLIENT_ID is not set"
    exit 1
else
    echo "✅ TWITTER_CLIENT_ID: $TWITTER_CLIENT_ID"
fi

if [ -z "$TWITTER_CLIENT_SECRET" ]; then
    echo "❌ TWITTER_CLIENT_SECRET is not set"
    exit 1
else
    echo "✅ TWITTER_CLIENT_SECRET: [REDACTED]"
fi

if [ -z "$TWITTER_REDIRECT_URI" ]; then
    echo "❌ TWITTER_REDIRECT_URI is not set"
    exit 1
else
    echo "✅ TWITTER_REDIRECT_URI: $TWITTER_REDIRECT_URI"
fi

# Test 2: Check API Server Status
echo -e "\n🌐 Test 2: Checking API Server Status"
echo "--------------------------------------"

API_URL="${API_URL:-http://localhost:8080}"
echo "Testing API at: $API_URL"

# Test basic connectivity
if curl -s --head --request GET "$API_URL/health" | grep "200 OK"; then
    echo "✅ API server is running and healthy"
else
    echo "❌ API server is not responding"
    echo "Please start the server with: npm run dev"
    exit 1
fi

# Test 3: Test OAuth Configuration Endpoint
echo -e "\n🔑 Test 3: Testing OAuth Configuration Endpoint"
echo "----------------------------------------------"

CONFIG_RESPONSE=$(curl -s "$API_URL/api/oauth/config")
if echo "$CONFIG_RESPONSE" | grep -q '"success":true'; then
    echo "✅ OAuth configuration endpoint working"
    
    # Check if Twitter is in the configured platforms
    if echo "$CONFIG_RESPONSE" | grep -q '"id":"twitter"'; then
        echo "✅ Twitter OAuth 2.0 is configured and available"
    else
        echo "❌ Twitter OAuth 2.0 is not configured"
        echo "Platforms available: $(echo "$CONFIG_RESPONSE" | grep -o '"id":"[^"]*"' | sed 's/"id":"\([^"]*\)"/\1/')"
    fi
else
    echo "❌ OAuth configuration endpoint failed"
    echo "Response: $CONFIG_RESPONSE"
fi

# Test 4: Test Twitter Auth URL Generation
echo -e "\n🔗 Test 4: Testing Twitter Auth URL Generation"
echo "----------------------------------------------"

# Use the correct API endpoint (with /api prefix)
AUTH_RESPONSE=$(curl -s "$API_URL/api/auth/x/login")
if echo "$AUTH_RESPONSE" | grep -q '"authUrl"'; then
    AUTH_URL=$(echo "$AUTH_RESPONSE" | grep -o '"authUrl":"[^"]*"' | sed 's/"authUrl":"\([^"]*\)"/\1/')
    echo "✅ Twitter auth URL generated successfully"
    echo "🔗 Auth URL: $AUTH_URL"
    echo "📝 You can visit this URL in your browser to test the OAuth flow"
else
    echo "❌ Failed to generate Twitter auth URL"
    echo "Response: $AUTH_RESPONSE"
fi

# Test 5: Check Database Connectivity
echo -e "\n🗃️ Test 5: Checking Database Connectivity"
echo "------------------------------------------"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-55433}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-content_hub}"

if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    echo "✅ Database is accessible"
else
    echo "❌ Database is not accessible"
    echo "Please check PostgreSQL status and configuration"
fi

# Test 6: Check JWT Configuration
echo -e "\n🔐 Test 6: Checking JWT Configuration"
echo "--------------------------------------"

if [ ${#JWT_SECRET} -ge 32 ]; then
    echo "✅ JWT_SECRET is properly configured (${#JWT_SECRET} characters)"
else
    echo "❌ JWT_SECRET is too short (${#JWT_SECRET} characters, minimum 32 required)"
fi

if [ ${#JWT_REFRESH_SECRET} -ge 32 ]; then
    echo "✅ JWT_REFRESH_SECRET is properly configured (${#JWT_REFRESH_SECRET} characters)"
else
    echo "❌ JWT_REFRESH_SECRET is too short (${#JWT_REFRESH_SECRET} characters, minimum 32 required)"
fi

# Summary
echo -e "\n📊 Test Summary"
echo "================"
echo "All basic tests completed. If any tests failed, please address those issues."
echo ""
echo "Next steps:"
echo "1. If all tests passed, try the Twitter login in your browser"
echo "2. Visit the auth URL: $AUTH_URL"
echo "3. Complete the Twitter authentication"
echo "4. You should be redirected back to the application"
echo ""
echo "If you still experience issues, check:"
echo "- Browser console logs"
echo "- Server logs: tail -f ./logs/error.log"
echo "- Network tab in browser developer tools"
