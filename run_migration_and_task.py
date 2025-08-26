#!/usr/bin/env python
"""
Script para ejecutar la migración y luego la tarea para calcular datos históricos
con los nuevos campos de velocidad del viento e irradiancia.
"""

import os
import sys
import django
from datetime import datetime, timedelta, timezone

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.management import execute_from_command_line
from indicators.tasks import calculate_and_save_daily_data

def run_migration():
    """Ejecuta la migración para agregar los nuevos campos"""
    print("=== EJECUTANDO MIGRACIÓN ===")
    
    try:
        # Ejecutar la migración
        execute_from_command_line(['manage.py', 'migrate', 'indicators'])
        print("✅ Migración ejecutada correctamente")
        return True
    except Exception as e:
        print(f"❌ Error al ejecutar la migración: {e}")
        return False

def run_task():
    """Ejecuta la tarea para calcular datos históricos"""
    print("\n=== EJECUTANDO TAREA DE CÁLCULO ===")
    
    try:
        # Definir fechas para calcular datos históricos
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=30)  # Últimos 30 días
        
        print(f"Calculando datos para fechas: {start_date.date()} -> {end_date.date()}")
        
        # Ejecutar la tarea
        result = calculate_and_save_daily_data.delay(
            start_date_str=start_date.isoformat(),
            end_date_str=end_date.isoformat()
        )
        
        print(f"✅ Tarea ejecutada correctamente")
        print(f"   - ID de la tarea: {result.id}")
        print(f"   - Estado: {result.status}")
        print(f"   - La tarea se ejecutará en segundo plano")
        
        return True
        
    except Exception as e:
        print(f"❌ Error al ejecutar la tarea: {e}")
        return False

def main():
    """Función principal"""
    print("🚀 INICIANDO PROCESO DE ACTUALIZACIÓN")
    print("Este script ejecutará:")
    print("1. Migración para agregar nuevos campos")
    print("2. Tarea para calcular datos históricos")
    print()
    
    # Paso 1: Ejecutar migración
    if not run_migration():
        print("❌ Falló la migración. Abortando...")
        sys.exit(1)
    
    # Paso 2: Ejecutar tarea
    if not run_task():
        print("❌ Falló la ejecución de la tarea. Abortando...")
        sys.exit(1)
    
    print("\n=== PROCESO COMPLETADO EXITOSAMENTE ===")
    print("✅ Migración ejecutada")
    print("✅ Tarea iniciada")
    print("\n📝 Próximos pasos:")
    print("   1. Esperar a que la tarea termine (ver logs de Celery)")
    print("   2. Verificar que las gráficas muestren los nuevos datos")
    print("   3. Los nuevos campos estarán disponibles en el dashboard")
    
    print("\n🔍 Para monitorear el progreso:")
    print("   - Ver logs de Celery: celery -A core worker --loglevel=info")
    print("   - Ver estado de la tarea en el admin de Django")
    print("   - Verificar la base de datos para nuevos registros")

if __name__ == "__main__":
    main()
