from celery import shared_task
from django.db.models import Sum, Avg, F, FloatField
from django.db.models.functions import Cast
from datetime import datetime, timedelta, timezone
import logging
import calendar

from scada_proxy.models import Device, Measurement
from .models import MonthlyConsumptionKPI

logger = logging.getLogger(__name__)

@shared_task
def calculate_monthly_consumption_kpi():
    """
    Calcula el consumo total, la generación total, y la potencia instantánea promedio
    para el mes actual (hasta la fecha) y el mes anterior completo.
    Guarda los resultados en MonthlyConsumptionKPI.
    """
    logger.info("Starting calculate_monthly_consumption_kpi task...")
    try:
        today = datetime.now(timezone.utc).date()

        start_current_month = today.replace(day=1)
        end_current_month = today

        first_day_current_month = today.replace(day=1)
        last_day_previous_month = first_day_current_month - timedelta(days=1)
        start_previous_month = last_day_previous_month.replace(day=1)
        end_previous_month = last_day_previous_month

        logger.info(f"Calculating for current month: {start_current_month} to {end_current_month}")
        logger.info(f"Calculating for previous month: {start_previous_month} to {end_previous_month}")

        electric_meters = Device.objects.filter(category__id=2, is_active=True)
        logger.info(f"Found {electric_meters.count()} active electric meter devices.")

        inverters = Device.objects.filter(category__id=1, is_active=True)
        logger.info(f"Found {inverters.count()} active inverter devices.")

        # --- Cálculo de Consumo Total (Medidores Eléctricos) ---
        current_month_consumption_sum = Measurement.objects.filter(
            device__in=electric_meters,
            date__date__range=(start_current_month, end_current_month),
            data__totalActivePower__isnull=False
        ).aggregate(
            total_sum=Sum(Cast(F('data__totalActivePower'), FloatField()))
        )['total_sum'] or 0.0

        previous_month_consumption_sum = Measurement.objects.filter(
            device__in=electric_meters,
            date__date__range=(start_previous_month, end_previous_month),
            data__totalActivePower__isnull=False
        ).aggregate(
            total_sum=Sum(Cast(F('data__totalActivePower'), FloatField()))
        )['total_sum'] or 0.0
        logger.info(f"Consumption - Current month: {current_month_consumption_sum}, Previous month: {previous_month_consumption_sum}")

        # --- Cálculo de Generación Total (Inversores) ---
        current_month_generation_sum = Measurement.objects.filter(
            device__in=inverters,
            date__date__range=(start_current_month, end_current_month),
            data__acPower__isnull=False
        ).aggregate(
            total_sum=Sum(Cast(F('data__acPower'), FloatField()))
        )['total_sum'] or 0.0
        
        previous_month_generation_sum = Measurement.objects.filter(
            device__in=inverters,
            date__date__range=(start_previous_month, end_previous_month),
            data__acPower__isnull=False
        ).aggregate(
            total_sum=Sum(Cast(F('data__acPower'), FloatField()))
        )['total_sum'] or 0.0
        logger.info(f"Generation - Current month: {current_month_generation_sum}, Previous month: {previous_month_generation_sum}")

        # --- Cálculo de Potencia Instantánea Promedio (Inversores) ---
        # Promedio de 'acPower' de los inversores para el mes actual
        avg_instantaneous_power_current = Measurement.objects.filter(
            device__in=inverters,
            date__date__range=(start_current_month, end_current_month),
            data__acPower__isnull=False
        ).aggregate(
            avg_value=Avg(Cast(F('data__acPower'), FloatField()))
        )['avg_value'] or 0.0

        # Promedio de 'acPower' de los inversores para el mes anterior
        avg_instantaneous_power_previous = Measurement.objects.filter(
            device__in=inverters,
            date__date__range=(start_previous_month, end_previous_month),
            data__acPower__isnull=False
        ).aggregate(
            avg_value=Avg(Cast(F('data__acPower'), FloatField()))
        )['avg_value'] or 0.0
        logger.info(f"Avg Instantaneous Power - Current month: {avg_instantaneous_power_current} W, Previous month: {avg_instantaneous_power_previous} W")


        # Update or create the single KPI record
        kpi_record, created = MonthlyConsumptionKPI.objects.get_or_create(
            pk=1,
            defaults={
                'total_consumption_current_month': current_month_consumption_sum,
                'total_consumption_previous_month': previous_month_consumption_sum,
                'total_generation_current_month': current_month_generation_sum,
                'total_generation_previous_month': previous_month_generation_sum,
                'avg_instantaneous_power_current_month': avg_instantaneous_power_current, # Nuevo campo
                'avg_instantaneous_power_previous_month': avg_instantaneous_power_previous, # Nuevo campo
            }
        )
        if not created:
            kpi_record.total_consumption_current_month = current_month_consumption_sum
            kpi_record.total_consumption_previous_month = previous_month_consumption_sum
            kpi_record.total_generation_current_month = current_month_generation_sum
            kpi_record.total_generation_previous_month = previous_month_generation_sum
            kpi_record.avg_instantaneous_power_current_month = avg_instantaneous_power_current # Actualizar
            kpi_record.avg_instantaneous_power_previous_month = avg_instantaneous_power_previous # Actualizar
            kpi_record.save()

        logger.info("Monthly Consumption, Generation, and Avg Instantaneous Power KPIs calculated and updated successfully.")
        return "Monthly Consumption, Generation, and Avg Instantaneous Power KPIs calculated and updated successfully."

    except Exception as e:
        logger.error(f"Error calculating monthly KPIs: {e}", exc_info=True)
        raise