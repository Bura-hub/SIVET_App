#!/usr/bin/env python3
"""
Script de diagnóstico para ver los valores exactos que se están usando
para calcular los KPIs en el backend.
"""

import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from indicators.models import MonthlyConsumptionKPI, Measurement, Device
from django.db.models import Sum, Avg, Count, Q, F
from django.db.models.functions import TruncDay, Cast
from django.db.models import FloatField
from django.utils import timezone

def debug_kpi_values():
    """Muestra los valores exactos usados para calcular los KPIs"""
    
    print("=" * 80)
    print("DIAGNÓSTICO DE VALORES KPI - BACKEND")
    print("=" * 80)
    
    # 1. Obtener el registro KPI actual
    try:
        kpi_record = MonthlyConsumptionKPI.objects.first()
        if not kpi_record:
            print("❌ No se encontró registro de KPI mensual")
            return
        print(f"✅ Registro KPI encontrado (ID: {kpi_record.id})")
        print(f"📅 Última actualización: {kpi_record.last_calculated}")
        print()
    except Exception as e:
        print(f"❌ Error obteniendo registro KPI: {e}")
        return
    
    # 2. Mostrar valores almacenados en el KPI
    print("📊 VALORES ALMACENADOS EN EL KPI:")
    print("-" * 50)
    print(f"Consumo mes actual:     {kpi_record.total_consumption_current_month:>15.2f} kWh")
    print(f"Consumo mes anterior:   {kpi_record.total_consumption_previous_month:>15.2f} kWh")
    print(f"Generación mes actual:  {kpi_record.total_generation_current_month:>15.2f} kWh")
    print(f"Generación mes anterior:{kpi_record.total_generation_previous_month:>15.2f} kWh")
    print()
    
    # 3. Calcular el porcentaje de cambio manualmente
    if kpi_record.total_consumption_previous_month > 0:
        consumption_change = ((kpi_record.total_consumption_current_month - kpi_record.total_consumption_previous_month) / kpi_record.total_consumption_previous_month) * 100
        print("🧮 CÁLCULO DEL PORCENTAJE DE CAMBIO:")
        print("-" * 50)
        print(f"Fórmula: (({kpi_record.total_consumption_current_month:.2f} - {kpi_record.total_consumption_previous_month:.2f}) / {kpi_record.total_consumption_previous_month:.2f}) × 100")
        print(f"Resultado: {consumption_change:.2f}%")
        print()
        
        if abs(consumption_change - 33.35) < 0.1:
            print("🎯 ¡ENCONTRADO! Este es el valor que genera el 33.35%")
        else:
            print(f"❓ El porcentaje calculado ({consumption_change:.2f}%) no coincide con 33.35%")
    else:
        print("⚠️  No se puede calcular el porcentaje (valor anterior es 0)")
        print()
    
    # 4. Verificar si hay discrepancias en las unidades
    print("🔍 VERIFICACIÓN DE UNIDADES:")
    print("-" * 50)
    
    # Verificar si hay valores muy grandes (posiblemente en Wh en lugar de kWh)
    if kpi_record.total_consumption_current_month > 1000000:  # Más de 1M kWh
        print(f"⚠️  Consumo actual muy alto: {kpi_record.total_consumption_current_month:.2f} kWh")
        print("   Posiblemente está en Wh en lugar de kWh")
        print(f"   En Wh sería: {kpi_record.total_consumption_current_month * 1000:.2f} Wh")
        print(f"   En MWh sería: {kpi_record.total_consumption_current_month / 1000:.2f} MWh")
    
    if kpi_record.total_consumption_previous_month > 1000000:
        print(f"⚠️  Consumo anterior muy alto: {kpi_record.total_consumption_previous_month:.2f} kWh")
        print("   Posiblemente está en Wh en lugar de kWh")
        print(f"   En Wh sería: {kpi_record.total_consumption_previous_month * 1000:.2f} Wh")
        print(f"   En MWh sería: {kpi_record.total_consumption_previous_month / 1000:.2f} MWh")
    
    print()
    
    # 5. Mostrar algunos registros de medición recientes para verificar
    print("📋 REGISTROS DE MEDICIÓN RECIENTES:")
    print("-" * 50)
    
    try:
        # Obtener medidores eléctricos
        electric_meters = Device.objects.filter(category__id=2, is_active=True)
        print(f"Medidores eléctricos activos: {electric_meters.count()}")
        
        if electric_meters.exists():
            # Mostrar algunas mediciones recientes
            recent_measurements = Measurement.objects.filter(
                device__in=electric_meters,
                data__totalActivePower__isnull=False
            ).order_by('-date')[:5]
            
            print(f"Últimas 5 mediciones con totalActivePower:")
            for i, measurement in enumerate(recent_measurements, 1):
                print(f"  {i}. {measurement.device.name} - {measurement.date}: {measurement.data.get('totalActivePower', 'N/A')} kWh")
        
        print()
        
    except Exception as e:
        print(f"❌ Error obteniendo mediciones: {e}")
        print()
    
    # 6. Resumen
    print("📝 RESUMEN:")
    print("-" * 50)
    print("Para encontrar el origen del 33.35%, verifica:")
    print("1. Los valores mostrados arriba en 'VALORES ALMACENADOS'")
    print("2. Si hay discrepancias de unidades (Wh vs kWh vs MWh)")
    print("3. Si los valores coinciden con lo que esperas ver")
    print()
    print("=" * 80)

if __name__ == "__main__":
    debug_kpi_values()
