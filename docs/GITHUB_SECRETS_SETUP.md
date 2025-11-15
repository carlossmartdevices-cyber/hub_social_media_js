# GitHub Secrets Configuration Guide

This guide explains how to configure GitHub secrets required for CI/CD pipelines and automated deployments.

## Required GitHub Secrets

### 1. Security Scanning (Snyk)

**Secret Name**: `SNYK_TOKEN`

**How to get it**:
1. Go to https://app.snyk.io/
2. Sign up or log in (free tier available)
3. Navigate to Account Settings → General
4. Copy your Snyk API Token
5. Add it to GitHub repository secrets

**How to add to GitHub**:
```bash
# Via GitHub CLI (if available)
gh secret set SNYK_TOKEN

# Via GitHub Web UI
1. Go to your repository on GitHub
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: SNYK_TOKEN
5. Value: [paste your token]
6. Click "Add secret"
```

### 2. Docker Hub (Optional, for pushing images)

**Secret Names**:
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

**How to get it**:
1. Go to https://hub.docker.com/
2. Sign up or log in
3. Navigate to Account Settings → Security
4. Click "New Access Token"
5. Give it a name and create
6. Copy the token immediately (shown only once)

**Add to GitHub**:
```bash
gh secret set DOCKERHUB_USERNAME
gh secret set DOCKERHUB_TOKEN
```

### 3. Production Environment Variables (Optional)

For automated deployments to production, you may want to add:

**Secret Names**:
- `PROD_JWT_SECRET`
- `PROD_JWT_REFRESH_SECRET`
- `PROD_ENCRYPTION_KEY`
- `PROD_DATABASE_URL`
- `PROD_REDIS_URL`

**How to add**:
```bash
# Generate strong secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
openssl rand -base64 32  # For ENCRYPTION_KEY

# Add to GitHub
gh secret set PROD_JWT_SECRET
gh secret set PROD_JWT_REFRESH_SECRET
gh secret set PROD_ENCRYPTION_KEY
```

## Verification

After adding secrets, verify they're configured:

```bash
# List all secrets (names only, values are hidden)
gh secret list
```

Expected output:
```
SNYK_TOKEN              Updated 2025-11-15
DOCKERHUB_USERNAME      Updated 2025-11-15
DOCKERHUB_TOKEN         Updated 2025-11-15
```

## Using Secrets in GitHub Actions

Secrets are automatically available in your workflows defined in `.github/workflows/`:

```yaml
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

## Security Best Practices

1. **Never commit secrets to the repository**
   - Always use `.env` files locally (in `.gitignore`)
   - Use GitHub Secrets for CI/CD

2. **Rotate secrets regularly**
   - Change production secrets every 90 days
   - Update GitHub secrets after rotation

3. **Use different secrets for different environments**
   - Development: Local `.env` file
   - Staging: GitHub Secrets with `STAGING_` prefix
   - Production: GitHub Secrets with `PROD_` prefix

4. **Limit secret access**
   - Only give repository access to necessary team members
   - Use environment-specific secrets with branch protection

## Troubleshooting

### Error: "SNYK_TOKEN not found"

1. Verify the secret is added:
   ```bash
   gh secret list | grep SNYK
   ```

2. Check the workflow file references it correctly:
   ```yaml
   env:
     SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
   ```

3. Ensure the secret name matches exactly (case-sensitive)

### Error: "npm audit failed"

This is expected if vulnerabilities are found. The CI will:
1. Report vulnerabilities as warnings (moderate)
2. Fail the build for high/critical vulnerabilities

To fix:
```bash
# Locally
npm audit fix

# For breaking changes (review carefully)
npm audit fix --force

# Check the audit report
npm run security:audit
```

## Manual Secret Configuration Script

If you prefer a script to set all secrets at once:

```bash
#!/bin/bash
# scripts/setup-github-secrets.sh

echo "Setting up GitHub secrets..."

# Prompt for Snyk token
read -p "Enter your Snyk API token: " SNYK_TOKEN
gh secret set SNYK_TOKEN -b"$SNYK_TOKEN"

# Prompt for Docker Hub (optional)
read -p "Enter Docker Hub username (or press Enter to skip): " DOCKERHUB_USERNAME
if [ ! -z "$DOCKERHUB_USERNAME" ]; then
  gh secret set DOCKERHUB_USERNAME -b"$DOCKERHUB_USERNAME"
  read -sp "Enter Docker Hub token: " DOCKERHUB_TOKEN
  echo
  gh secret set DOCKERHUB_TOKEN -b"$DOCKERHUB_TOKEN"
fi

# Generate and set production secrets
echo "Generating production secrets..."
PROD_JWT_SECRET=$(openssl rand -base64 32)
PROD_JWT_REFRESH_SECRET=$(openssl rand -base64 32)
PROD_ENCRYPTION_KEY=$(openssl rand -base64 32)

gh secret set PROD_JWT_SECRET -b"$PROD_JWT_SECRET"
gh secret set PROD_JWT_REFRESH_SECRET -b"$PROD_JWT_REFRESH_SECRET"
gh secret set PROD_ENCRYPTION_KEY -b"$PROD_ENCRYPTION_KEY"

echo "✓ All secrets configured successfully!"
gh secret list
```

Make it executable:
```bash
chmod +x scripts/setup-github-secrets.sh
./scripts/setup-github-secrets.sh
```

## Alternative: Using GitHub Web UI

If you don't have GitHub CLI (`gh`):

1. Go to https://github.com/[YOUR_USERNAME]/[YOUR_REPO]
2. Click **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Enter **Name** and **Value**
6. Click **Add secret**
7. Repeat for each secret

## Next Steps

After configuring secrets:

1. ✅ Push code to trigger CI/CD pipeline
2. ✅ Verify security scanning passes
3. ✅ Review Snyk dashboard for vulnerability reports
4. ✅ Set up notifications for security alerts
5. ✅ Configure branch protection rules

## Support

- GitHub Secrets Docs: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- Snyk Documentation: https://docs.snyk.io/
- Docker Hub Tokens: https://docs.docker.com/docker-hub/access-tokens/
