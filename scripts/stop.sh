#!/bin/bash

# Script para detener MteLumen_App
# Este script detiene todos los contenedores y limpia recursos

set -e

echo "🛑 Deteniendo MteLumen_App..."

# Detener todos los contenedores
echo "⏹️  Deteniendo contenedores..."
docker-compose down

# Opcional: limpiar volúmenes (descomenta si quieres eliminar datos)
# echo "🧹 Limpiando volúmenes..."
# docker-compose down -v

# Opcional: limpiar imágenes (descomenta si quieres eliminar imágenes)
# echo "🧹 Limpiando imágenes..."
# docker-compose down --rmi all

echo "✅ MteLumen_App detenida correctamente"
