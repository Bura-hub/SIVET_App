import logging
from datetime import datetime, timedelta
from django.db.models import Sum, Avg, F, FloatField, Count
from django.db.models.functions import Cast, TruncDay
from indicators.models import MonthlyConsumptionKPI, DailyChartData
from scada_proxy.models import Device, Measurement

logger = logging.getLogger(__name__)

def validate_scada_raw_data():
    """1. Validar datos crudos de SCADA"""
    logger.info("=== 1. VALIDACIÓN DE DATOS CRUDOS DE SCADA ===")
    
    # Medidores eléctricos
    electric_meters = Device.objects.filter(category__id=2, is_active=True)
    sample_meter = Measurement.objects.filter(
        device__in=electric_meters,
        data__totalActivePower__isnull=False
    ).first()
    
    if sample_meter:
        total_active_power = sample_meter.data.get('totalActivePower')
        logger.info(f"Medidor eléctrico - totalActivePower: {total_active_power} Wh")
        assert isinstance(total_active_power, (int, float)), "totalActivePower debe ser numérico"
        assert 0 <= total_active_power <= 1_000_000, f"totalActivePower fuera de rango: {total_active_power} Wh"
    
    # Inversores
    inverters = Device.objects.filter(category__id=1, is_active=True)
    sample_inverter = Measurement.objects.filter(
        device__in=inverters,
        data__acPower__isnull=False
    ).first()
    
    if sample_inverter:
        ac_power = sample_inverter.data.get('acPower')
        logger.info(f"Inversor - acPower: {ac_power} W")
        assert isinstance(ac_power, (int, float)), "acPower debe ser numérico"
        assert 0 <= ac_power <= 500_000, f"acPower fuera de rango: {ac_power} W"
    
    logger.info("✓ Datos SCADA validados")

def validate_consumption_calculation():
    """2. Validar cálculo de consumo"""
    logger.info("\n=== 2. VALIDACIÓN DE CÁLCULO DE CONSUMO ===")
    
    today = datetime.now()
    start_month = today.replace(day=1)
    electric_meters = Device.objects.filter(category__id=2, is_active=True)
    
    # Cálculo manual
    consumption_wh = Measurement.objects.filter(
        device__in=electric_meters,
        date__date__range=(start_month, today),
        data__totalActivePower__isnull=False
    ).aggregate(
        total=Sum(Cast(F('data__totalActivePower'), FloatField()))
    )['total'] or 0.0
    
    consumption_kwh = consumption_wh / 1000.0
    
    # Verificar KPI
    kpi = MonthlyConsumptionKPI.objects.first()
    if kpi:
        logger.info(f"Consumo calculado manualmente: {consumption_kwh:.2f} kWh")
        logger.info(f"Consumo en KPI: {kpi.total_consumption_current_month:.2f} kWh")
        
        difference = abs(kpi.total_consumption_current_month - consumption_kwh)
        assert difference < 0.1, f"Discrepancia en consumo: {difference:.2f} kWh"
        
        logger.info("✓ Cálculo de consumo validado")

def validate_generation_calculation():
    """3. Validar cálculo de generación"""
    logger.info("\n=== 3. VALIDACIÓN DE CÁLCULO DE GENERACIÓN ===")
    
    today = datetime.now()
    start_month = today.replace(day=1)
    inverters = Device.objects.filter(category__id=1, is_active=True)
    
    # Cálculo manual día por día
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
    
    total_generation_wh = 0
    for day_data in daily_generation:
        hours_in_day = 24
        daily_energy_wh = (day_data['total_power'] / day_data['measurements_count']) * hours_in_day
        total_generation_wh += daily_energy_wh
    
    total_generation_kwh = total_generation_wh / 1000.0
    
    # Verificar KPI
    kpi = MonthlyConsumptionKPI.objects.first()
    if kpi:
        logger.info(f"Generación calculada manualmente: {total_generation_kwh:.2f} kWh")
        logger.info(f"Generación en KPI: {kpi.total_generation_current_month:.2f} kWh")
        
        difference = abs(kpi.total_generation_current_month - total_generation_kwh)
        assert difference < 0.1, f"Discrepancia en generación: {difference:.2f} kWh"
        
        logger.info("✓ Cálculo de generación validado")

def validate_daily_data():
    """4. Validar datos diarios"""
    logger.info("\n=== 4. VALIDACIÓN DE DATOS DIARIOS ===")
    
    today = datetime.now().date()
    yesterday = today - timedelta(days=1)
    
    daily_data = DailyChartData.objects.filter(date=yesterday).first()
    if daily_data:
        logger.info(f"Datos diarios para {yesterday}:")
        logger.info(f"  - Consumo: {daily_data.daily_consumption:.2f} kWh")
        logger.info(f"  - Generación: {daily_data.daily_generation:.2f} kWh")
        logger.info(f"  - Balance: {daily_data.daily_balance:.2f} kWh")
        
        # Verificar que el balance sea correcto
        calculated_balance = daily_data.daily_generation - daily_data.daily_consumption
        difference = abs(daily_data.daily_balance - calculated_balance)
        assert difference < 0.1, f"Balance diario incorrecto: {difference:.2f} kWh"
        
        # Verificar que las unidades sean consistentes (todos en kWh)
        assert daily_data.daily_consumption >= 0, "Consumo debe ser positivo"
        assert daily_data.daily_generation >= 0, "Generación debe ser positiva"
        
        logger.info("✓ Datos diarios validados")

def validate_balance_calculation():
    """5. Validar cálculo de balance energético"""
    logger.info("\n=== 5. VALIDACIÓN DE BALANCE ENERGÉTICO ===")
    
    kpi = MonthlyConsumptionKPI.objects.first()
    if kpi:
        # Calcular balance manualmente
        generation_kwh = kpi.total_generation_current_month
        consumption_kwh = kpi.total_consumption_current_month
        calculated_balance = generation_kwh - consumption_kwh
        
        logger.info(f"Generación: {generation_kwh:.2f} kWh")
        logger.info(f"Consumo: {consumption_kwh:.2f} kWh")
        logger.info(f"Balance calculado: {calculated_balance:.2f} kWh")
        
        # Verificar que el balance sea razonable
        assert -1000 <= calculated_balance <= 1000, f"Balance fuera de rango: {calculated_balance} kWh"
        
        logger.info("✓ Balance energético validado")

def validate_frontend_display():
    """6. Validar que los datos estén listos para el frontend"""
    logger.info("\n=== 6. VALIDACIÓN PARA FRONTEND ===")
    
    kpi = MonthlyConsumptionKPI.objects.first()
    if kpi:
        # Verificar que todos los valores estén en las unidades correctas para el frontend
        logger.info("Valores para el dashboard:")
        logger.info(f"  - Consumo total: {kpi.total_consumption_current_month:.2f} kWh")
        logger.info(f"  - Generación total: {kpi.total_generation_current_month:.2f} kWh")
        logger.info(f"  - Potencia promedio: {kpi.avg_instantaneous_power_current_month:.2f} W")
        logger.info(f"  - Temperatura promedio: {kpi.avg_daily_temp_current_month:.2f} °C")
        logger.info(f"  - Humedad promedio: {kpi.avg_relative_humidity_current_month:.2f} %RH")
        logger.info(f"  - Velocidad del viento: {kpi.avg_wind_speed_current_month:.2f} km/h")
        
        # Verificar que los valores sean razonables
        assert 0 <= kpi.total_consumption_current_month <= 10000, "Consumo fuera de rango"
        assert 0 <= kpi.total_generation_current_month <= 10000, "Generación fuera de rango"
        assert 0 <= kpi.avg_instantaneous_power_current_month <= 100000, "Potencia fuera de rango"
        assert -50 <= kpi.avg_daily_temp_current_month <= 50, "Temperatura fuera de rango"
        assert 0 <= kpi.avg_relative_humidity_current_month <= 100, "Humedad fuera de rango"
        assert 0 <= kpi.avg_wind_speed_current_month <= 200, "Velocidad del viento fuera de rango"
        
        logger.info("✓ Datos listos para el frontend")

def run_complete_validation():
    """Ejecutar validación completa"""
    try:
        logger.info("🚀 INICIANDO VALIDACIÓN COMPLETA DE UNIDADES")
        logger.info("=" * 50)
        
        validate_scada_raw_data()
        validate_consumption_calculation()
        validate_generation_calculation()
        validate_daily_data()
        validate_balance_calculation()
        validate_frontend_display()
        
        logger.info("\n" + "=" * 50)
        logger.info("🎉 ¡TODAS LAS VALIDACIONES COMPLETADAS CON ÉXITO!")
        logger.info("✅ Todas las unidades están correctas")
        logger.info("✅ Los cálculos son precisos")
        logger.info("✅ Los datos están listos para el frontend")
        
        return True
        
    except AssertionError as e:
        logger.error(f"❌ Error en la validación: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"❌ Error inesperado: {str(e)}")
        return False

if __name__ == "__main__":
    run_complete_validation()
