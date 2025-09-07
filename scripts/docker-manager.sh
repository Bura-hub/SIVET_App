#!/bin/bash

# ================================
# MTE Lumen - Docker Manager Script
# ================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="mte-lumen"
ENV_FILE=".env"
BACKUP_DIR="./backups"
LOG_DIR="./logs"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
check_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env file not found. Please copy env.example to .env and configure it."
        exit 1
    fi
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    mkdir -p "$BACKUP_DIR" "$LOG_DIR" "./static" "./media" "./ssl"
    log_success "Directories created successfully"
}

# Development environment
dev_up() {
    log_info "Starting development environment..."
    check_env_file
    create_directories
    docker-compose up -d
    log_success "Development environment started successfully"
    log_info "Services available at:"
    log_info "  - Frontend: http://localhost:3000"
    log_info "  - Backend: http://localhost:8000"
    log_info "  - Nginx: http://localhost:80"
}

# Local environment (using local PostgreSQL and Redis)
local_up() {
    log_info "Starting local environment (using local PostgreSQL and Redis)..."
    check_env_file
    create_directories
    docker-compose -f docker-compose.local.yml up -d
    log_success "Local environment started successfully"
    log_info "Services available at:"
    log_info "  - Frontend: http://localhost:3000"
    log_info "  - Backend: http://localhost:8000"
    log_info "  - Nginx: http://localhost:80"
    log_info "  - PostgreSQL: localhost:${port_postgres:-5432} (local)"
    log_info "  - Redis: localhost:${REDIS_PORT:-6379} (local)"
}

# Production environment
prod_up() {
    log_info "Starting production environment..."
    check_env_file
    create_directories
    docker-compose -f docker-compose.prod.yml up -d
    log_success "Production environment started successfully"
}

# Stop services
stop() {
    log_info "Stopping services..."
    docker-compose down
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.local.yml down
    log_success "Services stopped successfully"
}

# Restart services
restart() {
    log_info "Restarting services..."
    stop
    sleep 2
    if [ "$1" = "prod" ]; then
        prod_up
    elif [ "$1" = "local" ]; then
        local_up
    else
        dev_up
    fi
}

# Build images
build() {
    log_info "Building Docker images..."
    if [ "$1" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml build --no-cache
    elif [ "$1" = "local" ]; then
        docker-compose -f docker-compose.local.yml build --no-cache
    else
        docker-compose build --no-cache
    fi
    log_success "Images built successfully"
}

# View logs
logs() {
    if [ "$1" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml logs -f "${2:-}"
    elif [ "$1" = "local" ]; then
        docker-compose -f docker-compose.local.yml logs -f "${2:-}"
    else
        docker-compose logs -f "${2:-}"
    fi
}

# Database backup
backup_db() {
    log_info "Creating database backup..."
    timestamp=$(date +"%Y%m%d_%H%M%S")
    backup_file="$BACKUP_DIR/db_backup_$timestamp.sql"
    
    # Try to backup from Docker PostgreSQL first
    if docker-compose -f docker-compose.local.yml exec -T db pg_dump -U "${user_postgres:-mte_user}" "${name_db:-mte_lumen_db}" > "$backup_file" 2>/dev/null; then
        log_success "Database backup created from Docker PostgreSQL: $backup_file"
    elif docker-compose exec -T db pg_dump -U "${user_postgres:-mte_user}" "${name_db:-mte_lumen_db}" > "$backup_file" 2>/dev/null; then
        log_success "Database backup created from Docker container: $backup_file"
    else
        log_error "Could not create database backup"
        log_info "Make sure PostgreSQL container is running"
    fi
}

# Database restore
restore_db() {
    if [ -z "$1" ]; then
        log_error "Please provide backup file path"
        exit 1
    fi
    
    log_warning "This will replace the current database. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "Restoring database from $1..."
        docker-compose exec -T db psql -U "${user_postgres:-mte_user}" -d "${name_db:-mte_lumen_db}" < "$1"
        log_success "Database restored successfully"
    else
        log_info "Database restore cancelled"
    fi
}

# Clean up
cleanup() {
    log_info "Cleaning up Docker resources..."
    docker system prune -f
    docker volume prune -f
    log_success "Cleanup completed"
}

# Health check
health() {
    log_info "Checking service health..."
    
    # Check if containers are running
    if [ "$1" = "prod" ]; then
        containers=$(docker-compose -f docker-compose.prod.yml ps -q)
    elif [ "$1" = "local" ]; then
        containers=$(docker-compose -f docker-compose.local.yml ps -q)
    else
        containers=$(docker-compose ps -q)
    fi
    
    for container in $containers; do
        name=$(docker inspect --format='{{.Name}}' "$container" | sed 's/\///')
        status=$(docker inspect --format='{{.State.Status}}' "$container")
        health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
        
        if [ "$status" = "running" ]; then
            if [ "$health" = "healthy" ] || [ "$health" = "no-healthcheck" ]; then
                log_success "$name: $status ($health)"
            else
                log_warning "$name: $status ($health)"
            fi
        else
            log_error "$name: $status"
        fi
    done
}

# Show status
status() {
    log_info "Service status:"
    if [ "$1" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml ps
    elif [ "$1" = "local" ]; then
        docker-compose -f docker-compose.local.yml ps
    else
        docker-compose ps
    fi
}

# Update services
update() {
    log_info "Updating services..."
    if [ "$1" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml pull
        docker-compose -f docker-compose.prod.yml up -d
    elif [ "$1" = "local" ]; then
        docker-compose -f docker-compose.local.yml pull
        docker-compose -f docker-compose.local.yml up -d
    else
        docker-compose pull
        docker-compose up -d
    fi
    log_success "Services updated successfully"
}

# Show help
show_help() {
    echo "MTE Lumen Docker Manager"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  dev-up          Start development environment (with Docker DB/Redis)"
    echo "  local-up        Start local environment (using local PostgreSQL/Redis)"
    echo "  prod-up         Start production environment"
    echo "  stop            Stop all services"
    echo "  restart [env]   Restart services (dev/local/prod)"
    echo "  build [env]     Build Docker images (dev/local/prod)"
    echo "  logs [env] [service]  View logs"
    echo "  backup-db       Create database backup"
    echo "  restore-db [file]  Restore database from backup"
    echo "  health [env]    Check service health"
    echo "  status [env]    Show service status"
    echo "  update [env]    Update services"
    echo "  cleanup         Clean up Docker resources"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev-up"
    echo "  $0 local-up"
    echo "  $0 prod-up"
    echo "  $0 logs local backend"
    echo "  $0 backup-db"
    echo "  $0 health local"
}

# Main script logic
case "${1:-help}" in
    "dev-up")
        dev_up
        ;;
    "local-up")
        local_up
        ;;
    "prod-up")
        prod_up
        ;;
    "stop")
        stop
        ;;
    "restart")
        restart "${2:-dev}"
        ;;
    "build")
        build "${2:-dev}"
        ;;
    "logs")
        logs "${2:-dev}" "${3:-}"
        ;;
    "backup-db")
        backup_db
        ;;
    "restore-db")
        restore_db "$2"
        ;;
    "health")
        health "${2:-dev}"
        ;;
    "status")
        status "${2:-dev}"
        ;;
    "update")
        update "${2:-dev}"
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|*)
        show_help
        ;;
esac
