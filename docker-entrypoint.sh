#!/bin/bash

# Script de entrada para Docker
set -e

# Función para esperar a que PostgreSQL esté listo
wait_for_postgres() {
    echo "Esperando a que PostgreSQL esté listo..."
    while ! pg_isready -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER; do
        sleep 2
    done
    echo "PostgreSQL está listo!"
}

# Función para esperar a que Redis esté listo
wait_for_redis() {
    echo "Esperando a que Redis esté listo..."
    while ! redis-cli -h $REDIS_HOST -p $REDIS_PORT ping > /dev/null 2>&1; do
        sleep 2
    done
    echo "Redis está listo!"
}

# Esperar a que los servicios estén listos
if [ "$1" = "backend" ]; then
    wait_for_postgres
    wait_for_redis
    
    echo "Ejecutando migraciones..."
    python manage.py migrate --noinput
    
    echo "Recolectando archivos estáticos..."
    python manage.py collectstatic --noinput
    
    echo "Iniciando servidor Django..."
    exec python manage.py runserver 0.0.0.0:8000
elif [ "$1" = "celery_worker" ]; then
    wait_for_postgres
    wait_for_redis
    
    echo "Iniciando worker de Celery..."
    exec celery -A core worker --loglevel=info
elif [ "$1" = "celery_beat" ]; then
    wait_for_postgres
    wait_for_redis
    
    echo "Iniciando beat de Celery..."
    exec celery -A core beat --loglevel=info
else
    exec "$@"
fi
