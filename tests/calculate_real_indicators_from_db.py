#!/usr/bin/env python3
"""
Script para calcular indicadores eléctricos REALES desde la base de datos PostgreSQL.
Lee datos de la tabla Measurement y calcula indicadores usando las fórmulas definidas.
"""

import os
import django
from datetime import datetime, timedelta, date
from decimal import Decimal, ROUND_HALF_UP
import math

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from scada_proxy.models import Device, Measurement, DeviceCategory, Institution
from indicators.models import ElectricMeterIndicators
from django.db.models import Q, Max, Min, Avg, Sum, F, FloatField
from django.db.models.functions import Cast
from django.utils import timezone
from django.db import transaction

def safe_float(value, default=0.0):
    """Convierte un valor a float de forma segura."""
    if value is None:
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default

def calculate_energy_consumption(measurements, start_time, end_time):
    """
    Calcula la energía consumida acumulada (kWh) usando la metodología definida.
    
    Energía Diaria = (importedActivePowerHigh_fin * 1000 + importedActivePowerLow_fin) - 
                     (importedActivePowerHigh_inicio * 1000 + importedActivePowerLow_inicio)
    """
    if not measurements:
        return 0.0, 0.0, 0.0
    
    # Obtener primera y última medición del período
    first_measurement = measurements.filter(date__gte=start_time, date__lte=end_time).order_by('date').first()
    last_measurement = measurements.filter(date__gte=start_time, date__lte=end_time).order_by('date').last()
    
    if not first_measurement or not last_measurement:
        return 0.0, 0.0, 0.0
    
    # Calcular energía importada
    first_imported = (
        safe_float(first_measurement.data.get('importedActivePowerHigh', 0)) * 1000 +
        safe_float(first_measurement.data.get('importedActivePowerLow', 0))
    )
    
    last_imported = (
        safe_float(last_measurement.data.get('importedActivePowerHigh', 0)) * 1000 +
        safe_float(last_measurement.data.get('importedActivePowerLow', 0))
    )
    
    imported_energy = max(0, last_imported - first_imported)
    
    # Calcular energía exportada
    first_exported = (
        safe_float(first_measurement.data.get('exportedActivePowerHigh', 0)) * 1000 +
        safe_float(first_measurement.data.get('exportedActivePowerLow', 0))
    )
    
    last_exported = (
        safe_float(last_measurement.data.get('exportedActivePowerHigh', 0)) * 1000 +
        safe_float(last_measurement.data.get('exportedActivePowerLow', 0))
    )
    
    exported_energy = max(0, last_exported - first_exported)
    
    # Energía neta
    net_energy = imported_energy - exported_energy
    
    return imported_energy, exported_energy, net_energy

def calculate_peak_demand(measurements, start_time, end_time):
    """
    Calcula la demanda pico (kW) usando maxActivePowerDemand del medidor.
    """
    if not measurements:
        return 0.0
    
        # Obtener el valor máximo de maxActivePowerDemand en el período
    peak_demand = measurements.filter(
        date__gte=start_time,
        date__lte=end_time,
        data__maxActivePowerDemand__isnull=False
    ).aggregate(
        max_demand=Max(Cast(F('data__maxActivePowerDemand'), FloatField()))
    )['max_demand']
    
    return safe_float(peak_demand)

def calculate_average_demand(measurements, start_time, end_time):
    """
    Calcula la demanda promedio (kW) usando totalActivePower.
    """
    if not measurements:
        return 0.0
    
        # Obtener el promedio de totalActivePower en el período
    avg_demand = measurements.filter(
        date__gte=start_time,
        date__lte=end_time,
        data__totalActivePower__isnull=False
    ).aggregate(
        avg_demand=Avg(Cast(F('data__totalActivePower'), FloatField()))
    )['avg_demand']
    
    return safe_float(avg_demand)

def calculate_load_factor(imported_energy, peak_demand, hours):
    """
    Calcula el factor de carga (%).
    
    Factor de Carga = (Energía Importada / (Demanda Pico × Horas)) × 100%
    """
    if peak_demand <= 0 or hours <= 0:
        return 0.0
    
    load_factor = (imported_energy / (peak_demand * hours)) * 100
    return min(100.0, max(0.0, load_factor))

def calculate_power_factor(measurements, start_time, end_time):
    """
    Calcula el factor de potencia promedio usando totalPowerFactor.
    """
    if not measurements:
        return 0.0
    
        # Obtener el promedio de totalPowerFactor en el período
    avg_power_factor = measurements.filter(
        date__gte=start_time,
        date__lte=end_time,
        data__totalPowerFactor__isnull=False
    ).aggregate(
        avg_pf=Avg(Cast(F('data__totalPowerFactor'), FloatField()))
    )['avg_pf']
    
    return safe_float(avg_power_factor)

def calculate_phase_unbalance(measurements, start_time, end_time, variable_type='voltage'):
    """
    Calcula el desbalance de fases para tensión o corriente (%).
    
    Desbalance = (Desviación Máxima / Promedio) × 100%
    """
    if not measurements:
        return 0.0
    
    max_unbalance = 0.0
    
    # Obtener mediciones del período
    period_measurements = measurements.filter(
        date__gte=start_time, 
        date__lte=end_time
    ).order_by('date')
    
    for measurement in period_measurements:
        if variable_type == 'voltage':
            phase_a = safe_float(measurement.data.get('voltagePhaseA', 0))
            phase_b = safe_float(measurement.data.get('voltagePhaseB', 0))
            phase_c = safe_float(measurement.data.get('voltagePhaseC', 0))
        else:  # current
            phase_a = safe_float(measurement.data.get('currentPhaseA', 0))
            phase_b = safe_float(measurement.data.get('currentPhaseB', 0))
            phase_c = safe_float(measurement.data.get('currentPhaseC', 0))
        
        if phase_a > 0 and phase_b > 0 and phase_c > 0:
            # Calcular promedio
            average = (phase_a + phase_b + phase_c) / 3
            
            # Calcular desviación máxima
            max_deviation = max(
                abs(phase_a - average),
                abs(phase_b - average),
                abs(phase_c - average)
            )
            
            # Calcular porcentaje de desbalance
            if average > 0:
                unbalance_pct = (max_deviation / average) * 100
                max_unbalance = max(max_unbalance, unbalance_pct)
    
    return max_unbalance

def calculate_thd_tdd(measurements, start_time, end_time, variable_type='voltage'):
    """
    Calcula THD y TDD máximo para tensión o corriente (%).
    """
    if not measurements:
        return 0.0, 0.0
    
    max_thd = 0.0
    max_tdd = 0.0
    
    # Obtener mediciones del período
    period_measurements = measurements.filter(
        date__gte=start_time, 
        date__lte=end_time
    ).order_by('date')
    
    for measurement in period_measurements:
        if variable_type == 'voltage':
            # THD de tensión
            thd_a = safe_float(measurement.data.get('voltageTHDPhaseA', 0))
            thd_b = safe_float(measurement.data.get('voltageTHDPhaseB', 0))
            thd_c = safe_float(measurement.data.get('voltageTHDPhaseC', 0))
            max_thd = max(max_thd, thd_a, thd_b, thd_c)
        else:  # current
            # THD de corriente
            thd_a = safe_float(measurement.data.get('currentTHDPhaseA', 0))
            thd_b = safe_float(measurement.data.get('currentTHDPhaseB', 0))
            thd_c = safe_float(measurement.data.get('currentTHDPhaseC', 0))
            max_thd = max(max_thd, thd_a, thd_b, thd_c)
            
            # TDD de corriente
            tdd_a = safe_float(measurement.data.get('currentTDDPhaseA', 0))
            tdd_b = safe_float(measurement.data.get('currentTDDPhaseB', 0))
            tdd_c = safe_float(measurement.data.get('currentTDDPhaseC', 0))
            max_tdd = max(max_tdd, tdd_a, tdd_b, tdd_c)
    
    return max_thd, max_tdd

def calculate_daily_indicators(device, target_date):
    """
    Calcula indicadores diarios para un dispositivo en una fecha específica.
    """
    print(f"   📅 Calculando indicadores diarios para {device.name} - {target_date}")
    
    # Definir período del día (00:00:00 a 23:59:59)
    start_time = datetime.combine(target_date, datetime.min.time())
    end_time = datetime.combine(target_date, datetime.max.time())
    
    # Obtener mediciones del día
    measurements = Measurement.objects.filter(
        device=device,
        date__date=target_date
    )
    
    if not measurements.exists():
        print(f"      ⚠️  No hay mediciones para {target_date}")
        return None
    
    # Calcular indicadores
    imported_energy, exported_energy, net_energy = calculate_energy_consumption(
        measurements, start_time, end_time
    )
    
    peak_demand = calculate_peak_demand(measurements, start_time, end_time)
    avg_demand = calculate_average_demand(measurements, start_time, end_time)
    
    # Factor de carga (24 horas)
    load_factor = calculate_load_factor(imported_energy, peak_demand, 24)
    
    # Factor de potencia promedio
    avg_power_factor = calculate_power_factor(measurements, start_time, end_time)
    
    # Desbalance de fases
    voltage_unbalance = calculate_phase_unbalance(measurements, start_time, end_time, 'voltage')
    current_unbalance = calculate_phase_unbalance(measurements, start_time, end_time, 'current')
    
    # THD y TDD
    voltage_thd, _ = calculate_thd_tdd(measurements, start_time, end_time, 'voltage')
    current_thd, current_tdd = calculate_thd_tdd(measurements, start_time, end_time, 'current')
    
    # Crear o actualizar indicador diario
    daily_indicator, created = ElectricMeterIndicators.objects.update_or_create(
        device=device,
        date=target_date,
        time_range='daily',
        defaults={
            'institution': device.institution,
            'imported_energy_kwh': round(imported_energy, 3),
            'exported_energy_kwh': round(exported_energy, 3),
            'net_energy_consumption_kwh': round(net_energy, 3),
            'peak_demand_kw': round(peak_demand, 3),
            'avg_demand_kw': round(avg_demand, 3),
            'load_factor_pct': round(load_factor, 2),
            'avg_power_factor': round(avg_power_factor, 3),
            'max_voltage_unbalance_pct': round(voltage_unbalance, 2),
            'max_current_unbalance_pct': round(current_unbalance, 2),
            'max_voltage_thd_pct': round(voltage_thd, 2),
            'max_current_thd_pct': round(current_thd, 2),
            'max_current_tdd_pct': round(current_tdd, 2),
        }
    )
    
    status = "creado" if created else "actualizado"
    print(f"      ✅ Indicador diario {status}: {imported_energy:.3f} kWh importada, {peak_demand:.3f} kW pico")
    
    return daily_indicator

def calculate_monthly_indicators(device, year, month):
    """
    Calcula indicadores mensuales para un dispositivo en un mes específico.
    """
    print(f"   📅 Calculando indicadores mensuales para {device.name} - {year}/{month:02d}")
    
    # Definir período del mes
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
    
    # Obtener indicadores diarios del mes
    daily_indicators = ElectricMeterIndicators.objects.filter(
        device=device,
        date__year=year,
        date__month=month,
        time_range='daily'
    )
    
    if not daily_indicators.exists():
        print(f"      ⚠️  No hay indicadores diarios para {year}/{month:02d}")
        return None
    
    # Agregar indicadores diarios para obtener valores mensuales
    monthly_data = daily_indicators.aggregate(
        total_imported_energy=Sum('imported_energy_kwh'),
        total_exported_energy=Sum('exported_energy_kwh'),
        total_net_energy=Sum('net_energy_consumption_kwh'),
        max_peak_demand=Max('peak_demand_kw'),
        avg_demand=Avg('avg_demand_kw'),
        max_voltage_unbalance=Max('max_voltage_unbalance_pct'),
        max_current_unbalance=Max('max_current_unbalance_pct'),
        max_voltage_thd=Max('max_voltage_thd_pct'),
        max_current_thd=Max('max_current_thd_pct'),
        max_current_tdd=Max('max_current_tdd_pct'),
    )
    
    # Calcular factor de carga mensual
    total_hours = end_date.day * 24
    load_factor = calculate_load_factor(
        monthly_data['total_imported_energy'] or 0,
        monthly_data['max_peak_demand'] or 0,
        total_hours
    )
    
    # Factor de potencia promedio mensual
    avg_power_factor = daily_indicators.aggregate(
        avg_pf=Avg('avg_power_factor')
    )['avg_pf'] or 0
    
    # Crear o actualizar indicador mensual
    monthly_indicator, created = ElectricMeterIndicators.objects.update_or_create(
        device=device,
        date=start_date,
        time_range='monthly',
        defaults={
            'institution': device.institution,
            'imported_energy_kwh': round(monthly_data['total_imported_energy'] or 0, 3),
            'exported_energy_kwh': round(monthly_data['total_exported_energy'] or 0, 3),
            'net_energy_consumption_kwh': round(monthly_data['total_net_energy'] or 0, 3),
            'peak_demand_kw': round(monthly_data['max_peak_demand'] or 0, 3),
            'avg_demand_kw': round(monthly_data['avg_demand'] or 0, 3),
            'load_factor_pct': round(load_factor, 2),
            'avg_power_factor': round(avg_power_factor, 3),
            'max_voltage_unbalance_pct': round(monthly_data['max_voltage_unbalance'] or 0, 2),
            'max_current_unbalance_pct': round(monthly_data['max_current_unbalance'] or 0, 2),
            'max_voltage_thd_pct': round(monthly_data['max_voltage_thd'] or 0, 2),
            'max_current_thd_pct': round(monthly_data['max_current_thd'] or 0, 2),
            'max_current_tdd_pct': round(monthly_data['max_current_tdd'] or 0, 2),
        }
    )
    
    status = "creado" if created else "actualizado"
    print(f"      ✅ Indicador mensual {status}: {monthly_data['total_imported_energy']:.3f} kWh total, {monthly_data['max_peak_demand']:.3f} kW pico")
    
    return monthly_indicator

def main():
    """Función principal para calcular indicadores eléctricos reales."""
    print("🚀 Iniciando cálculo de indicadores eléctricos REALES desde PostgreSQL...")
    print("=" * 80)
    
    try:
        # 1. Obtener categoría de medidores eléctricos
        electric_category = DeviceCategory.objects.get(name='electricMeter')
        print(f"✅ Categoría encontrada: {electric_category.name} (ID: {electric_category.id})")
        
        # 2. Obtener todos los medidores eléctricos activos
        electric_meters = Device.objects.filter(
            category=electric_category, 
            is_active=True
        ).order_by('institution__name', 'name')
        
        print(f"📊 Medidores eléctricos activos: {electric_meters.count()}")
        
        if electric_meters.count() == 0:
            print("❌ No hay medidores eléctricos activos")
            return
        
        # 3. Verificar datos disponibles
        total_measurements = Measurement.objects.filter(device__in=electric_meters).count()
        print(f"📈 Total de mediciones disponibles: {total_measurements:,}")
        
        if total_measurements == 0:
            print("❌ No hay mediciones disponibles")
            return
        
        # 4. Obtener rango de fechas disponible
        latest_measurement = Measurement.objects.filter(
            device__in=electric_meters
        ).order_by('-date').first()
        
        earliest_measurement = Measurement.objects.filter(
            device__in=electric_meters
        ).order_by('date').first()
        
        if not latest_measurement or not earliest_measurement:
            print("❌ No se pueden determinar fechas de mediciones")
            return
        
        start_date = earliest_measurement.date.date()
        end_date = latest_measurement.date.date()
        
        print(f"📅 Rango de fechas disponible: {start_date} a {end_date}")
        
        # 5. Calcular indicadores diarios para cada medidor
        print(f"\n📊 Calculando indicadores diarios...")
        daily_created = 0
        daily_updated = 0
        
        for device in electric_meters:
            print(f"\n🔌 Procesando {device.name} ({device.institution.name})")
            
            # Calcular indicadores para cada día en el rango
            current_date = start_date
            while current_date <= end_date:
                try:
                    daily_indicator = calculate_daily_indicators(device, current_date)
                    if daily_indicator:
                        if daily_indicator.pk:  # Ya existía
                            daily_updated += 1
                        else:  # Nuevo
                            daily_created += 1
                except Exception as e:
                    print(f"      ❌ Error calculando indicadores para {current_date}: {e}")
                
                current_date += timedelta(days=1)
        
        print(f"\n📈 Indicadores diarios procesados:")
        print(f"   • Creados: {daily_created}")
        print(f"   • Actualizados: {daily_updated}")
        
        # 6. Calcular indicadores mensuales
        print(f"\n📅 Calculando indicadores mensuales...")
        monthly_created = 0
        monthly_updated = 0
        
        for device in electric_meters:
            print(f"\n🔌 Procesando {device.name} ({device.institution.name})")
            
            # Calcular indicadores para cada mes en el rango
            current_year = start_date.year
            current_month = start_date.month
            
            while (current_year < end_date.year) or (
                current_year == end_date.year and current_month <= end_date.month
            ):
                try:
                    monthly_indicator = calculate_monthly_indicators(device, current_year, current_month)
                    if monthly_indicator:
                        if monthly_indicator.pk:  # Ya existía
                            monthly_updated += 1
                        else:  # Nuevo
                            monthly_created += 1
                except Exception as e:
                    print(f"      ❌ Error calculando indicadores mensuales para {current_year}/{current_month:02d}: {e}")
                
                # Avanzar al siguiente mes
                current_month += 1
                if current_month > 12:
                    current_month = 1
                    current_year += 1
        
        print(f"\n📈 Indicadores mensuales procesados:")
        print(f"   • Creados: {monthly_created}")
        print(f"   • Actualizados: {monthly_updated}")
        
        # 7. Resumen final
        print(f"\n" + "=" * 80)
        print("✅ PROCESO COMPLETADO EXITOSAMENTE!")
        print(f"\n📊 Resumen de indicadores:")
        print(f"   • Indicadores diarios: {daily_created + daily_updated}")
        print(f"   • Indicadores mensuales: {monthly_created + monthly_updated}")
        print(f"   • Total: {daily_created + daily_updated + monthly_created + monthly_updated}")
        
        print(f"\n🎯 Los indicadores ahora contienen valores REALES calculados desde PostgreSQL:")
        print(f"   • Energía importada/exportada/net (kWh)")
        print(f"   • Demanda pico y promedio (kW)")
        print(f"   • Factor de carga (%)")
        print(f"   • Factor de potencia promedio")
        print(f"   • Desbalance de fases (tensión y corriente) (%)")
        print(f"   • THD y TDD máximo (%)")
        
        print(f"\n🚀 Próximo paso: Verificar que el frontend muestre estos valores reales")
        
    except Exception as e:
        print(f"❌ Error en el proceso principal: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
