#!/bin/bash

# Script de inicio rápido para Docker
# MTE Lumen App

set -e

echo "🚀 Iniciando MTE Lumen App con Docker..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_message() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que Docker esté ejecutándose
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker no está ejecutándose. Por favor, inicia Docker Desktop."
        exit 1
    fi
    print_success "Docker está ejecutándose"
}

# Verificar que docker-compose esté disponible
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose no está instalado o no está en el PATH"
        exit 1
    fi
    print_success "docker-compose está disponible"
}

# Verificar archivo .env
check_env_file() {
    if [ ! -f .env ]; then
        print_warning "Archivo .env no encontrado"
        if [ -f env.example ]; then
            print_message "Copiando env.example a .env..."
            cp env.example .env
            print_warning "Por favor, edita el archivo .env con tus configuraciones antes de continuar"
            print_message "Presiona Enter cuando hayas configurado el archivo .env..."
            read -r
        else
            print_error "No se encontró env.example. Por favor, crea un archivo .env manualmente"
            exit 1
        fi
    fi
    print_success "Archivo .env encontrado"
}

# Construir imágenes
build_images() {
    print_message "Construyendo imágenes Docker..."
    docker-compose build
    print_success "Imágenes construidas exitosamente"
}

# Iniciar servicios
start_services() {
    print_message "Iniciando servicios..."
    docker-compose up -d
    
    # Esperar a que los servicios estén listos
    print_message "Esperando a que los servicios estén listos..."
    sleep 10
    
    # Verificar estado de los servicios
    check_services_status
}

# Verificar estado de los servicios
check_services_status() {
    print_message "Verificando estado de los servicios..."
    
    # Verificar PostgreSQL
    if docker-compose ps postgres | grep -q "Up"; then
        print_success "PostgreSQL está ejecutándose"
    else
        print_error "PostgreSQL no está ejecutándose"
    fi
    
    # Verificar Redis
    if docker-compose ps redis | grep -q "Up"; then
        print_success "Redis está ejecutándose"
    else
        print_error "Redis no está ejecutándose"
    fi
    
    # Verificar Backend
    if docker-compose ps backend | grep -q "Up"; then
        print_success "Backend Django está ejecutándose"
    else
        print_error "Backend Django no está ejecutándose"
    fi
    
    # Verificar Frontend
    if docker-compose ps frontend | grep -q "Up"; then
        print_success "Frontend React está ejecutándose"
    else
        print_error "Frontend React no está ejecutándose"
    fi
    
    # Verificar Celery Worker
    if docker-compose ps celery_worker | grep -q "Up"; then
        print_success "Celery Worker está ejecutándose"
    else
        print_error "Celery Worker no está ejecutándose"
    fi
    
    # Verificar Celery Beat
    if docker-compose ps celery_beat | grep -q "Up"; then
        print_success "Celery Beat está ejecutándose"
    else
        print_error "Celery Beat no está ejecutándose"
    fi
}

# Mostrar información de acceso
show_access_info() {
    echo ""
    print_success "🎉 MTE Lumen App está ejecutándose!"
    echo ""
    echo "📱 Acceso a la aplicación:"
    echo "   Frontend:     http://localhost:3000"
    echo "   Backend API:  http://localhost:8000"
    echo "   Admin Django: http://localhost:8000/admin/"
    echo "   API Schema:   http://localhost:8000/api/schema/"
    echo ""
    echo "🗄️  Base de datos:"
    echo "   PostgreSQL:   localhost:5432"
    echo "   Redis:        localhost:6379"
    echo ""
    echo "🔧 Comandos útiles:"
    echo "   Ver logs:     docker-compose logs -f"
    echo "   Detener:      docker-compose down"
    echo "   Reiniciar:    docker-compose restart"
    echo "   Estado:       docker-compose ps"
    echo ""
}

# Función principal
main() {
    echo "🐳 MTE Lumen App - Docker Setup"
    echo "================================"
    echo ""
    
    check_docker
    check_docker_compose
    check_env_file
    
    # Preguntar si construir imágenes
    echo ""
    read -p "¿Deseas construir las imágenes Docker? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        build_images
    fi
    
    start_services
    show_access_info
}

# Ejecutar función principal
main "$@"
