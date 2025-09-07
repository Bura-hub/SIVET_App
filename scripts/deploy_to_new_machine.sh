#!/bin/bash

# Script para desplegar MTE Lumen App en una nueva máquina
# Uso: ./deploy_to_new_machine.sh

echo "=========================================="
echo "DESPLIEGUE DE MTE LUMEN APP"
echo "=========================================="

# Verificar que Docker esté instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Por favor instala Docker primero."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado. Por favor instala Docker Compose primero."
    exit 1
fi

echo "✅ Docker y Docker Compose están instalados"

# Verificar que existe el archivo .env
if [ ! -f ".env" ]; then
    echo "❌ Archivo .env no encontrado"
    echo "📝 Por favor crea el archivo .env basándote en env.example"
    echo "   cp env.example .env"
    echo "   nano .env  # Edita las variables necesarias"
    exit 1
fi

echo "✅ Archivo .env encontrado"

# Crear directorios necesarios
echo "📁 Creando directorios necesarios..."
mkdir -p logs
mkdir -p media/avatars
mkdir -p static
mkdir -p reports

# Construir las imágenes
echo "🔨 Construyendo imágenes Docker..."
docker-compose -f docker-compose.local.yml build

# Iniciar los servicios
echo "🚀 Iniciando servicios..."
docker-compose -f docker-compose.local.yml up -d

# Esperar a que la base de datos esté lista
echo "⏳ Esperando a que la base de datos esté lista..."
sleep 30

# Ejecutar migraciones
echo "📊 Ejecutando migraciones..."
docker exec mte_backend_local python manage.py migrate

# Crear superusuario
echo "👤 Creando superusuario..."
echo "Por favor ingresa los datos del superusuario:"
docker exec -it mte_backend_local python manage.py createsuperuser

# Recopilar archivos estáticos
echo "📦 Recopilando archivos estáticos..."
docker exec mte_backend_local python manage.py collectstatic --noinput

echo "=========================================="
echo "✅ DESPLIEGUE COMPLETADO"
echo "=========================================="
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 Admin Panel: http://localhost:8000/admin"
echo "📖 Swagger API: http://localhost:8000/api/schema/swagger-ui/"
echo ""
echo "📋 Comandos útiles:"
echo "   Ver logs: docker-compose -f docker-compose.local.yml logs -f"
echo "   Detener: docker-compose -f docker-compose.local.yml down"
echo "   Reiniciar: docker-compose -f docker-compose.local.yml restart"
echo "=========================================="
