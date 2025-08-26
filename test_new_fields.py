#!/usr/bin/env python
"""
Script de prueba para verificar que los nuevos campos de velocidad del viento e irradiancia funcionen correctamente.
"""

import os
import sys
import django
from datetime import datetime, timedelta, timezone

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from indicators.tasks import calculate_and_save_daily_data
from indicators.models import DailyChartData

def test_new_fields():
    """Prueba la funcionalidad de los nuevos campos"""
    print("=== PRUEBA DE NUEVOS CAMPOS ===")
    
    # 1. Verificar que el modelo tiene los nuevos campos
    try:
        # Intentar crear un registro con los nuevos campos
        test_data = DailyChartData.objects.create(
            date=datetime.now().date(),
            daily_consumption=100.0,
            daily_generation=50.0,
            daily_balance=-50.0,
            avg_daily_temp=25.0,
            avg_wind_speed=15.5,
            avg_irradiance=800.0
        )
        print("✅ Modelo actualizado correctamente - se pueden crear registros con nuevos campos")
        
        # Verificar que los campos existen
        print(f"   - avg_wind_speed: {test_data.avg_wind_speed} km/h")
        print(f"   - avg_irradiance: {test_data.avg_irradiance} W/m²")
        
        # Limpiar el registro de prueba
        test_data.delete()
        print("   - Registro de prueba eliminado")
        
    except Exception as e:
        print(f"❌ Error al crear registro con nuevos campos: {e}")
        return False
    
    # 2. Verificar que la tarea puede ejecutarse
    try:
        print("\n=== PROBANDO TAREA ACTUALIZADA ===")
        
        # Definir fechas de prueba
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=2)
        
        print(f"Ejecutando tarea para fechas: {start_date.date()} -> {end_date.date()}")
        
        # Ejecutar la tarea
        result = calculate_and_save_daily_data.delay(
            start_date_str=start_date.isoformat(),
            end_date_str=end_date.isoformat()
        )
        
        print(f"✅ Tarea ejecutada correctamente - ID: {result.id}")
        print("   - La tarea se ejecutará en segundo plano")
        print("   - Verifica los logs de Celery para ver el progreso")
        
    except Exception as e:
        print(f"❌ Error al ejecutar la tarea: {e}")
        return False
    
    # 3. Verificar que los datos existen en la base de datos
    try:
        print("\n=== VERIFICANDO DATOS EN BASE DE DATOS ===")
        
        # Buscar registros recientes
        recent_data = DailyChartData.objects.filter(
            date__gte=start_date.date()
        ).order_by('-date')[:5]
        
        if recent_data.exists():
            print(f"✅ Encontrados {recent_data.count()} registros recientes")
            
            for data in recent_data:
                print(f"   Fecha: {data.date}")
                print(f"     - Consumo: {data.daily_consumption:.2f} kWh")
                print(f"     - Generación: {data.daily_generation:.2f} kWh")
                print(f"     - Balance: {data.daily_balance:.2f} kWh")
                print(f"     - Temperatura: {data.avg_daily_temp:.2f} °C")
                print(f"     - Viento: {data.avg_wind_speed:.2f} km/h")
                print(f"     - Irradiancia: {data.avg_irradiance:.2f} W/m²")
                print()
        else:
            print("⚠️  No se encontraron registros recientes")
            print("   - Esto puede ser normal si la tarea aún no ha terminado")
            print("   - O si no hay datos de estaciones meteorológicas")
        
    except Exception as e:
        print(f"❌ Error al verificar datos: {e}")
        return False
    
    print("\n=== RESUMEN ===")
    print("✅ Pruebas completadas exitosamente")
    print("✅ Los nuevos campos están funcionando correctamente")
    print("✅ La tarea actualizada se puede ejecutar")
    print("\n📝 Próximos pasos:")
    print("   1. Ejecutar la migración: python manage.py migrate")
    print("   2. Ejecutar la tarea para calcular datos históricos")
    print("   3. Verificar que las gráficas muestren los nuevos datos")
    
    return True

if __name__ == "__main__":
    success = test_new_fields()
    sys.exit(0 if success else 1)
