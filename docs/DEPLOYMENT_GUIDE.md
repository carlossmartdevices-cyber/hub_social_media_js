# Deployment Guide - Social Media Content Hub

Complete guide for deploying the Content Hub to production with monitoring, security, and best practices.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Monitoring Setup](#monitoring-setup)
7. [Security Checklist](#security-checklist)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Docker**: v20.10.0 or higher
- **Docker Compose**: v2.0.0 or higher
- **PostgreSQL**: v15+ (if not using Docker)
- **Redis**: v7+ (if not using Docker)

### Optional Tools

- **kubectl**: For Kubernetes deployment
- **GitHub CLI** (`gh`): For automated secret setup
- **Snyk**: For security scanning

---

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hub_social_media_js
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

**Critical: Update Production Secrets**

```bash
# Generate strong secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
openssl rand -base64 32  # For ENCRYPTION_KEY
```

Update `.env` with generated secrets:

```env
# CRITICAL: Change these in production!
JWT_SECRET=<generated-secret-1>
JWT_REFRESH_SECRET=<generated-secret-2>
ENCRYPTION_KEY=<generated-secret-3>

# JWT Configuration
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=content_hub
DB_USER=postgres
DB_PASSWORD=<strong-password>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<strong-password>

# Platform APIs (configure as needed)
TELEGRAM_BOT_TOKEN=<your-bot-token>
TELEGRAM_CHAT_ID=<your-chat-id>
# ... other platform credentials
```

### 4. Database Setup

```bash
# Option 1: Using Docker
docker-compose up -d postgres

# Option 2: Local PostgreSQL
createdb content_hub
psql content_hub < src/database/migrations/001_initial_schema.sql

# Run migrations
npm run db:migrate
```

---

## Local Development

### Start Development Server

```bash
# Start all services with Docker
docker-compose up -d

# Or start only the app (requires local Postgres & Redis)
npm run dev
```

### Development URLs

- **API**: http://localhost:3000
- **Frontend**: http://localhost:3001
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

### Run Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Load tests
npm run test:load

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

---

## Docker Deployment

### Production Build

```bash
# Build the application
npm run build

# Build Docker image
docker build -t content-hub:latest .

# Or use docker-compose
docker-compose build
```

### Start All Services

```bash
# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### Services Included

| Service | Port | Description |
|---------|------|-------------|
| app | 3000 | Main application |
| postgres | 5432 | Database |
| redis | 6379 | Cache & queues |
| prometheus | 9090 | Metrics collection |
| grafana | 3001 | Metrics visualization |
| node-exporter | 9100 | System metrics |
| redis-exporter | 9121 | Redis metrics |
| postgres-exporter | 9187 | Database metrics |
| cadvisor | 8080 | Container metrics |

### Health Checks

```bash
# Check application health
curl http://localhost:3000/health

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# View metrics endpoint
curl http://localhost:3000/metrics
```

### Backup and Restore

**Automated Backups** (already configured):
- Daily backups at midnight
- Retention: 7 days, 4 weeks, 6 months
- Location: `./backups/`

**Manual Backup**:

```bash
# Backup database
docker exec content-hub-postgres pg_dump -U postgres content_hub > backup.sql

# Restore database
docker exec -i content-hub-postgres psql -U postgres content_hub < backup.sql

# Backup Redis
docker exec content-hub-redis redis-cli SAVE
docker cp content-hub-redis:/data/dump.rdb ./redis-backup.rdb
```

---

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (v1.20+)
- kubectl configured
- Secrets configured

### 1. Create Namespace

```bash
kubectl create namespace content-hub
```

### 2. Create Secrets

```bash
# Create database secret
kubectl create secret generic postgres-secret \
  --from-literal=username=postgres \
  --from-literal=password=<strong-password> \
  --from-literal=database=content_hub \
  -n content-hub

# Create application secret
kubectl create secret generic app-secret \
  --from-literal=jwt-secret=<generated-secret> \
  --from-literal=jwt-refresh-secret=<generated-secret> \
  --from-literal=encryption-key=<generated-secret> \
  -n content-hub
```

### 3. Apply Kubernetes Manifests

```bash
# Apply all manifests
npm run k8s:apply

# Or manually
kubectl apply -f k8s/deployment.yaml -n content-hub
```

### 4. Verify Deployment

```bash
# Check pods
kubectl get pods -n content-hub

# Check services
kubectl get svc -n content-hub

# Check HPA
kubectl get hpa -n content-hub

# View logs
kubectl logs -f deployment/content-hub -n content-hub
```

### 5. Access the Application

```bash
# Port forward for local access
kubectl port-forward svc/content-hub 3000:3000 -n content-hub

# Or get the LoadBalancer IP
kubectl get svc content-hub -n content-hub
```

### Scaling

**Horizontal Pod Autoscaler** (already configured):
- Min replicas: 3
- Max replicas: 10
- Target CPU: 70%
- Target Memory: 80%

**Manual Scaling**:

```bash
kubectl scale deployment content-hub --replicas=5 -n content-hub
```

---

## Monitoring Setup

### Access Grafana

1. Navigate to http://localhost:3001
2. Login with credentials:
   - Username: `admin`
   - Password: `admin` (change on first login)

### Import Dashboards

Pre-configured dashboard: **Content Hub - Overview**

Includes:
- API request rate & response time
- Error rates
- Database connection pool
- Cache hit rate
- Job queue size
- CPU & memory usage
- Platform publish success rate

### Configure Alerts

Prometheus alerts are pre-configured in `monitoring/alerts/application.yml`:

- High error rate (>5% for 5 minutes)
- Slow response time (>1s p95 for 5 minutes)
- High memory usage (>80% for 10 minutes)
- Application down
- Database issues
- Redis issues

### Metrics Endpoints

- **Application**: http://localhost:3000/metrics
- **Prometheus**: http://localhost:9090/metrics
- **Node Exporter**: http://localhost:9100/metrics
- **Redis Exporter**: http://localhost:9121/metrics
- **Postgres Exporter**: http://localhost:9187/metrics

---

## Security Checklist

### Before Production Deployment

- [ ] **Change all default secrets** in `.env`
- [ ] **Enable HTTPS** with valid SSL certificate
- [ ] **Configure firewall** to restrict access
- [ ] **Set up rate limiting** (already configured)
- [ ] **Enable CORS** for specific origins only (already configured)
- [ ] **Review and rotate** API keys for platforms
- [ ] **Set strong database password**
- [ ] **Set strong Redis password** (optional but recommended)
- [ ] **Configure Grafana password** (change from default)
- [ ] **Enable GitHub secret scanning**
- [ ] **Run security audit**: `npm run security:audit`
- [ ] **Review Docker image** for vulnerabilities
- [ ] **Set up automated backups** (already configured)
- [ ] **Configure monitoring alerts**
- [ ] **Test disaster recovery** procedures

### Security Scanning

```bash
# Run npm audit
npm audit

# Run enhanced audit with better-npm-audit
npm run security:audit

# Scan Docker image (requires Trivy)
trivy image content-hub:latest
```

### GitHub Actions Security

CI/CD pipeline includes:
- npm audit
- Snyk vulnerability scanning
- Docker image scanning with Trivy

Configure secrets:
```bash
# See docs/GITHUB_SECRETS_SETUP.md
./scripts/setup-github-secrets.sh
```

---

## Troubleshooting

### Application Won't Start

**Check logs**:
```bash
docker-compose logs app
```

**Common issues**:
1. Database not ready → Wait for health check
2. Missing environment variables → Check `.env`
3. Port already in use → Change port in `.env`

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check connection from app container
docker exec content-hub-app nc -zv postgres 5432

# View database logs
docker-compose logs postgres
```

### Redis Connection Failed

```bash
# Check if Redis is running
docker-compose ps redis

# Test Redis connection
docker exec content-hub-redis redis-cli ping

# View Redis logs
docker-compose logs redis
```

### High Memory Usage

```bash
# Check container stats
docker stats

# View memory metrics in Grafana
# Navigate to Grafana > Content Hub > Memory Usage panel

# Increase container memory limit in docker-compose.yml:
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

### Prometheus Not Scraping Metrics

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq

# Verify app metrics endpoint
curl http://localhost:3000/metrics

# Check prometheus logs
docker-compose logs prometheus
```

### Frontend Not Connecting to API

**Check CORS configuration** in `src/api/app.ts`:
```typescript
const allowedOrigins = [
  'http://localhost:3001',
  'https://your-production-domain.com'
];
```

**Verify API URL** in frontend:
```bash
# Check client/.env or client/src/lib/api.ts
```

### Performance Issues

1. **Enable caching**: Verify Redis is working
2. **Check slow queries**: Review Grafana database metrics
3. **Optimize images**: Ensure Sharp is processing images
4. **Review logs**: Check for errors in `./logs/`
5. **Scale horizontally**: Add more replicas in Kubernetes

---

## Production Deployment Workflow

### 1. Pre-Deployment

```bash
# Run all tests
npm test
npm run test:integration
npm run test:load

# Security audit
npm run security:audit

# Build and test locally
docker-compose build
docker-compose up -d
# Test thoroughly
docker-compose down
```

### 2. Deploy to Staging

```bash
# Tag image
docker tag content-hub:latest content-hub:staging

# Push to registry
docker push your-registry/content-hub:staging

# Deploy to staging environment
kubectl apply -f k8s/ -n staging

# Run smoke tests
npm run test:e2e
```

### 3. Deploy to Production

```bash
# Tag production image
docker tag content-hub:latest content-hub:v1.0.0

# Push to registry
docker push your-registry/content-hub:v1.0.0

# Deploy with zero downtime
kubectl apply -f k8s/ -n production

# Monitor rollout
kubectl rollout status deployment/content-hub -n production

# Verify health
kubectl get pods -n production
curl https://your-domain.com/health
```

### 4. Post-Deployment

```bash
# Monitor metrics in Grafana
# Check error rates
# Review logs for issues
# Test critical user flows
# Verify backups are running
```

---

## Rollback Procedure

```bash
# Kubernetes rollback
kubectl rollout undo deployment/content-hub -n production

# Docker Compose rollback
docker-compose down
docker-compose up -d --build

# Restore database from backup (if needed)
docker exec -i content-hub-postgres psql -U postgres content_hub < backups/latest.sql
```

---

## Support and Resources

- **Documentation**: `docs/`
- **GitHub Issues**: Report bugs and request features
- **Security**: See `docs/SECURITY_IMPROVEMENTS.md`
- **Implementation**: See `IMPLEMENTATION_COMPLETE.md`
- **GitHub Secrets**: See `docs/GITHUB_SECRETS_SETUP.md`

---

## Quick Reference

### Common Commands

```bash
# Development
npm run dev                 # Start dev server
npm test                    # Run tests
npm run lint                # Lint code

# Docker
docker-compose up -d        # Start all services
docker-compose down         # Stop all services
docker-compose logs -f      # View logs
docker-compose ps           # Service status

# Kubernetes
npm run k8s:apply          # Deploy to K8s
npm run k8s:delete         # Remove from K8s
kubectl get all -n content-hub  # View resources

# Security
npm run security:audit     # Security check
npm audit fix              # Fix vulnerabilities

# Database
npm run db:migrate         # Run migrations
```

### Port Reference

| Service | Port | URL |
|---------|------|-----|
| Application | 3000 | http://localhost:3000 |
| Frontend | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| Prometheus | 9090 | http://localhost:9090 |
| Grafana | 3001 | http://localhost:3001 |
| cAdvisor | 8080 | http://localhost:8080 |

---

**Remember**: Always test in staging before deploying to production!
