#!/bin/bash

# Script para ver logs de MteLumen_App
# Este script muestra los logs de todos los servicios

set -e

echo "📋 Mostrando logs de MteLumen_App..."

# Mostrar logs de todos los servicios
docker-compose logs -f
