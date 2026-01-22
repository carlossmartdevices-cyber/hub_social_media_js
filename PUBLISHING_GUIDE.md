# Publishing Guide - Social Media Content Hub v2.0.0

Complete guide for building, packaging, and deploying the Social Media Content Hub application.

## Table of Contents

1. [Build Process](#build-process)
2. [Docker Publishing](#docker-publishing)
3. [NPM Publishing (Optional)](#npm-publishing-optional)
4. [Deployment Options](#deployment-options)
5. [Version Management](#version-management)
6. [CI/CD Integration](#cicd-integration)

## Build Process

### Prerequisites

- Node.js v18.0.0+
- npm v9.0.0+
- TypeScript v5.9.3+
- Docker (for container publishing)

### Build Steps

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Build TypeScript Application

```bash
npm run build
```

This compiles the TypeScript source code in `src/` to JavaScript in `dist/`.

**Build Output:**
- `dist/` - Compiled JavaScript files
- `dist/index.js` - Main entry point
- Source maps for debugging

#### 3. Verify Build

```bash
# Check that dist/ directory exists
ls -la dist/

# Verify main entry point
node -e "console.log(require('./dist/package.json').main)"
```

## Docker Publishing

### Build Docker Image

```bash
docker build -t social-media-content-hub:2.0.0 .
```

**Docker Build Process:**
1. Uses Node.js 18 Alpine base image
2. Installs all dependencies (including dev for build)
3. Compiles TypeScript
4. Removes dev dependencies for production
5. Creates necessary directories (logs, uploads)
6. Sets environment variables
7. Exposes port 8080
8. Configures health checks

### Tag and Push to Registry

```bash
# Tag the image
docker tag social-media-content-hub:2.0.0 your-registry/social-media-content-hub:2.0.0
docker tag social-media-content-hub:2.0.0 your-registry/social-media-content-hub:latest

# Login to Docker registry
docker login your-registry.com

# Push the images
docker push your-registry/social-media-content-hub:2.0.0
docker push your-registry/social-media-content-hub:latest
```

### Docker Image Optimization

The Dockerfile includes optimizations:
- Multi-stage build (build dependencies removed from final image)
- Alpine base for smaller image size
- Health checks for production monitoring
- Proper layer caching for faster rebuilds

## NPM Publishing (Optional)

If you want to publish this as an npm package:

### 1. Update package.json

```json
{
  "name": "social-media-content-hub",
  "version": "2.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist/", "README.md", "LICENSE"]
}
```

### 2. Login to npm

```bash
npm login
```

### 3. Publish Package

```bash
npm publish
```

### 4. Publish with Tag (for pre-releases)

```bash
npm publish --tag beta
```

## Deployment Options

### Option 1: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# Or with specific environment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Option 2: Kubernetes

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/deployment.yaml

# Or use the npm script
npm run k8s:apply
```

### Option 3: Manual Deployment

```bash
# Start the application
NODE_ENV=production node dist/index.js

# Or use PM2 for process management
pm install -g pm2
pm2 start dist/index.js --name "content-hub"
```

## Version Management

### Versioning Strategy

This project follows **Semantic Versioning** (SemVer):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Update Version

```bash
# Update version in package.json
npm version patch   # 2.0.0 → 2.0.1
npm version minor   # 2.0.0 → 2.1.0
npm version major   # 2.0.0 → 3.0.0

# Or manually edit package.json
```

### Version Tags

- **latest**: Stable releases
- **beta**: Beta releases
- **alpha**: Alpha releases
- **dev**: Development builds

## CI/CD Integration

### GitHub Actions Workflow

The project includes a CI/CD workflow in `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ master ]
  pull_request:
    branches: [ master ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - run: npm test

  docker:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: docker build -t social-media-content-hub:latest .
      - run: docker tag social-media-content-hub:latest your-registry/social-media-content-hub:latest
      - run: echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
      - run: docker push your-registry/social-media-content-hub:latest
```

### Required GitHub Secrets

```bash
DOCKER_USERNAME: Your Docker registry username
DOCKER_PASSWORD: Your Docker registry password
NPM_TOKEN: Your npm token (if publishing to npm)
```

## Publishing Checklist

### Pre-Publish Checklist

- [ ] Run all tests: `npm test`
- [ ] Build successfully: `npm run build`
- [ ] Update CHANGELOG.md
- [ ] Update version in package.json
- [ ] Commit all changes
- [ ] Create Git tag
- [ ] Push to GitHub

### Docker Publish Checklist

- [ ] Build Docker image
- [ ] Test Docker image locally
- [ ] Tag image with version
- [ ] Tag image with "latest"
- [ ] Push to Docker registry
- [ ] Update deployment manifests

### Production Deployment Checklist

- [ ] Backup database
- [ ] Test in staging environment
- [ ] Monitor health checks
- [ ] Verify metrics in Grafana
- [ ] Check error rates
- [ ] Test critical user flows

## Environment Configuration

### Production Environment Variables

```env
NODE_ENV=production
PORT=8080

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=content_hub
DB_USER=postgres
DB_PASSWORD=your-strong-password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Security
JWT_SECRET=your-generated-secret
JWT_REFRESH_SECRET=your-generated-secret
ENCRYPTION_KEY=your-generated-secret

# Platform APIs
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

## Monitoring and Health Checks

### Health Check Endpoint

```bash
curl http://localhost:8080/health
```

### Metrics Endpoint

```bash
curl http://localhost:8080/metrics
```

### Docker Health Check

```bash
docker ps --filter "health=healthy"
```

## Rollback Procedure

### Docker Rollback

```bash
# Stop current containers
docker-compose down

# Start previous version
docker-compose up -d --build

# Or use specific version
docker run -d -p 8080:8080 social-media-content-hub:1.0.0
```

### Kubernetes Rollback

```bash
# Rollback to previous deployment
kubectl rollout undo deployment/content-hub

# Check rollout status
kubectl rollout status deployment/content-hub
```

## Troubleshooting

### Build Issues

**Error: TypeScript compilation failed**
```bash
npm run build -- --diagnostics
npm run lint:fix
```

**Error: Missing dependencies**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Docker Issues

**Error: Docker build failed**
```bash
docker build --no-cache -t social-media-content-hub:2.0.0 .
```

**Error: Port already in use**
```bash
# Find and kill process
lsof -i :8080
kill -9 <PID>
```

### Deployment Issues

**Error: Database connection failed**
```bash
# Check database health
docker-compose ps postgres

# Test connection
nc -zv postgres 5432
```

**Error: Application crashes on startup**
```bash
# View logs
docker-compose logs app

# Check environment variables
docker-compose exec app env
```

## Best Practices

### Build Optimization

- Use `--no-cache` for clean builds
- Cache node_modules for faster builds
- Use specific Node.js version in Docker

### Security

- Scan Docker images for vulnerabilities
- Use minimal base images
- Remove unnecessary files from final image
- Set proper file permissions

### Versioning

- Follow Semantic Versioning
- Tag all releases
- Document breaking changes
- Maintain CHANGELOG

## Quick Reference

### Build Commands

```bash
npm install              # Install dependencies
npm run build            # Build TypeScript
npm run lint             # Lint code
npm test                 # Run tests
```

### Docker Commands

```bash
docker build -t app:tag .           # Build image
docker tag app:tag registry/app:tag # Tag image
docker push registry/app:tag        # Push image
docker run -d -p 8080:8080 app:tag  # Run container
```

### Deployment Commands

```bash
docker-compose up -d              # Start services
kubectl apply -f k8s/deployment.yaml # Deploy to Kubernetes
npm run k8s:apply                 # Deploy using npm script
```

## Support

For issues with publishing or deployment:
- Check `docs/DEPLOYMENT_GUIDE.md`
- Review `docs/KNOWN_ISSUES.md`
- Consult `docs/GITHUB_SECRETS_SETUP.md`
- Examine `.github/workflows/ci.yml`

## Conclusion

The Social Media Content Hub v2.0.0 has been successfully built and is ready for publishing. Choose the appropriate deployment method based on your infrastructure:

- **Docker Compose**: Simple local or production deployment
- **Kubernetes**: Scalable cloud deployment
- **Manual**: Custom deployment scenarios

The application includes comprehensive monitoring, health checks, and rollback capabilities for production environments.