#!/usr/bin/env python3
"""
Script para verificar qué datos reales están disponibles en la tabla Measurement
para los medidores eléctricos.
"""

import os
import django
from datetime import datetime, timedelta

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from scada_proxy.models import Device, Measurement, DeviceCategory, Institution
from django.db.models import Q
from django.db import connection

def check_real_data():
    """Verifica qué datos reales están disponibles para los medidores eléctricos."""
    print("🔍 Verificando datos reales de medidores eléctricos...")
    print("=" * 80)
    
    # 1. Verificar categoría de medidores eléctricos
    try:
        electric_category = DeviceCategory.objects.get(name='electricMeter')
        print(f"✅ Categoría encontrada: {electric_category.name} (ID: {electric_category.id})")
    except DeviceCategory.DoesNotExist:
        print("❌ Categoría 'electricMeter' no encontrada")
        return
    
    # 2. Verificar dispositivos
    electric_meters = Device.objects.filter(category=electric_category, is_active=True)
    print(f"📊 Medidores eléctricos activos: {electric_meters.count()}")
    
    if electric_meters.count() == 0:
        print("❌ No hay medidores eléctricos activos")
        return
    
    # 3. Verificar mediciones disponibles
    total_measurements = Measurement.objects.filter(device__in=electric_meters).count()
    print(f"📈 Total de mediciones disponibles: {total_measurements}")
    
    if total_measurements == 0:
        print("❌ No hay mediciones disponibles para los medidores eléctricos")
        return
    
    # 4. Verificar rango de fechas
    latest_measurement = Measurement.objects.filter(device__in=electric_meters).order_by('-date').first()
    earliest_measurement = Measurement.objects.filter(device__in=electric_meters).order_by('date').first()
    
    if latest_measurement and earliest_measurement:
        print(f"📅 Rango de fechas disponible:")
        print(f"   • Más reciente: {latest_measurement.date}")
        print(f"   • Más antigua: {earliest_measurement.date}")
        
        # Calcular días disponibles
        days_available = (latest_measurement.date.date() - earliest_measurement.date.date()).days
        print(f"   • Días disponibles: {days_available}")
    
    # 5. Verificar variables disponibles en los datos JSON
    print(f"\n🔍 Analizando variables disponibles en los datos JSON...")
    
    # Obtener una muestra de mediciones para analizar la estructura
    sample_measurements = Measurement.objects.filter(device__in=electric_meters).order_by('-date')[:5]
    
    all_variables = set()
    for measurement in sample_measurements:
        if measurement.data:
            all_variables.update(measurement.data.keys())
    
    print(f"📋 Variables encontradas en los datos JSON:")
    for var in sorted(all_variables):
        print(f"   • {var}")
    
    # 6. Verificar variables específicas que necesitamos para los indicadores
    required_variables = [
        'importedActivePowerLow', 'importedActivePowerHigh',
        'exportedActivePowerLow', 'exportedActivePowerHigh',
        'totalActivePower', 'maxActivePowerDemand',
        'totalPowerFactor', 'totalReactivePower', 'totalApparentPower',
        'voltagePhaseA', 'voltagePhaseB', 'voltagePhaseC',
        'currentPhaseA', 'currentPhaseB', 'currentPhaseC',
        'voltageTHDPhaseA', 'voltageTHDPhaseB', 'voltageTHDPhaseC',
        'currentTHDPhaseA', 'currentTHDPhaseB', 'currentTHDPhaseC',
        'currentTDDPhaseA', 'currentTDDPhaseB', 'currentTDDPhaseC'
    ]
    
    print(f"\n🎯 Variables requeridas para los indicadores:")
    available_variables = []
    missing_variables = []
    
    for var in required_variables:
        if var in all_variables:
            available_variables.append(var)
            print(f"   ✅ {var}")
        else:
            missing_variables.append(var)
            print(f"   ❌ {var}")
    
    print(f"\n📊 Resumen:")
    print(f"   • Variables disponibles: {len(available_variables)}/{len(required_variables)}")
    print(f"   • Variables faltantes: {len(missing_variables)}")
    
    # 7. Verificar datos de un medidor específico
    if electric_meters.exists():
        sample_device = electric_meters.first()
        print(f"\n🔍 Ejemplo de datos para {sample_device.name}:")
        
        # Obtener mediciones del último día
        yesterday = datetime.now().date() - timedelta(days=1)
        yesterday_measurements = Measurement.objects.filter(
            device=sample_device,
            date__date=yesterday
        ).order_by('date')[:3]
        
        if yesterday_measurements.exists():
            print(f"   📅 Mediciones del {yesterday}: {yesterday_measurements.count()}")
            for i, measurement in enumerate(yesterday_measurements, 1):
                print(f"   {i}. {measurement.date.time()}: {len(measurement.data)} variables")
                # Mostrar algunas variables clave si están disponibles
                if 'importedActivePowerLow' in measurement.data:
                    print(f"      • importedActivePowerLow: {measurement.data['importedActivePowerLow']}")
                if 'totalActivePower' in measurement.data:
                    print(f"      • totalActivePower: {measurement.data['totalActivePower']}")
        else:
            print(f"   ⚠️  No hay mediciones del {yesterday}")
    
    # 8. Verificar si hay datos suficientes para calcular indicadores
    print(f"\n📈 Evaluación para cálculo de indicadores:")
    
    if len(available_variables) >= 10:  # Al menos las variables básicas
        print("   ✅ Datos suficientes para calcular indicadores básicos")
    elif len(available_variables) >= 5:
        print("   ⚠️  Datos limitados, solo se pueden calcular algunos indicadores")
    else:
        print("   ❌ Datos insuficientes para calcular indicadores")
    
    # 9. Sugerir próximos pasos
    print(f"\n🚀 Próximos pasos recomendados:")
    if len(available_variables) > 0:
        print("   1. Crear script para leer datos reales de Measurement")
        print("   2. Implementar cálculos usando las variables disponibles")
        print("   3. Actualizar ElectricMeterIndicators con valores reales")
    else:
        print("   1. Verificar por qué no hay datos en Measurement")
        print("   2. Revisar la sincronización de datos desde SCADA")
        print("   3. Verificar la estructura de los datos JSON")

if __name__ == "__main__":
    check_real_data()
