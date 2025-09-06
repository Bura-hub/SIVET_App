#!/bin/bash

# Script para hacer backup de MteLumen_App
# Este script crea un backup de la base de datos y archivos importantes

set -e

# Crear directorio de backups si no existe
mkdir -p backups

# Obtener fecha actual para el nombre del backup
BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups/backup_$BACKUP_DATE"

echo "💾 Creando backup de MteLumen_App..."

# Crear directorio del backup
mkdir -p $BACKUP_DIR

# Backup de la base de datos
echo "🗄️  Haciendo backup de la base de datos..."
docker-compose exec -T db pg_dump -U $user_postgres $name_db > $BACKUP_DIR/database.sql

# Backup de archivos media
echo "📁 Haciendo backup de archivos media..."
if [ -d "media" ]; then
    cp -r media $BACKUP_DIR/
fi

# Backup de archivos de configuración
echo "⚙️  Haciendo backup de archivos de configuración..."
cp .env $BACKUP_DIR/ 2>/dev/null || echo "⚠️  Archivo .env no encontrado"
cp docker-compose.yml $BACKUP_DIR/
cp docker-compose.prod.yml $BACKUP_DIR/

# Crear archivo de información del backup
echo "📝 Creando archivo de información del backup..."
cat > $BACKUP_DIR/backup_info.txt << EOF
Backup creado el: $(date)
Versión de la aplicación: MteLumen_App
Base de datos: $name_db
Usuario: $user_postgres
EOF

# Comprimir el backup
echo "📦 Comprimiendo backup..."
tar -czf "backups/backup_$BACKUP_DATE.tar.gz" -C backups "backup_$BACKUP_DATE"

# Limpiar directorio temporal
rm -rf $BACKUP_DIR

echo "✅ Backup creado exitosamente: backups/backup_$BACKUP_DATE.tar.gz"
