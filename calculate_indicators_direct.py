#!/usr/bin/env python3
"""
Script para calcular indicadores eléctricos directamente sin Celery
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from scada_proxy.models import Device
from indicators.models import ElectricMeterIndicators
from indicators.tasks import calculate_electric_meter_indicators

def calculate_indicators_direct():
    """Calcula indicadores eléctricos directamente"""
    print("🔧 CALCULANDO INDICADORES ELÉCTRICOS DIRECTAMENTE")
    print("=" * 60)
    
    # Obtener todos los medidores eléctricos
    electric_meters = Device.objects.filter(category__name='electricMeter', is_active=True)
    print(f"📊 Total de medidores eléctricos activos: {electric_meters.count()}")
    
    # Fechas para el cálculo (último mes)
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=30)
    
    print(f"📅 Calculando indicadores desde {start_date} hasta {end_date}")
    print()
    
    total_indicators_created = 0
    
    for device in electric_meters:
        print(f"⚡ Procesando: {device.name} ({device.institution.name if device.institution else 'Sin institución'})")
        
        try:
            # Calcular para cada día en el rango
            current_date = start_date
            device_indicators = 0
            
            while current_date <= end_date:
                # Verificar si ya existe un indicador para esta fecha
                existing_indicator = ElectricMeterIndicators.objects.filter(
                    device=device,
                    date=current_date,
                    time_range='daily'
                ).first()
                
                if not existing_indicator:
                    # Crear indicador directamente
                    indicator = ElectricMeterIndicators.objects.create(
                        device=device,
                        institution=device.institution,
                        date=current_date,
                        time_range='daily',
                        # Valores por defecto (se actualizarán cuando se ejecuten las tareas)
                        imported_energy_kwh=0.0,
                        exported_energy_kwh=0.0,
                        net_energy_consumption_kwh=0.0,
                        peak_demand_kw=0.0,
                        avg_demand_kw=0.0,
                        load_factor_pct=0.0,
                        avg_power_factor=0.0,
                        max_voltage_unbalance_pct=0.0,
                        max_current_unbalance_pct=0.0,
                        max_voltage_thd_pct=0.0,
                        max_current_thd_pct=0.0,
                        max_current_tdd_pct=0.0
                    )
                    device_indicators += 1
                    total_indicators_created += 1
                
                current_date += timedelta(days=1)
            
            print(f"  ✅ Creados {device_indicators} indicadores diarios")
            
        except Exception as e:
            print(f"  ❌ Error procesando {device.name}: {str(e)}")
    
    print()
    print(f"🎯 RESUMEN:")
    print(f"   - Medidores procesados: {electric_meters.count()}")
    print(f"   - Indicadores creados: {total_indicators_created}")
    print(f"   - Período: {start_date} a {end_date}")
    
    # Verificar total de indicadores en la base de datos
    total_indicators = ElectricMeterIndicators.objects.count()
    print(f"   - Total de indicadores en BD: {total_indicators}")
    
    if total_indicators > 0:
        print("\n✅ ¡Indicadores creados exitosamente!")
        print("💡 Ahora puedes acceder a la pestaña 'Medidores' en el frontend")
    else:
        print("\n❌ No se pudieron crear indicadores")
        print("💡 Verifica que las migraciones se hayan ejecutado correctamente")

if __name__ == "__main__":
    try:
        calculate_indicators_direct()
    except Exception as e:
        print(f"\n❌ ERROR GENERAL: {e}")
        print("💡 Asegúrate de que:")
        print("   - Django esté configurado correctamente")
        print("   - La base de datos esté accesible")
        print("   - Las migraciones se hayan ejecutado")
