# Deployment Guide

## Quick Start

This project includes a simple deployment script (`deploy.sh`) that makes it easy to manage the application.

### Prerequisites

- Docker installed
- Docker Compose installed
- `.env` file configured (see `.env` for configuration)

### Basic Commands

```bash
# Start all services
./deploy.sh start

# Stop all services
./deploy.sh stop

# Restart all services
./deploy.sh restart

# Check service status
./deploy.sh status

# View logs
./deploy.sh logs              # All services
./deploy.sh logs app          # Specific service (app, redis, postgres, etc.)

# Check health of all services
./deploy.sh health

# Build Docker images
./deploy.sh build

# Rebuild and restart everything
./deploy.sh rebuild

# Create database backup
./deploy.sh backup

# Clean up everything (containers, volumes, images)
./deploy.sh clean
```

## First Time Setup

1. Make sure your `.env` file is configured:
   ```bash
   cat .env
   ```

2. Start the services:
   ```bash
   ./deploy.sh start
   ```

3. Check that everything is running:
   ```bash
   ./deploy.sh status
   ./deploy.sh health
   ```

4. View logs to verify startup:
   ```bash
   ./deploy.sh logs
   ```

## Service Ports

The following ports are exposed:

- **Application**: `3010` (or `PORT` from `.env`)
- **PostgreSQL**: `5432` (or `DB_PORT` from `.env`)
- **Redis**: `6380` (or `REDIS_PORT` from `.env`)
- **Prometheus**: `9090`
- **Grafana**: `3001`
- **cAdvisor**: `8080`
- **Node Exporter**: `9100`
- **Redis Exporter**: `9121`
- **PostgreSQL Exporter**: `9187`

## Monitoring

Access the monitoring dashboards:

- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **cAdvisor**: http://localhost:8080

## Troubleshooting

### Port Conflicts

If you encounter port conflicts:

1. Check what's using the port:
   ```bash
   sudo lsof -i :PORT_NUMBER
   # or
   sudo netstat -tulpn | grep :PORT_NUMBER
   ```

2. Either stop the conflicting service or change the port in `.env`

### Container Issues

View logs for a specific service:
```bash
./deploy.sh logs <service-name>
```

Available services: `app`, `postgres`, `redis`, `prometheus`, `grafana`, `cadvisor`, `node-exporter`, `redis-exporter`, `postgres-exporter`

### Database Issues

Create a backup before troubleshooting:
```bash
./deploy.sh backup
```

Check PostgreSQL health:
```bash
docker-compose exec postgres pg_isready -U postgres
```

### Redis Issues

Check Redis health:
```bash
docker-compose exec redis redis-cli ping
```

Should respond with `PONG`

## Updating the Application

1. Pull latest changes:
   ```bash
   git pull
   ```

2. Rebuild and restart:
   ```bash
   ./deploy.sh rebuild
   ```

## Stopping for Maintenance

```bash
# Stop services but keep data
./deploy.sh stop

# Start again when ready
./deploy.sh start
```

## Complete Reset

To completely reset everything (⚠️ destroys all data):

```bash
./deploy.sh clean
./deploy.sh start
```

## Production Deployment

For production deployments:

1. Update `.env` with production values:
   - Strong database passwords
   - Secure JWT secrets
   - Production API endpoints

2. Ensure all API keys are configured

3. Start services:
   ```bash
   ./deploy.sh start
   ```

4. Verify health:
   ```bash
   ./deploy.sh health
   ```

5. Monitor logs:
   ```bash
   ./deploy.sh logs
   ```

## Backup Strategy

Regular backups are automated via the `postgres-backup` service, but you can also create manual backups:

```bash
# Create immediate backup
./deploy.sh backup

# Backups are stored in ./backups/
ls -lh ./backups/
```

Automated backups are configured to:
- Run daily
- Keep 7 days of daily backups
- Keep 4 weeks of weekly backups
- Keep 6 months of monthly backups
