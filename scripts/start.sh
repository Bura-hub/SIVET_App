#!/bin/bash

# Script de inicio para MteLumen_App
# Este script maneja la inicialización de la aplicación

set -e

echo "🚀 Iniciando MteLumen_App..."

# Verificar si existe el archivo .env
if [ ! -f .env ]; then
    echo "⚠️  Archivo .env no encontrado. Copiando desde env.example..."
    cp env.example .env
    echo "📝 Por favor, edita el archivo .env con tus configuraciones antes de continuar."
    exit 1
fi

# Cargar variables de entorno
source .env

# Verificar variables requeridas
if [ -z "$SECRET_KEY" ] || [ -z "$name_db" ] || [ -z "$user_postgres" ] || [ -z "$password_user_postgres" ]; then
    echo "❌ Error: Variables de entorno requeridas no están configuradas en .env"
    echo "Por favor, configura las siguientes variables:"
    echo "- SECRET_KEY"
    echo "- name_db"
    echo "- user_postgres"
    echo "- password_user_postgres"
    exit 1
fi

echo "✅ Variables de entorno configuradas correctamente"

# Función para esperar a que un servicio esté listo
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    
    echo "⏳ Esperando a que $service_name esté listo..."
    while ! nc -z $host $port; do
        sleep 1
    done
    echo "✅ $service_name está listo"
}

# Esperar a que PostgreSQL esté listo
wait_for_service db 5432 "PostgreSQL"

# Esperar a que Redis esté listo
wait_for_service redis 6379 "Redis"

echo "🎉 Todos los servicios están listos. La aplicación debería estar funcionando en:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   Admin Django: http://localhost:8000/admin"
