#!/bin/bash

# Hub Social Media Deployment Script
# Easy deployment and management of the Docker-based application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# Functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

check_requirements() {
    print_info "Checking requirements..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi

    if [ ! -f "$ENV_FILE" ]; then
        print_error ".env file not found"
        exit 1
    fi

    print_success "All requirements met"
}

start_services() {
    print_header "Starting Services"
    check_requirements

    print_info "Starting Docker containers..."
    docker-compose up -d

    print_success "Services started successfully"
    print_info "Waiting for services to be healthy..."
    sleep 5

    show_status
}

stop_services() {
    print_header "Stopping Services"

    print_info "Stopping Docker containers..."
    docker-compose down

    print_success "Services stopped successfully"
}

restart_services() {
    print_header "Restarting Services"

    stop_services
    sleep 2
    start_services
}

show_status() {
    print_header "Service Status"
    docker-compose ps
}

show_logs() {
    local service=$1

    if [ -z "$service" ]; then
        print_header "All Service Logs"
        docker-compose logs --tail=100 -f
    else
        print_header "Logs for $service"
        docker-compose logs --tail=100 -f "$service"
    fi
}

build_services() {
    print_header "Building Services"
    check_requirements

    print_info "Building Docker images..."
    docker-compose build --no-cache

    print_success "Build completed successfully"
}

rebuild_and_start() {
    print_header "Rebuild and Start"

    stop_services
    build_services
    start_services
}

clean_all() {
    print_header "Cleaning Up"

    print_warning "This will remove all containers, volumes, and images"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Stopping all containers..."
        docker-compose down -v

        print_info "Removing images..."
        docker-compose down --rmi all

        print_success "Cleanup completed"
    else
        print_info "Cleanup cancelled"
    fi
}

health_check() {
    print_header "Health Check"

    print_info "Checking service health..."

    # Check if containers are running
    if ! docker-compose ps | grep -q "Up"; then
        print_error "No services are running"
        return 1
    fi

    # Check Redis
    if docker-compose exec -T redis redis-cli ping &> /dev/null; then
        print_success "Redis is healthy"
    else
        print_error "Redis is not responding"
    fi

    # Check PostgreSQL
    if docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; then
        print_success "PostgreSQL is healthy"
    else
        print_error "PostgreSQL is not responding"
    fi

    # Check App
    if docker-compose ps | grep "content-hub-app" | grep -q "Up"; then
        print_success "Application is running"
    else
        print_error "Application is not running"
    fi
}

backup_db() {
    print_header "Database Backup"

    BACKUP_DIR="./backups"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

    mkdir -p "$BACKUP_DIR"

    print_info "Creating database backup..."
    docker-compose exec -T postgres pg_dump -U postgres hub_social_media > "$BACKUP_FILE"

    print_success "Backup created: $BACKUP_FILE"
}

show_help() {
    cat << EOF
Hub Social Media Deployment Script

Usage: ./deploy.sh [command]

Commands:
    start           Start all services
    stop            Stop all services
    restart         Restart all services
    status          Show service status
    logs [service]  Show logs (optionally for specific service)
    build           Build Docker images
    rebuild         Rebuild images and start services
    clean           Remove all containers, volumes, and images
    health          Run health check on all services
    backup          Create database backup
    help            Show this help message

Examples:
    ./deploy.sh start
    ./deploy.sh logs app
    ./deploy.sh restart
    ./deploy.sh health

EOF
}

# Main script logic
case "${1:-}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$2"
        ;;
    build)
        build_services
        ;;
    rebuild)
        rebuild_and_start
        ;;
    clean)
        clean_all
        ;;
    health)
        health_check
        ;;
    backup)
        backup_db
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: ${1:-}"
        echo ""
        show_help
        exit 1
        ;;
esac
