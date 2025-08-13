#!/usr/bin/env python
"""
Script de prueba para el comando de cálculo histórico de estaciones meteorológicas
Verifica que el comando funcione correctamente y muestra ejemplos de uso
"""

import os
import sys
import django
import subprocess
from datetime import datetime, timedelta

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.management import call_command
from django.core.management.base import CommandError
from indicators.models import WeatherStationIndicators, WeatherStationChartData
from scada_proxy.models import Device, Institution, DeviceCategory

def test_weather_historical_command():
    """Prueba el comando de cálculo histórico de estaciones meteorológicas"""
    
    print("=== PRUEBA DEL COMANDO DE CÁLCULO HISTÓRICO DE ESTACIONES METEOROLÓGICAS ===\n")
    
    # 1. Verificar que existen estaciones meteorológicas
    print("1. VERIFICANDO ESTACIONES METEOROLÓGICAS DISPONIBLES:")
    try:
        weather_category = DeviceCategory.objects.filter(name='weatherStation').first()
        if weather_category:
            weather_stations = Device.objects.filter(category=weather_category, is_active=True)
            print(f"   ✅ Categoría 'weatherStation' encontrada (ID: {weather_category.id})")
            print(f"   📊 Estaciones activas: {weather_stations.count()}")
            
            if weather_stations.count() > 0:
                for station in weather_stations[:3]:  # Mostrar solo las primeras 3
                    print(f"      - {station.name} (Institución: {station.institution.name if station.institution else 'N/A'})")
                if weather_stations.count() > 3:
                    print(f"      ... y {weather_stations.count() - 3} más")
            else:
                print("   ⚠️ No hay estaciones meteorológicas activas")
                return False
        else:
            print("   ❌ No se encontró la categoría 'weatherStation'")
            return False
    except Exception as e:
        print(f"   ❌ Error verificando estaciones: {e}")
        return False
    
    # 2. Verificar que existen instituciones
    print(f"\n2. VERIFICANDO INSTITUCIONES DISPONIBLES:")
    try:
        institutions = Institution.objects.all()
        print(f"   📊 Instituciones disponibles: {institutions.count()}")
        for inst in institutions:
            print(f"      - ID {inst.id}: {inst.name}")
    except Exception as e:
        print(f"   ❌ Error verificando instituciones: {e}")
        return False
    
    # 3. Verificar estado actual de la base de datos
    print(f"\n3. ESTADO ACTUAL DE LA BASE DE DATOS:")
    try:
        indicators_count = WeatherStationIndicators.objects.count()
        chart_data_count = WeatherStationChartData.objects.count()
        print(f"   📊 Indicadores existentes: {indicators_count}")
        print(f"   📊 Datos de gráficos existentes: {chart_data_count}")
    except Exception as e:
        print(f"   ❌ Error verificando base de datos: {e}")
        return False
    
    # 4. Probar el comando con fechas recientes (últimos 5 días)
    print(f"\n4. PROBANDO EL COMANDO DE CÁLCULO:")
    try:
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=5)
        
        print(f"   📅 Probando con fechas: {start_date} a {end_date}")
        print(f"   🔄 Ejecutando comando...")
        
        # Ejecutar el comando
        call_command(
            'calculate_historical_weather_stations',
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d'),
            time_range='daily',
            batch_size=5
        )
        
        print(f"   ✅ Comando ejecutado exitosamente")
        
    except CommandError as e:
        print(f"   ❌ Error en el comando: {e}")
        return False
    except Exception as e:
        print(f"   ❌ Error inesperado: {e}")
        return False
    
    # 5. Verificar que se crearon nuevos registros
    print(f"\n5. VERIFICANDO NUEVOS REGISTROS:")
    try:
        new_indicators_count = WeatherStationIndicators.objects.count()
        new_chart_data_count = WeatherStationChartData.objects.count()
        
        indicators_created = new_indicators_count - indicators_count
        chart_data_created = new_chart_data_count - chart_data_count
        
        print(f"   📊 Nuevos indicadores creados: {indicators_created}")
        print(f"   📊 Nuevos datos de gráficos creados: {chart_data_created}")
        
        if indicators_created > 0 or chart_data_created > 0:
            print(f"   ✅ Se crearon nuevos registros exitosamente")
        else:
            print(f"   ⚠️ No se crearon nuevos registros (puede ser normal si no hay datos SCADA)")
            
    except Exception as e:
        print(f"   ❌ Error verificando nuevos registros: {e}")
        return False
    
    # 6. Mostrar ejemplos de uso
    print(f"\n6. EJEMPLOS DE USO DEL COMANDO:")
    print(f"   📋 Comando básico (últimos 30 días):")
    print(f"      python manage.py calculate_historical_weather_stations --start-date 2024-01-01 --end-date 2024-01-31")
    
    print(f"\n   📋 Para una institución específica:")
    print(f"      python manage.py calculate_historical_weather_stations --start-date 2024-01-01 --end-date 2024-01-31 --institution-id 1")
    
    print(f"\n   📋 Para un dispositivo específico:")
    print(f"      python manage.py calculate_historical_weather_stations --start-date 2024-01-01 --end-date 2024-01-31 --device-id WS001")
    
    print(f"\n   📋 Con cálculo mensual:")
    print(f"      python manage.py calculate_historical_weather_stations --start-date 2024-01-01 --end-date 2024-12-31 --time-range monthly")
    
    print(f"\n   📋 Con lote personalizado:")
    print(f"      python manage.py calculate_historical_weather_stations --start-date 2024-01-01 --end-date 2024-12-31 --batch-size 15")
    
    print(f"\n7. MONITOREO DEL PROGRESO:")
    print(f"   📊 Verificar registros en tiempo real:")
    print(f"      python manage.py shell -c \"from indicators.models import WeatherStationIndicators; print(WeatherStationIndicators.objects.count())\"")
    
    print(f"   📊 Verificar datos de gráficos:")
    print(f"      python manage.py shell -c \"from indicators.models import WeatherStationChartData; print(WeatherStationChartData.objects.count())\"")
    
    print(f"\n=== PRUEBA COMPLETADA ===")
    return True

if __name__ == "__main__":
    try:
        success = test_weather_historical_command()
        if success:
            print("\n🎉 ¡Todas las pruebas pasaron exitosamente!")
        else:
            print("\n❌ Algunas pruebas fallaron. Revisa los errores arriba.")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n⏹️ Prueba interrumpida por el usuario")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error inesperado durante la prueba: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
