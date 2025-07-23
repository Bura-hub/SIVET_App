from celery import shared_task
from django.db.models import Sum, F, FloatField
from django.db.models.functions import Cast
from datetime import datetime, timedelta, timezone
import logging
import calendar

from scada_proxy.models import Device, Measurement # Importa los modelos de scada_proxy
from .models import MonthlyConsumptionKPI # Importa el nuevo modelo de indicators

logger = logging.getLogger(__name__)

@shared_task
def calculate_monthly_consumption_kpi():
    """
    Calcula el consumo total del mes actual (hasta la fecha) y del mes anterior completo
    para todos los medidores eléctricos activos y los guarda en MonthlyConsumptionKPI.
    """
    logger.info("Starting calculate_monthly_consumption_kpi task...")
    try:
        today = datetime.now(timezone.utc).date()

        # Current month (up to today)
        start_current_month = today.replace(day=1)
        end_current_month = today

        # Previous full month
        first_day_current_month = today.replace(day=1)
        last_day_previous_month = first_day_current_month - timedelta(days=1)
        start_previous_month = last_day_previous_month.replace(day=1)
        end_previous_month = last_day_previous_month

        logger.info(f"Calculating consumption for current month: {start_current_month} to {end_current_month}")
        logger.info(f"Calculating consumption for previous month: {start_previous_month} to {end_previous_month}")

        # Get all active electric meters from local DB (category__id=2)
        electric_meters = Device.objects.filter(category__id=2, is_active=True)
        
        logger.info(f"Found {electric_meters.count()} active electric meter devices in local DB for KPI calculation.")

        # Sum TotalActivePower for each period from local Measurement model
        current_month_sum = Measurement.objects.filter(
            device__in=electric_meters,
            date__date__range=(start_current_month, end_current_month),
            data__totalActivePower__isnull=False
        ).aggregate(
            total_sum=Sum(Cast(F('data__totalActivePower'), FloatField()))
        )['total_sum'] or 0.0

        previous_month_sum = Measurement.objects.filter(
            device__in=electric_meters,
            date__date__range=(start_previous_month, end_previous_month),
            data__totalActivePower__isnull=False
        ).aggregate(
            total_sum=Sum(Cast(F('data__totalActivePower'), FloatField()))
        )['total_sum'] or 0.0

        # Update or create the single KPI record
        kpi_record, created = MonthlyConsumptionKPI.objects.get_or_create(
            pk=1, # Usamos un PK fijo para asegurar que solo haya un registro
            defaults={
                'total_consumption_current_month': current_month_sum,
                'total_consumption_previous_month': previous_month_sum
            }
        )
        if not created:
            kpi_record.total_consumption_current_month = current_month_sum
            kpi_record.total_consumption_previous_month = previous_month_sum
            kpi_record.save()

        logger.info(f"KPI updated: Current month: {current_month_sum}, Previous month: {previous_month_sum}")
        return "Monthly Consumption KPI calculated and updated successfully."

    except Exception as e:
        logger.error(f"Error calculating monthly consumption KPI: {e}", exc_info=True)
        raise # Re-lanza la excepción para que Celery la marque como fallida