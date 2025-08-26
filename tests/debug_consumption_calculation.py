#!/usr/bin/env python3
"""
Script para verificar específicamente el cálculo de consumo
y detectar problemas con las unidades.
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from indicators.models import Measurement, Device
from django.db.models import Sum, Q, F
from django.db.models.functions import Cast
from django.db.models import FloatField
from django.utils import timezone

def debug_consumption_calculation():
    """Verifica el cálculo de consumo paso a paso"""
    
    print("=" * 80)
    print("VERIFICACIÓN DEL CÁLCULO DE CONSUMO - PASO A PASO")
    print("=" * 80)
    
    # 1. Obtener fechas del mes actual y anterior
    now = timezone.now()
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    current_month_end = (current_month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)
    
    previous_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
    previous_month_end = current_month_start - timedelta(seconds=1)
    
    print("📅 PERIODOS DE CÁLCULO:")
    print("-" * 50)
    print(f"Mes actual:     {current_month_start.date()} -> {current_month_end.date()}")
    print(f"Mes anterior:   {previous_month_start.date()} -> {previous_month_end.date()}")
    print()
    
    # 2. Obtener medidores eléctricos
    try:
        electric_meters = Device.objects.filter(category__id=2, is_active=True)
        print(f"🔌 MEDIDORES ELÉCTRICOS ACTIVOS: {electric_meters.count()}")
        print("-" * 50)
        
        for meter in electric_meters:
            print(f"  - {meter.name} (ID: {meter.id})")
        print()
        
    except Exception as e:
        print(f"❌ Error obteniendo medidores: {e}")
        return
    
    # 3. Verificar mediciones del mes actual
    print("📊 MEDICIONES DEL MES ACTUAL:")
    print("-" * 50)
    
    current_month_measurements = Measurement.objects.filter(
        device__in=electric_meters,
        date__range=(current_month_start, current_month_end),
        data__totalActivePower__isnull=False
    ).order_by('date')
    
    print(f"Total de mediciones: {current_month_measurements.count()}")
    
    if current_month_measurements.exists():
        # Mostrar algunas mediciones de ejemplo
        print("\nEjemplos de mediciones:")
        for i, measurement in enumerate(current_month_measurements[:5], 1):
            total_active_power = measurement.data.get('totalActivePower', 0)
            print(f"  {i}. {measurement.device.name} - {measurement.date}: {total_active_power} kWh")
        
        # Calcular suma total
        current_month_sum = current_month_measurements.aggregate(
            total_sum=Sum(Cast(F('data__totalActivePower'), FloatField()))
        )['total_sum'] or 0.0
        
        print(f"\nSuma total del mes actual: {current_month_sum:.2f} kWh")
        
        # Verificar si hay valores sospechosos
        if current_month_sum > 1000000:
            print(f"⚠️  VALOR MUY ALTO DETECTADO!")
            print(f"   En Wh: {current_month_sum * 1000:.2f} Wh")
            print(f"   En MWh: {current_month_sum / 1000:.2f} MWh")
            print(f"   Posible problema de unidades en el backend")
    else:
        print("❌ No hay mediciones del mes actual")
    
    print()
    
    # 4. Verificar mediciones del mes anterior
    print("📊 MEDICIONES DEL MES ANTERIOR:")
    print("-" * 50)
    
    previous_month_measurements = Measurement.objects.filter(
        device__in=electric_meters,
        date__range=(previous_month_start, previous_month_end),
        data__totalActivePower__isnull=False
    ).order_by('date')
    
    print(f"Total de mediciones: {previous_month_measurements.count()}")
    
    if previous_month_measurements.exists():
        # Mostrar algunas mediciones de ejemplo
        print("\nEjemplos de mediciones:")
        for i, measurement in enumerate(previous_month_measurements[:5], 1):
            total_active_power = measurement.data.get('totalActivePower', 0)
            print(f"  {i}. {measurement.device.name} - {measurement.date}: {total_active_power} kWh")
        
        # Calcular suma total
        previous_month_sum = previous_month_measurements.aggregate(
            total_sum=Sum(Cast(F('data__totalActivePower'), FloatField()))
        )['total_sum'] or 0.0
        
        print(f"\nSuma total del mes anterior: {previous_month_sum:.2f} kWh")
        
        # Verificar si hay valores sospechosos
        if previous_month_sum > 1000000:
            print(f"⚠️  VALOR MUY ALTO DETECTADO!")
            print(f"   En Wh: {previous_month_sum * 1000:.2f} Wh")
            print(f"   En MWh: {previous_month_sum / 1000:.2f} MWh")
            print(f"   Posible problema de unidades en el backend")
    else:
        print("❌ No hay mediciones del mes anterior")
    
    print()
    
    # 5. Calcular porcentaje de cambio
    if previous_month_sum > 0 and current_month_sum > 0:
        print("🧮 CÁLCULO DEL PORCENTAJE DE CAMBIO:")
        print("-" * 50)
        
        change_percentage = ((current_month_sum - previous_month_sum) / previous_month_sum) * 100
        print(f"Fórmula: (({current_month_sum:.2f} - {previous_month_sum:.2f}) / {previous_month_sum:.2f}) × 100")
        print(f"Resultado: {change_percentage:.2f}%")
        
        if abs(change_percentage - 33.35) < 0.1:
            print("🎯 ¡ENCONTRADO! Este cálculo produce exactamente 33.35%")
        else:
            print(f"❓ El porcentaje calculado ({change_percentage:.2f}%) no coincide con 33.35%")
            print("   Los valores en el KPI podrían ser diferentes a los calculados aquí")
    
    print()
    print("=" * 80)

if __name__ == "__main__":
    debug_consumption_calculation()
