# Production Deployment Guide

This guide will help you deploy the Social Media Content Hub with AI-powered Grok integration to production.

## Prerequisites

- Docker and Docker Compose installed (or Kubernetes cluster)
- xAI API key from https://x.ai
- Social media API credentials (Twitter, Telegram, etc.)

## Port Configuration

The application now runs on **port 8080** in production.

## Deployment Options

You can deploy using either:
1. **Docker Compose** (recommended for simple deployments)
2. **Kubernetes** (recommended for scalable, production deployments)

---

## Option 1: Docker Compose Deployment

### Step 1: Configure Environment Variables

1. Edit the `.env` file in the project root
2. Fill in all required API keys and secrets:

```bash
# CRITICAL: Set strong secrets (use: openssl rand -base64 32)
JWT_SECRET=<your-strong-jwt-secret-min-32-chars>
JWT_REFRESH_SECRET=<your-strong-refresh-secret-min-32-chars>
ENCRYPTION_KEY=<your-strong-encryption-key-min-32-chars>

# xAI Grok API (REQUIRED for AI features)
XAI_API_KEY=<your-xai-api-key-from-x.ai>

# Social Media APIs (as needed)
TWITTER_CONSUMER_KEY=<your-twitter-key>
TWITTER_CONSUMER_SECRET=<your-twitter-secret>
TWITTER_ACCESS_TOKEN=<your-twitter-token>
TWITTER_ACCESS_TOKEN_SECRET=<your-twitter-token-secret>

TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>

# Database (change password!)
DB_PASSWORD=<strong-database-password>
```

### Step 2: Build and Deploy

```bash
# Pull the latest code
git pull origin claude/add-ai-social-posts-016WCFQJti9NRStUZ2jhVC1c

# Build the Docker images
docker compose build

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f app
```

### Step 3: Verify Deployment

```bash
# Check health endpoint
curl http://localhost:8080/health

# Test AI endpoint (requires authentication)
curl -X POST http://localhost:8080/api/posts/ai/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"optionsCount": 1}'
```

### Step 4: Access Monitoring

- **Application**: http://localhost:8080
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

### Useful Commands

```bash
# Stop services
docker compose down

# View logs
docker compose logs -f app

# Restart a service
docker compose restart app

# Rebuild and restart
docker compose up -d --build app

# View database logs
docker compose logs -f postgres

# Access database
docker compose exec postgres psql -U admin -d content_hub

# Backup database
docker compose exec postgres pg_dump -U admin content_hub > backup.sql
```

---

## Option 2: Kubernetes Deployment

### Step 1: Create Kubernetes Secrets

Create secrets for sensitive data:

```bash
# Create namespace (if needed)
kubectl create namespace content-hub

# Create secrets
kubectl create secret generic app-secrets \
  --from-literal=db-user=admin \
  --from-literal=db-password='YOUR_SECURE_DB_PASSWORD' \
  --from-literal=jwt-secret='YOUR_STRONG_JWT_SECRET' \
  --from-literal=jwt-refresh-secret='YOUR_STRONG_REFRESH_SECRET' \
  --from-literal=encryption-key='YOUR_STRONG_ENCRYPTION_KEY' \
  --from-literal=xai-api-key='YOUR_XAI_API_KEY' \
  -n content-hub
```

### Step 2: Build and Push Docker Image

```bash
# Build image
docker build -t your-registry/content-hub:latest .

# Push to registry
docker push your-registry/content-hub:latest

# Update k8s/deployment.yaml with your image name
# Change line 20: image: your-registry/content-hub:latest
```

### Step 3: Deploy to Kubernetes

```bash
# Apply deployment
kubectl apply -f k8s/deployment.yaml -n content-hub

# Check deployment status
kubectl get pods -n content-hub
kubectl get services -n content-hub

# View logs
kubectl logs -f deployment/content-hub -n content-hub

# Check autoscaling
kubectl get hpa -n content-hub
```

### Step 4: Verify Deployment

```bash
# Get service URL
kubectl get service content-hub-service -n content-hub

# Test health endpoint
curl http://<EXTERNAL-IP>/health

# Port forward for local testing
kubectl port-forward service/content-hub-service 8080:80 -n content-hub
```

### Kubernetes Features

- **Auto-scaling**: 3-10 replicas based on CPU/Memory
- **Health checks**: Liveness and readiness probes
- **Load balancing**: Automatic load distribution
- **Rolling updates**: Zero-downtime deployments

---

## Security Checklist

Before deploying to production, ensure:

- [ ] All secrets in `.env` are changed from defaults
- [ ] JWT_SECRET is at least 32 characters and random
- [ ] ENCRYPTION_KEY is at least 32 characters and random
- [ ] Database password is strong and unique
- [ ] XAI_API_KEY is set with a valid key from x.ai
- [ ] Social media API credentials are production keys
- [ ] Grafana admin password is changed
- [ ] Database backups are configured
- [ ] SSL/TLS certificates are configured (if exposing publicly)

## Generate Secure Secrets

Use these commands to generate strong secrets:

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate encryption key
openssl rand -base64 32

# Generate database password
openssl rand -base64 24
```

---

## Post-Deployment Tasks

### 1. Database Migration

If this is the first deployment, initialize the database:

```bash
# Docker Compose
docker compose exec app npm run db:migrate

# Kubernetes
kubectl exec -it deployment/content-hub -n content-hub -- npm run db:migrate
```

### 2. Create Admin User

```bash
# Access the application API and create your first user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "YourSecurePassword123!",
    "name": "Admin User"
  }'
```

### 3. Test AI Content Generation

```bash
# Login to get JWT token
TOKEN=$(curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@yourdomain.com", "password": "YourSecurePassword123!"}' \
  | jq -r '.token')

# Generate AI content
curl -X POST http://localhost:8080/api/posts/ai/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"optionsCount": 2, "platform": "twitter"}'
```

---

## Monitoring & Maintenance

### View Application Logs

```bash
# Docker Compose
docker compose logs -f app

# Kubernetes
kubectl logs -f deployment/content-hub -n content-hub
```

### Database Backups

Automated daily backups are configured in docker-compose.yml. Backups are stored in `./backups/` directory.

Manual backup:
```bash
# Docker Compose
docker compose exec postgres pg_dump -U admin content_hub > backup-$(date +%Y%m%d).sql

# Kubernetes
kubectl exec -it deployment/postgres -n content-hub -- pg_dump -U admin content_hub > backup-$(date +%Y%m%d).sql
```

### Scaling

```bash
# Docker Compose (manual scaling)
docker compose up -d --scale app=3

# Kubernetes (automatic via HPA)
kubectl get hpa -n content-hub
kubectl describe hpa content-hub-hpa -n content-hub
```

### Update Deployment

```bash
# Pull latest changes
git pull origin claude/add-ai-social-posts-016WCFQJti9NRStUZ2jhVC1c

# Docker Compose
docker compose down
docker compose build
docker compose up -d

# Kubernetes
docker build -t your-registry/content-hub:latest .
docker push your-registry/content-hub:latest
kubectl rollout restart deployment/content-hub -n content-hub
kubectl rollout status deployment/content-hub -n content-hub
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs app

# Check environment variables
docker compose exec app env | grep -E "XAI|PORT|DB"

# Verify database connection
docker compose exec app nc -zv postgres 5432
```

### AI Generation Failing

1. Verify XAI_API_KEY is set correctly
2. Check if XAI_ENABLED=true
3. Test API key:
   ```bash
   curl https://api.x.ai/v1/models \
     -H "Authorization: Bearer YOUR_XAI_API_KEY"
   ```
4. Check application logs for errors

### Database Connection Issues

```bash
# Check if Postgres is running
docker compose ps postgres

# Check Postgres logs
docker compose logs postgres

# Connect to database manually
docker compose exec postgres psql -U admin -d content_hub
```

### Port Already in Use

If port 8080 is already in use, change it in `.env`:
```bash
PORT=9090
```

Then restart:
```bash
docker compose down
docker compose up -d
```

---

## Performance Optimization

### Production Recommendations

1. **Use a reverse proxy** (nginx/traefik) for SSL/TLS
2. **Configure CDN** for static assets
3. **Set up Redis persistence** for job queue reliability
4. **Enable database connection pooling**
5. **Configure log rotation** to prevent disk space issues
6. **Set resource limits** in docker-compose or k8s
7. **Monitor API rate limits** for Grok and social media APIs

### Resource Limits

Recommended for production:

```yaml
# Docker Compose
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

---

## Support & Documentation

- **AI Features**: See `docs/AI_CONTENT_GENERATION.md`
- **API Documentation**: Available at `/api/docs` when running
- **Health Check**: `http://localhost:8080/health`
- **Metrics**: `http://localhost:8080/metrics` (Prometheus format)

---

## Production Checklist

- [ ] Environment variables configured
- [ ] Secrets generated and set
- [ ] xAI API key obtained and configured
- [ ] Database deployed and initialized
- [ ] Redis deployed and running
- [ ] Application deployed and healthy
- [ ] Health checks passing
- [ ] Monitoring dashboards configured
- [ ] Backup system tested
- [ ] SSL/TLS certificates configured (if public)
- [ ] Domain/DNS configured (if public)
- [ ] Firewall rules configured
- [ ] Load balancer configured (if needed)
- [ ] Auto-scaling tested (if K8s)

---

## Summary of Changes for This Deployment

This deployment includes:

✅ **AI Content Generation** with xAI Grok API
✅ **Port 8080** as default
✅ **Production-ready Docker configuration**
✅ **Kubernetes deployment with auto-scaling**
✅ **Comprehensive monitoring stack**
✅ **Automated database backups**
✅ **Health checks and probes**
✅ **Security best practices**

All configuration files have been updated to support the new AI features while maintaining production-grade reliability and security.
