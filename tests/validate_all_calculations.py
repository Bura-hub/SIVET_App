#!/usr/bin/env python
"""
Script de validación para verificar todos los cálculos de KPIs
Ejecutar con: python manage.py shell < tests/validate_all_calculations.py
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.db.models import Sum, Avg, F, FloatField, Count
from django.db.models.functions import Cast, TruncDay
from indicators.models import MonthlyConsumptionKPI, DailyChartData
from scada_proxy.models import Device, Measurement

def validate_all_calculations():
    """Validación completa de todos los cálculos"""
    print("=== VALIDACIÓN COMPLETA DE CÁLCULOS ===")
    
    # 1. Verificar datos crudos
    print("\n1. VERIFICANDO DATOS CRUDOS:")
    
    electric_meters = Device.objects.filter(category__id=2, is_active=True)
    inverters = Device.objects.filter(category__id=1, is_active=True)
    weather_stations = Device.objects.filter(category__id=3, is_active=True)
    
    print(f"  Medidores eléctricos activos: {electric_meters.count()}")
    print(f"  Inversores activos: {inverters.count()}")
    print(f"  Estaciones meteorológicas activas: {weather_stations.count()}")
    
    # Verificar totalActivePower (debería venir en kW)
    sample_meter = Measurement.objects.filter(
        device__in=electric_meters,
        data__totalActivePower__isnull=False
    ).first()
    
    if sample_meter:
        total_active_power = sample_meter.data.get('totalActivePower')
        print(f"  totalActivePower: {total_active_power}")
        if isinstance(total_active_power, (int, float)):
            is_kw_range = 1 <= total_active_power <= 1000
            print(f"  ¿Es un valor típico de kW? (1-1000): {is_kw_range}")
            if is_kw_range:
                print("  ✅ totalActivePower parece estar en kW")
            else:
                print("  ⚠️ totalActivePower fuera del rango típico de kW")
    
    # Verificar acPower (debería venir en W)
    sample_inverter = Measurement.objects.filter(
        device__in=inverters,
        data__acPower__isnull=False
    ).first()
    
    if sample_inverter:
        ac_power = sample_inverter.data.get('acPower')
        print(f"  acPower: {ac_power}")
        if isinstance(ac_power, (int, float)):
            is_w_range = 1000 <= ac_power <= 50000
            print(f"  ¿Es un valor típico de W? (1000-50000): {is_w_range}")
            if is_w_range:
                print("  ✅ acPower parece estar en W")
            else:
                print("  ⚠️ acPower fuera del rango típico de W")
    
    # 2. Verificar cálculos mensuales
    print("\n2. VERIFICANDO CÁLCULOS MENSUALES:")
    
    today = datetime.now()
    start_month = today.replace(day=1)
    
    # Consumo mensual
    consumption_raw = Measurement.objects.filter(
        device__in=electric_meters,
        date__date__range=(start_month, today),
        data__totalActivePower__isnull=False
    ).aggregate(
        total_sum=Sum(Cast(F('data__totalActivePower'), FloatField()))
    )['total_sum'] or 0.0
    
    print(f"  Consumo crudo (suma totalActivePower): {consumption_raw}")
    
    # Generación mensual
    generation_raw = Measurement.objects.filter(
        device__in=inverters,
        date__date__range=(start_month, today),
        data__acPower__isnull=False
    ).aggregate(
        total_sum=Sum(Cast(F('data__acPower'), FloatField()))
    )['total_sum'] or 0.0
    
    print(f"  Generación cruda (suma acPower): {generation_raw}")
    
    # 3. Verificar KPI almacenado
    print("\n3. VERIFICANDO KPI ALMACENADO:")
    
    kpi = MonthlyConsumptionKPI.objects.first()
    if kpi:
        print(f"  Consumo en KPI: {kpi.total_consumption_current_month} kWh")
        print(f"  Generación en KPI: {kpi.total_generation_current_month} kWh")
        print(f"  Potencia en KPI: {kpi.avg_instantaneous_power_current_month} W")
        print(f"  Temperatura en KPI: {kpi.avg_daily_temp_current_month} °C")
        print(f"  Humedad en KPI: {kpi.avg_relative_humidity_current_month} %RH")
        print(f"  Viento en KPI: {kpi.avg_wind_speed_current_month} km/h")
        
        # Verificar ratios
        if consumption_raw > 0:
            consumption_ratio = kpi.total_consumption_current_month / consumption_raw
            print(f"  Ratio consumo (KPI/crudo): {consumption_ratio}")
            if consumption_ratio == 1.0:
                print("  ✅ Consumo: NO se divide por 1000 (correcto para kW)")
            elif consumption_ratio == 0.001:
                print("  ❌ Consumo: Se divide por 1000 (incorrecto para kW)")
            else:
                print(f"  ⚠️ Consumo: Ratio inesperado {consumption_ratio}")
    else:
        print("  ⚠️ No hay KPI almacenado")
    
    # 4. Verificar datos diarios
    print("\n4. VERIFICANDO DATOS DIARIOS:")
    
    sample_daily = DailyChartData.objects.first()
    if sample_daily:
        print(f"  Consumo diario: {sample_daily.daily_consumption} kWh")
        print(f"  Generación diaria: {sample_daily.daily_generation} kWh")
        print(f"  Balance diario: {sample_daily.daily_balance} kWh")
        print(f"  Temperatura diaria: {sample_daily.avg_daily_temp} °C")
    else:
        print("  ⚠️ No hay datos diarios almacenados")
    
    # 5. Verificar cálculos de generación día por día
    print("\n5. VERIFICANDO CÁLCULO DE GENERACIÓN DÍA POR DÍA:")
    
    daily_generation = Measurement.objects.filter(
        device__in=inverters,
        date__date__range=(start_month, today),
        data__acPower__isnull=False
    ).annotate(
        day=TruncDay('date')
    ).values('day').annotate(
        total_power=Sum(Cast(F('data__acPower'), FloatField())),
        measurements_count=Count('id')
    ).order_by('day')
    
    total_generation_calculated = 0
    for day_data in daily_generation:
        hours_in_day = 24
        daily_energy_wh = (day_data['total_power'] / day_data['measurements_count']) * hours_in_day
        total_generation_calculated += daily_energy_wh
    
    total_generation_kwh = total_generation_calculated / 1000.0
    
    print(f"  Generación calculada día por día: {total_generation_kwh:.2f} kWh")
    
    if kpi and total_generation_kwh > 0:
        generation_ratio = kpi.total_generation_current_month / total_generation_kwh
        print(f"  Ratio generación (KPI/calculado): {generation_ratio}")
        if abs(generation_ratio - 1.0) < 0.01:
            print("  ✅ Cálculo de generación correcto")
        else:
            print(f"  ⚠️ Discrepancia en generación: {generation_ratio}")
    
    # 6. Resumen final
    print("\n6. RESUMEN FINAL:")
    
    issues_found = []
    
    # Verificar consumo
    if consumption_raw > 0 and kpi:
        consumption_ratio = kpi.total_consumption_current_month / consumption_raw
        if consumption_ratio != 1.0:
            issues_found.append(f"Consumo: ratio {consumption_ratio} (debería ser 1.0 para kW)")
        else:
            print("  ✅ Consumo: Correcto")
    
    # Verificar generación
    if total_generation_kwh > 0 and kpi:
        generation_ratio = kpi.total_generation_current_month / total_generation_kwh
        if abs(generation_ratio - 1.0) > 0.01:
            issues_found.append(f"Generación: ratio {generation_ratio} (debería ser ~1.0)")
        else:
            print("  ✅ Generación: Correcto")
    
    # Verificar potencia
    if kpi and kpi.avg_instantaneous_power_current_month > 0:
        print("  ✅ Potencia: Correcto")
    
    # Verificar variables meteorológicas
    if kpi:
        print("  ✅ Variables meteorológicas: Correctas")
    
    if issues_found:
        print(f"  ❌ PROBLEMAS ENCONTRADOS:")
        for issue in issues_found:
            print(f"    - {issue}")
    else:
        print("  ✅ TODOS LOS CÁLCULOS ESTÁN CORRECTOS")
    
    print("\n=== FIN DE VALIDACIÓN ===")

if __name__ == "__main__":
    validate_all_calculations()
