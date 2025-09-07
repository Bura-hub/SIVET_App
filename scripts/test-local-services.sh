#!/bin/bash

# ================================
# MTE Lumen - Test Local Services Script
# ================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Load environment variables
if [ -f .env ]; then
    source .env
    log_info "Environment variables loaded from .env"
else
    log_warning ".env file not found, using default values"
fi

# Test PostgreSQL connection (will be in Docker)
test_postgresql() {
    log_info "Testing PostgreSQL connection (will be in Docker)..."
    
    # Check if PostgreSQL client is available
    if ! command -v psql > /dev/null 2>&1; then
        log_warning "psql command not found locally, but PostgreSQL will run in Docker"
        log_info "PostgreSQL will be started in Docker container and accessible at localhost:5432"
        return 0
    fi
    
    # Test if PostgreSQL is already running locally (should not be for this setup)
    if PGPASSWORD="${password_user_postgres:-mte_user}" psql -h localhost -U "${user_postgres:-mte_user}" -d "${name_db:-mte_lumen_db}" -p "${port_postgres:-5432}" -c "SELECT 1;" > /dev/null 2>&1; then
        log_warning "PostgreSQL is already running locally on port ${port_postgres:-5432}"
        log_info "For this setup, PostgreSQL should run in Docker. Consider stopping local PostgreSQL."
        return 1
    else
        log_success "No local PostgreSQL running (good for Docker setup)"
        log_info "PostgreSQL will be started in Docker container"
        return 0
    fi
}

# Test Redis connection (will be in Docker)
test_redis() {
    log_info "Testing Redis connection (will be in Docker)..."
    
    # Check if Redis client is available
    if ! command -v redis-cli > /dev/null 2>&1; then
        log_warning "redis-cli command not found locally, but Redis will run in Docker"
        log_info "Redis will be started in Docker container and accessible at localhost:6379"
        return 0
    fi
    
    # Test if Redis is already running locally (should not be for this setup)
    if redis-cli -h localhost -p "${REDIS_PORT:-6379}" ping > /dev/null 2>&1; then
        log_warning "Redis is already running locally on port ${REDIS_PORT:-6379}"
        log_info "For this setup, Redis should run in Docker. Consider stopping local Redis."
        return 1
    else
        log_success "No local Redis running (good for Docker setup)"
        log_info "Redis will be started in Docker container"
        return 0
    fi
}

# Test external API connectivity
test_external_api() {
    log_info "Testing external API connectivity..."
    
    # Check if curl is available
    if ! command -v curl > /dev/null 2>&1; then
        log_warning "curl command not found, skipping external API test"
        return 0
    fi
    
    # Test basic internet connectivity
    if curl -s --connect-timeout 10 http://www.google.com > /dev/null 2>&1; then
        log_success "Internet connectivity is working"
        log_info "External API calls should work (assuming SCADA credentials are correct)"
    else
        log_warning "Internet connectivity test failed"
        log_info "External API calls may not work"
    fi
}

# Test Docker connectivity
test_docker() {
    log_info "Testing Docker connectivity..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running or not accessible"
        return 1
    fi
    
    log_success "Docker is running"
    
    # Check if docker-compose is available
    if ! command -v docker-compose > /dev/null 2>&1; then
        log_error "docker-compose command not found"
        return 1
    fi
    
    log_success "docker-compose is available"
    
    # Test if we can build images
    if docker-compose -f docker-compose.local.yml config > /dev/null 2>&1; then
        log_success "Docker Compose configuration is valid"
    else
        log_error "Docker Compose configuration has errors"
        return 1
    fi
}

# Test network connectivity from Docker to host
test_docker_host_connectivity() {
    log_info "Testing Docker to host connectivity..."
    
    # Test if host.docker.internal resolves
    if docker run --rm alpine nslookup host.docker.internal > /dev/null 2>&1; then
        log_success "host.docker.internal resolves correctly"
    else
        log_warning "host.docker.internal may not resolve correctly"
        log_info "This might cause issues connecting to local services from Docker containers"
    fi
}

# Main test function
run_all_tests() {
    log_info "Starting local services connectivity tests..."
    echo ""
    
    local tests_passed=0
    local tests_total=0
    
    # Test PostgreSQL (will be in Docker)
    tests_total=$((tests_total + 1))
    if test_postgresql; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    # Test Redis (will be in Docker)
    tests_total=$((tests_total + 1))
    if test_redis; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    # Test external API
    tests_total=$((tests_total + 1))
    if test_external_api; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    # Test Docker
    tests_total=$((tests_total + 1))
    if test_docker; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    # Test Docker to host connectivity
    tests_total=$((tests_total + 1))
    if test_docker_host_connectivity; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    # Summary
    log_info "Test Summary: $tests_passed/$tests_total tests passed"
    
    if [ $tests_passed -eq $tests_total ]; then
        log_success "All tests passed! You can now run: ./scripts/docker-manager.sh local-up"
    else
        log_warning "Some tests failed. Please fix the issues before running the local environment."
        log_info "You can still try running: ./scripts/docker-manager.sh local-up"
        log_info "But some services may not work correctly."
    fi
}

# Show help
show_help() {
    echo "MTE Lumen Local Services Test"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  test              Run all connectivity tests"
    echo "  postgresql        Test PostgreSQL connection only"
    echo "  redis             Test Redis connection only"
    echo "  external-api      Test external API connectivity only"
    echo "  docker            Test Docker connectivity only"
    echo "  help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 test"
    echo "  $0 postgresql"
    echo "  $0 redis"
}

# Main script logic
case "${1:-test}" in
    "test")
        run_all_tests
        ;;
    "postgresql")
        test_postgresql
        ;;
    "redis")
        test_redis
        ;;
    "external-api")
        test_external_api
        ;;
    "docker")
        test_docker
        ;;
    "help"|*)
        show_help
        ;;
esac
