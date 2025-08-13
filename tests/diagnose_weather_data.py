#!/usr/bin/env python
"""
Script de diagnóstico para verificar datos de estaciones meteorológicas
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from scada_proxy.models import Device, DeviceCategory, Measurement
from datetime import date, datetime
from indicators.models import WeatherStationIndicators, WeatherStationChartData

def diagnose_weather_data():
    """Diagnostica los datos de estaciones meteorológicas"""
    
    print("=== DIAGNÓSTICO DE DATOS DE ESTACIONES METEOROLÓGICAS ===\n")
    
    # 1. Verificar estaciones meteorológicas
    print("1. VERIFICANDO ESTACIONES METEOROLÓGICAS:")
    try:
        weather_cat = DeviceCategory.objects.filter(name='weatherStation').first()
        if weather_cat:
            print(f"   ✅ Categoría 'weatherStation' encontrada (ID: {weather_cat.id})")
            stations = Device.objects.filter(category=weather_cat, is_active=True)
            print(f"   📊 Estaciones activas: {stations.count()}")
            
            if stations.exists():
                for station in stations:
                    print(f"      - {station.name} (ID: {station.id}, SCADA ID: {station.scada_id})")
            else:
                print("   ⚠️ No hay estaciones meteorológicas activas")
                return False
        else:
            print("   ❌ No se encontró la categoría 'weatherStation'")
            return False
    except Exception as e:
        print(f"   ❌ Error verificando estaciones: {e}")
        return False
    
    # 2. Verificar mediciones disponibles
    print(f"\n2. VERIFICANDO MEDICIONES DISPONIBLES:")
    try:
        total_measurements = Measurement.objects.count()
        print(f"   📊 Total de mediciones en la base de datos: {total_measurements}")
        
        if stations.exists():
            station = stations.first()
            print(f"   🔍 Verificando mediciones para: {station.name}")
            
            # Verificar mediciones para diferentes fechas
            test_dates = [
                date(2024, 1, 1),
                date(2024, 1, 2),
                date(2023, 12, 1),
                date(2023, 11, 1)
            ]
            
            for test_date in test_dates:
                measurements = Measurement.objects.filter(
                    device=station,
                    date__date=test_date
                )
                print(f"      📅 {test_date}: {measurements.count()} mediciones")
                
                if measurements.exists():
                    # Verificar estructura de datos
                    sample = measurements.first()
                    print(f"         📊 Estructura de datos: {list(sample.data.keys()) if sample.data else 'Sin datos'}")
                    break
        else:
            print("   ⚠️ No hay estaciones para verificar")
            
    except Exception as e:
        print(f"   ❌ Error verificando mediciones: {e}")
        return False
    
    # 3. Verificar estado actual de indicadores
    print(f"\n3. ESTADO ACTUAL DE INDICADORES:")
    try:
        indicators_count = WeatherStationIndicators.objects.count()
        chart_data_count = WeatherStationChartData.objects.count()
        print(f"   📊 Indicadores existentes: {indicators_count}")
        print(f"   📊 Datos de gráficos existentes: {chart_data_count}")
        
        if indicators_count > 0:
            latest = WeatherStationIndicators.objects.latest('date')
            print(f"   📅 Último indicador: {latest.date} para {latest.device.name}")
            
    except Exception as e:
        print(f"   ❌ Error verificando indicadores: {e}")
        return False
    
    # 4. Verificar rango de fechas disponibles
    print(f"\n4. RANGO DE FECHAS DISPONIBLES:")
    try:
        if stations.exists():
            station = stations.first()
            earliest = Measurement.objects.filter(device=station).earliest('date')
            latest = Measurement.objects.filter(device=station).latest('date')
            
            print(f"   📅 Rango para {station.name}:")
            print(f"      Desde: {earliest.date}")
            print(f"      Hasta: {latest.date}")
            
    except Exception as e:
        print(f"   ❌ Error verificando rango de fechas: {e}")
    
    print(f"\n=== DIAGNÓSTICO COMPLETADO ===")
    return True

if __name__ == "__main__":
    try:
        success = diagnose_weather_data()
        if success:
            print("\n🎉 Diagnóstico completado exitosamente!")
        else:
            print("\n❌ Algunos problemas fueron detectados.")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n⏹️ Diagnóstico interrumpido por el usuario")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error inesperado durante el diagnóstico: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
