#!/bin/bash

# ================================
# MTE Lumen - Production Deployment Script
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
DEPLOYMENT_LOG="$LOG_DIR/deployment_$(date +%Y%m%d_%H%M%S).log"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check if .env file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env file not found. Please create it from env.example"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose > /dev/null 2>&1; then
        log_error "docker-compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check SSL certificates for production
    if [ ! -d "./ssl" ] || [ ! -f "./ssl/cert.pem" ] || [ ! -f "./ssl/key.pem" ]; then
        log_warning "SSL certificates not found. Creating self-signed certificates..."
        create_ssl_certificates
    fi
    
    # Check disk space (at least 5GB free for production)
    available_space=$(df . | tail -1 | awk '{print $4}')
    if [ "$available_space" -lt 5242880 ]; then
        log_warning "Low disk space. At least 5GB recommended for production deployment."
    fi
    
    log_success "Pre-deployment checks passed"
}

# Create SSL certificates
create_ssl_certificates() {
    log_info "Creating SSL certificates..."
    
    mkdir -p ssl
    
    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=CO/ST=Bogota/L=Bogota/O=MTE/OU=IT/CN=localhost"
    
    log_success "SSL certificates created"
}

# Create backup before deployment
create_backup() {
    log_info "Creating backup before deployment..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    timestamp=$(date +"%Y%m%d_%H%M%S")
    backup_file="$BACKUP_DIR/pre_deploy_backup_$timestamp.sql"
    
    if docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U "${user_postgres:-mte_user}" "${name_db:-mte_lumen_db}" > "$backup_file" 2>/dev/null; then
        log_success "Database backup created: $backup_file"
    else
        log_warning "Could not create database backup (database might not be running)"
    fi
    
    # Backup media files
    if [ -d "./media" ]; then
        tar -czf "$BACKUP_DIR/media_backup_$timestamp.tar.gz" ./media
        log_success "Media files backup created"
    fi
}

# Pull latest images
pull_images() {
    log_info "Pulling latest Docker images..."
    docker-compose -f docker-compose.prod.yml pull
    log_success "Images pulled successfully"
}

# Build new images
build_images() {
    log_info "Building new Docker images..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    log_success "Images built successfully"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    docker-compose -f docker-compose.prod.yml exec -T backend python manage.py migrate
    log_success "Migrations completed successfully"
}

# Collect static files
collect_static() {
    log_info "Collecting static files..."
    docker-compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput
    log_success "Static files collected successfully"
}

# Deploy services
deploy_services() {
    log_info "Deploying services..."
    
    # Stop existing services
    docker-compose -f docker-compose.prod.yml down
    
    # Start new services
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 45
    
    # Check health
    if health_check; then
        log_success "Services deployed successfully"
    else
        log_error "Some services are not healthy after deployment"
        rollback
        exit 1
    fi
}

# Health check
health_check() {
    log_info "Performing health checks..."
    
    # Check if all containers are running
    containers=$(docker-compose -f docker-compose.prod.yml ps -q)
    all_healthy=true
    
    for container in $containers; do
        name=$(docker inspect --format='{{.Name}}' "$container" | sed 's/\///')
        status=$(docker inspect --format='{{.State.Status}}' "$container")
        
        if [ "$status" != "running" ]; then
            log_error "$name is not running"
            all_healthy=false
        else
            log_success "$name is running"
        fi
    done
    
    # Check HTTP endpoints
    if curl -f http://localhost/health > /dev/null 2>&1; then
        log_success "Nginx health check passed"
    else
        log_error "Nginx health check failed"
        all_healthy=false
    fi
    
    # Check HTTPS endpoint
    if curl -f -k https://localhost/health > /dev/null 2>&1; then
        log_success "Nginx HTTPS health check passed"
    else
        log_warning "Nginx HTTPS health check failed (this might be expected with self-signed certificates)"
    fi
    
    return $([ "$all_healthy" = true ] && echo 0 || echo 1)
}

# Rollback function
rollback() {
    log_warning "Rolling back deployment..."
    
    # Stop current services
    docker-compose -f docker-compose.prod.yml down
    
    # Restore from backup if available
    latest_backup=$(ls -t "$BACKUP_DIR"/pre_deploy_backup_*.sql 2>/dev/null | head -1)
    if [ -n "$latest_backup" ]; then
        log_info "Restoring database from backup: $latest_backup"
        docker-compose -f docker-compose.prod.yml up -d db
        sleep 10
        docker-compose -f docker-compose.prod.yml exec -T db psql -U "${user_postgres:-mte_user}" -d "${name_db:-mte_lumen_db}" < "$latest_backup"
    fi
    
    # Start previous version
    docker-compose -f docker-compose.prod.yml up -d
    
    log_warning "Rollback completed"
}

# Post-deployment tasks
post_deployment() {
    log_info "Running post-deployment tasks..."
    
    # Clear cache
    docker-compose -f docker-compose.prod.yml exec -T backend python manage.py clear_cache 2>/dev/null || log_warning "Cache clear command not available"
    
    # Restart Celery workers
    docker-compose -f docker-compose.prod.yml restart celery_worker celery_beat
    
    log_success "Post-deployment tasks completed"
}

# Cleanup old images
cleanup() {
    log_info "Cleaning up old Docker images..."
    docker image prune -f
    log_success "Cleanup completed"
}

# Main deployment function
deploy() {
    log_info "Starting production deployment process..."
    log_info "Deployment log: $DEPLOYMENT_LOG"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Run deployment steps
    pre_deployment_checks
    create_backup
    pull_images
    build_images
    deploy_services
    run_migrations
    collect_static
    post_deployment
    cleanup
    
    log_success "Production deployment completed successfully!"
    log_info "Application is available at:"
    log_info "  HTTP:  http://${DOMAIN_NAME:-localhost}"
    log_info "  HTTPS: https://${DOMAIN_NAME:-localhost}"
    log_info ""
    log_info "Admin panel: https://${DOMAIN_NAME:-localhost}/admin"
    log_info "API docs: https://${DOMAIN_NAME:-localhost}/api/schema/swagger-ui/"
}

# Show help
show_help() {
    echo "MTE Lumen Production Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  deploy          Full production deployment process"
    echo "  health          Check service health"
    echo "  rollback        Rollback to previous version"
    echo "  backup          Create backup only"
    echo "  ssl             Create SSL certificates"
    echo "  help            Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  DOMAIN_NAME     Domain name for the application"
    echo "  user_postgres   PostgreSQL username"
    echo "  name_db         Database name"
}

# Main script logic
case "${1:-help}" in
    "deploy")
        deploy
        ;;
    "health")
        health_check
        ;;
    "rollback")
        rollback
        ;;
    "backup")
        create_backup
        ;;
    "ssl")
        create_ssl_certificates
        ;;
    "help"|*)
        show_help
        ;;
esac
