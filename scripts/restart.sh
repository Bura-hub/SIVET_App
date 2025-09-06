#!/bin/bash

# Script para reiniciar MteLumen_App
# Este script reinicia la aplicación completamente

set -e

echo "🔄 Reiniciando MteLumen_App..."

# Detener la aplicación
echo "⏹️  Deteniendo aplicación..."
docker-compose down

# Limpiar caché de Docker (opcional)
echo "🧹 Limpiando caché..."
docker system prune -f

# Reconstruir y iniciar
echo "🔨 Reconstruyendo e iniciando aplicación..."
docker-compose up --build -d

echo "✅ MteLumen_App reiniciada correctamente"
echo "🎉 La aplicación debería estar funcionando en:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   Admin Django: http://localhost:8000/admin"
