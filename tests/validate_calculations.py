import logging
from datetime import datetime, timedelta
from django.db.models import Sum, Avg, F, FloatField
from django.db.models.functions import Cast
from indicators.models import MonthlyConsumptionKPI, DailyChartData
from scada_proxy.models import Device, Measurement

logger = logging.getLogger(__name__)


def validate_scada_data():
    """Valida los datos crudos que vienen de SCADA"""
    # 1. Verificar datos de medidores eléctricos
    electric_meters = Device.objects.filter(category__id=2, is_active=True)
    sample_measurement = Measurement.objects.filter(
        device__in=electric_meters,
        data__totalActivePower__isnull=False
    ).first()
    
    if sample_measurement:
        logger.info(f"Muestra de medidor eléctrico:")
        logger.info(f"- totalActivePower: {sample_measurement.data.get('totalActivePower')} Wh")
        # Verificar que el valor sea razonable (entre 0 y 1,000,000 Wh)
        power_value = float(sample_measurement.data.get('totalActivePower', 0))
        assert 0 <= power_value <= 1_000_000, f"Valor de potencia fuera de rango: {power_value} Wh"

    # 2. Verificar datos de inversores
    inverters = Device.objects.filter(category__id=1, is_active=True)
    sample_inverter = Measurement.objects.filter(
        device__in=inverters,
        data__acPower__isnull=False
    ).first()
    
    if sample_inverter:
        logger.info(f"Muestra de inversor:")
        logger.info(f"- acPower: {sample_inverter.data.get('acPower')} W")
        # Verificar que el valor sea razonable (entre 0 y 500,000 W)
        power_value = float(sample_inverter.data.get('acPower', 0))
        assert 0 <= power_value <= 500_000, f"Valor de potencia AC fuera de rango: {power_value} W"

def validate_consumption_calculations():
    """Valida los cálculos de consumo"""
    today = datetime.now()
    start_month = today.replace(day=1)
    
    # 1. Verificar cálculo de consumo total
    electric_meters = Device.objects.filter(category__id=2, is_active=True)
    consumption_wh = Measurement.objects.filter(
        device__in=electric_meters,
        date__date__range=(start_month, today),
        data__totalActivePower__isnull=False
    ).aggregate(
        total=Sum(Cast(F('data__totalActivePower'), FloatField()))
    )['total'] or 0.0
    
    consumption_kwh = consumption_wh / 1000.0
    
    # Verificar contra el KPI almacenado
    kpi = MonthlyConsumptionKPI.objects.first()
    if kpi:
        assert abs(kpi.total_consumption_current_month - consumption_kwh) < 0.1, \
            f"Discrepancia en consumo: KPI={kpi.total_consumption_current_month}kWh vs Calculado={consumption_kwh}kWh"

def validate_generation_calculations():
    """Valida los cálculos de generación"""
    today = datetime.now()
    start_month = today.replace(day=1)
    
    # 1. Verificar cálculo de generación total
    inverters = Device.objects.filter(category__id=1, is_active=True)
    generation_w = Measurement.objects.filter(
        device__in=inverters,
        date__date__range=(start_month, today),
        data__acPower__isnull=False
    ).aggregate(
        avg_power=Avg(Cast(F('data__acPower'), FloatField()))
    )['avg_power'] or 0.0
    
    # Convertir de W a kWh
    hours = (today - start_month).total_seconds() / 3600
    generation_kwh = (generation_w * hours) / 1000.0
    
    # Verificar contra el KPI almacenado
    kpi = MonthlyConsumptionKPI.objects.first()
    if kpi:
        assert abs(kpi.total_generation_current_month - generation_kwh) < 0.1, \
            f"Discrepancia en generación: KPI={kpi.total_generation_current_month}kWh vs Calculado={generation_kwh}kWh"

def validate_daily_data():
    """Valida los datos diarios"""
    today = datetime.now().date()
    yesterday = today - timedelta(days=1)
    
    daily_data = DailyChartData.objects.filter(date=yesterday).first()
    if daily_data:
        # Verificar que el balance sea correcto
        calculated_balance = daily_data.daily_generation - daily_data.daily_consumption
        assert abs(daily_data.daily_balance - calculated_balance) < 0.1, \
            f"Balance diario incorrecto: {daily_data.daily_balance} vs {calculated_balance}"

def run_validation():
    """Ejecuta todas las validaciones"""
    try:
        logger.info("Iniciando validación de datos...")
        
        validate_scada_data()
        logger.info("✓ Datos SCADA validados")
        
        validate_consumption_calculations()
        logger.info("✓ Cálculos de consumo validados")
        
        validate_generation_calculations()
        logger.info("✓ Cálculos de generación validados")
        
        validate_daily_data()
        logger.info("✓ Datos diarios validados")
        
        logger.info("¡Todas las validaciones completadas con éxito!")
        return True
        
    except AssertionError as e:
        logger.error(f"Error en la validación: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Error inesperado: {str(e)}")
        return False

if __name__ == "__main__":
    run_validation()
