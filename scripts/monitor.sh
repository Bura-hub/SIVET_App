#!/bin/bash

# ================================
# MTE Lumen - Monitoring Script
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
LOG_DIR="./logs"
MONITOR_LOG="$LOG_DIR/monitor_$(date +%Y%m%d_%H%M%S).log"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$MONITOR_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$MONITOR_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$MONITOR_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$MONITOR_LOG"
}

# Check container status
check_containers() {
    log_info "Checking container status..."
    
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
        uptime=$(docker inspect --format='{{.State.StartedAt}}' "$container")
        
        echo "Container: $name"
        echo "  Status: $status"
        echo "  Health: $health"
        echo "  Started: $uptime"
        echo ""
    done
}

# Check resource usage
check_resources() {
    log_info "Checking resource usage..."
    
    echo "=== Docker System Info ==="
    docker system df
    echo ""
    
    echo "=== Container Resource Usage ==="
    if [ "$1" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml top
    elif [ "$1" = "local" ]; then
        docker-compose -f docker-compose.local.yml top
    else
        docker-compose top
    fi
    echo ""
    
    echo "=== Memory Usage ==="
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
    echo ""
}

# Check logs for errors
check_logs() {
    log_info "Checking recent logs for errors..."
    
    if [ "$1" = "prod" ]; then
        services=("backend" "celery_worker" "celery_beat" "nginx" "db" "redis")
    elif [ "$1" = "local" ]; then
        services=("backend" "celery_worker" "celery_beat" "frontend" "nginx")
    else
        services=("backend" "celery_worker" "celery_beat" "frontend" "nginx" "db" "redis")
    fi
    
    for service in "${services[@]}"; do
        echo "=== $service logs (last 10 lines) ==="
        if [ "$1" = "prod" ]; then
            docker-compose -f docker-compose.prod.yml logs --tail=10 "$service" 2>/dev/null || echo "Service not found or no logs"
        elif [ "$1" = "local" ]; then
            docker-compose -f docker-compose.local.yml logs --tail=10 "$service" 2>/dev/null || echo "Service not found or no logs"
        else
            docker-compose logs --tail=10 "$service" 2>/dev/null || echo "Service not found or no logs"
        fi
        echo ""
    done
}

# Check database connectivity
check_database() {
    log_info "Checking database connectivity..."
    
    if [ "$1" = "prod" ]; then
        if docker-compose -f docker-compose.prod.yml exec -T db pg_isready -U "${user_postgres:-mte_user}" -d "${name_db:-mte_lumen_db}" > /dev/null 2>&1; then
            log_success "Database is accessible"
        else
            log_error "Database is not accessible"
        fi
    elif [ "$1" = "local" ]; then
        # Check PostgreSQL in Docker
        if docker-compose -f docker-compose.local.yml exec -T db pg_isready -U "${user_postgres:-mte_user}" -d "${name_db:-mte_lumen_db}" > /dev/null 2>&1; then
            log_success "PostgreSQL in Docker is accessible"
        else
            log_error "PostgreSQL in Docker is not accessible"
        fi
    else
        if docker-compose exec -T db pg_isready -U "${user_postgres:-mte_user}" -d "${name_db:-mte_lumen_db}" > /dev/null 2>&1; then
            log_success "Database is accessible"
        else
            log_error "Database is not accessible"
        fi
    fi
}

# Check Redis connectivity
check_redis() {
    log_info "Checking Redis connectivity..."
    
    if [ "$1" = "prod" ]; then
        if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli -a "${REDIS_PASSWORD:-defaultpassword}" ping > /dev/null 2>&1; then
            log_success "Redis is accessible"
        else
            log_error "Redis is not accessible"
        fi
    elif [ "$1" = "local" ]; then
        # Check Redis in Docker
        if docker-compose -f docker-compose.local.yml exec -T redis redis-cli -a "${REDIS_PASSWORD:-defaultpassword}" ping > /dev/null 2>&1; then
            log_success "Redis in Docker is accessible"
        else
            log_error "Redis in Docker is not accessible"
        fi
    else
        if docker-compose exec -T redis redis-cli -a "${REDIS_PASSWORD:-defaultpassword}" ping > /dev/null 2>&1; then
            log_success "Redis is accessible"
        else
            log_error "Redis is not accessible"
        fi
    fi
}

# Check HTTP endpoints
check_endpoints() {
    log_info "Checking HTTP endpoints..."
    
    # Check nginx
    if curl -f http://localhost/health > /dev/null 2>&1; then
        log_success "Nginx health endpoint is responding"
    else
        log_error "Nginx health endpoint is not responding"
    fi
    
    # Check backend API
    if curl -f http://localhost/api/ > /dev/null 2>&1; then
        log_success "Backend API is responding"
    else
        log_warning "Backend API is not responding (might be expected)"
    fi
    
    # Check frontend (development and local only)
    if [ "$1" != "prod" ]; then
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            log_success "Frontend is responding"
        else
            log_error "Frontend is not responding"
        fi
    fi
}

# Check disk space
check_disk_space() {
    log_info "Checking disk space..."
    
    echo "=== Disk Usage ==="
    df -h
    echo ""
    
    echo "=== Docker Volumes ==="
    docker volume ls
    echo ""
    
    # Check if disk space is low
    available_space=$(df . | tail -1 | awk '{print $4}')
    if [ "$available_space" -lt 1048576 ]; then  # Less than 1GB
        log_warning "Low disk space detected!"
    else
        log_success "Disk space is adequate"
    fi
}

# Check network connectivity
check_network() {
    log_info "Checking network connectivity..."
    
    if [ "$1" = "prod" ]; then
        network_name="mte_network_prod"
    elif [ "$1" = "local" ]; then
        network_name="mte_network_local"
    else
        network_name="mte_network"
    fi
    
    echo "=== Network Info ==="
    docker network inspect "$network_name" 2>/dev/null || log_warning "Network $network_name not found"
    echo ""
}

# Generate monitoring report
generate_report() {
    log_info "Generating monitoring report..."
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    echo "=== MTE Lumen Monitoring Report ===" > "$MONITOR_LOG"
    echo "Generated at: $(date)" >> "$MONITOR_LOG"
    echo "Environment: ${1:-dev}" >> "$MONITOR_LOG"
    echo "" >> "$MONITOR_LOG"
    
    check_containers "$1" >> "$MONITOR_LOG"
    check_resources "$1" >> "$MONITOR_LOG"
    check_database "$1" >> "$MONITOR_LOG"
    check_redis "$1" >> "$MONITOR_LOG"
    check_endpoints "$1" >> "$MONITOR_LOG"
    check_disk_space >> "$MONITOR_LOG"
    check_network "$1" >> "$MONITOR_LOG"
    
    log_success "Monitoring report generated: $MONITOR_LOG"
}

# Continuous monitoring
continuous_monitor() {
    log_info "Starting continuous monitoring (press Ctrl+C to stop)..."
    
    while true; do
        clear
        echo "=== MTE Lumen Continuous Monitor ==="
        echo "Time: $(date)"
        echo "Environment: ${1:-dev}"
        echo ""
        
        check_containers "$1"
        check_resources "$1"
        
        sleep 30
    done
}

# Show help
show_help() {
    echo "MTE Lumen Monitoring Script"
    echo ""
    echo "Usage: $0 [COMMAND] [ENVIRONMENT]"
    echo ""
    echo "Commands:"
    echo "  status [env]        Check container status"
    echo "  resources [env]     Check resource usage"
    echo "  logs [env]          Check recent logs"
    echo "  database [env]      Check database connectivity"
    echo "  redis [env]         Check Redis connectivity"
    echo "  endpoints [env]     Check HTTP endpoints"
    echo "  disk               Check disk space"
    echo "  network [env]       Check network connectivity"
    echo "  report [env]        Generate full monitoring report"
    echo "  monitor [env]       Continuous monitoring"
    echo "  help               Show this help message"
    echo ""
    echo "Environment: dev (default), local, or prod"
    echo ""
    echo "Examples:"
    echo "  $0 status local"
    echo "  $0 report dev"
    echo "  $0 monitor prod"
}

# Main script logic
case "${1:-help}" in
    "status")
        check_containers "${2:-dev}"
        ;;
    "resources")
        check_resources "${2:-dev}"
        ;;
    "logs")
        check_logs "${2:-dev}"
        ;;
    "database")
        check_database "${2:-dev}"
        ;;
    "redis")
        check_redis "${2:-dev}"
        ;;
    "endpoints")
        check_endpoints "${2:-dev}"
        ;;
    "disk")
        check_disk_space
        ;;
    "network")
        check_network "${2:-dev}"
        ;;
    "report")
        generate_report "${2:-dev}"
        ;;
    "monitor")
        continuous_monitor "${2:-dev}"
        ;;
    "help"|*)
        show_help
        ;;
esac
