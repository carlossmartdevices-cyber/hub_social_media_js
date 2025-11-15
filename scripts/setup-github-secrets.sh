#!/bin/bash
# Setup GitHub Secrets for CI/CD
# Requires GitHub CLI (gh) to be installed and authenticated

set -e

echo "🔐 GitHub Secrets Setup for Social Media Content Hub"
echo "======================================================"
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ Error: GitHub CLI (gh) is not installed."
    echo "Please install it from: https://cli.github.com/"
    echo ""
    echo "Alternative: Configure secrets manually via GitHub Web UI"
    echo "See docs/GITHUB_SECRETS_SETUP.md for instructions"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Error: Not authenticated with GitHub CLI"
    echo "Please run: gh auth login"
    exit 1
fi

echo "✓ GitHub CLI is installed and authenticated"
echo ""

# Function to set secret
set_secret() {
    local name=$1
    local value=$2
    echo -n "Setting $name... "
    echo -n "$value" | gh secret set "$name"
    echo "✓"
}

# Snyk Token
echo "1. Snyk Security Token"
echo "   Get your token from: https://app.snyk.io/account"
read -p "   Enter your Snyk API token (or press Enter to skip): " SNYK_TOKEN
if [ ! -z "$SNYK_TOKEN" ]; then
    set_secret "SNYK_TOKEN" "$SNYK_TOKEN"
else
    echo "   ⚠ Skipped - Security scanning will be disabled in CI"
fi
echo ""

# Docker Hub (optional)
echo "2. Docker Hub Credentials (Optional)"
read -p "   Enter Docker Hub username (or press Enter to skip): " DOCKERHUB_USERNAME
if [ ! -z "$DOCKERHUB_USERNAME" ]; then
    set_secret "DOCKERHUB_USERNAME" "$DOCKERHUB_USERNAME"
    read -sp "   Enter Docker Hub token: " DOCKERHUB_TOKEN
    echo ""
    set_secret "DOCKERHUB_TOKEN" "$DOCKERHUB_TOKEN"
else
    echo "   ⚠ Skipped - Docker image publishing will be disabled"
fi
echo ""

# Generate production secrets
echo "3. Production Environment Secrets"
read -p "   Generate strong secrets for production? (y/n): " GEN_PROD
if [ "$GEN_PROD" = "y" ]; then
    echo "   Generating secure random secrets..."

    PROD_JWT_SECRET=$(openssl rand -base64 32)
    PROD_JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    PROD_ENCRYPTION_KEY=$(openssl rand -base64 32)

    set_secret "PROD_JWT_SECRET" "$PROD_JWT_SECRET"
    set_secret "PROD_JWT_REFRESH_SECRET" "$PROD_JWT_REFRESH_SECRET"
    set_secret "PROD_ENCRYPTION_KEY" "$PROD_ENCRYPTION_KEY"

    echo ""
    echo "   📝 IMPORTANT: Save these secrets securely!"
    echo "   ============================================"
    echo "   PROD_JWT_SECRET: $PROD_JWT_SECRET"
    echo "   PROD_JWT_REFRESH_SECRET: $PROD_JWT_REFRESH_SECRET"
    echo "   PROD_ENCRYPTION_KEY: $PROD_ENCRYPTION_KEY"
    echo ""
    echo "   These will be used for production deployment."
    echo "   Store them in your password manager NOW!"
    echo ""
    read -p "   Press Enter to continue after saving..."
else
    echo "   ⚠ Skipped - You'll need to set these manually later"
fi
echo ""

# Database URL (optional)
echo "4. Production Database URL (Optional)"
read -p "   Enter production database URL (or press Enter to skip): " PROD_DATABASE_URL
if [ ! -z "$PROD_DATABASE_URL" ]; then
    set_secret "PROD_DATABASE_URL" "$PROD_DATABASE_URL"
else
    echo "   ⚠ Skipped"
fi
echo ""

# Redis URL (optional)
echo "5. Production Redis URL (Optional)"
read -p "   Enter production Redis URL (or press Enter to skip): " PROD_REDIS_URL
if [ ! -z "$PROD_REDIS_URL" ]; then
    set_secret "PROD_REDIS_URL" "$PROD_REDIS_URL"
else
    echo "   ⚠ Skipped"
fi
echo ""

# Summary
echo "======================================================"
echo "✅ GitHub Secrets Setup Complete!"
echo "======================================================"
echo ""
echo "Configured secrets:"
gh secret list
echo ""
echo "Next steps:"
echo "1. Review .github/workflows/ci.yml for CI/CD configuration"
echo "2. Push code to trigger the CI pipeline"
echo "3. Check Actions tab on GitHub for pipeline status"
echo "4. Review Snyk dashboard for security reports"
echo ""
echo "Documentation: docs/GITHUB_SECRETS_SETUP.md"
