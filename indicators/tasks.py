from celery import shared_task
from django.db.models import Sum, F, FloatField
from django.db.models.functions import Cast
from datetime import datetime, timedelta, timezone
import logging
import calendar

from scada_proxy.models import Device, Measurement # Importa los modelos de scada_proxy
from .models import MonthlyConsumptionKPI # Importa el modelo de indicators

logger = logging.getLogger(__name__)

@shared_task
def calculate_monthly_consumption_kpi():
    """
    Calcula el consumo total, la generación total y el balance energético
    para el mes actual (hasta la fecha) y el mes anterior completo.
    Guarda los resultados en MonthlyConsumptionKPI.
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

        logger.info(f"Calculating for current month: {start_current_month} to {end_current_month}")
        logger.info(f"Calculating for previous month: {start_previous_month} to {end_previous_month}")

        # --- Obtener Medidores Eléctricos (categoría ID = 2) ---
        electric_meters = Device.objects.filter(category__id=2, is_active=True)
        logger.info(f"Found {electric_meters.count()} active electric meter devices.")

        # --- Obtener Inversores (categoría ID = 1) ---
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

        # --- Cálculo de Balance Energético (Medidores Eléctricos) ---
        # Energía Importada (suma de Low y High, convirtiendo High de MWh a kWh)
        current_imported_low_kwh = Measurement.objects.filter(
            device__in=electric_meters,
            date__date__range=(start_current_month, end_current_month),
            data__importedActivePowerLow__isnull=False
        ).aggregate(
            total_sum=Sum(Cast(F('data__importedActivePowerLow'), FloatField()))
        )['total_sum'] or 0.0

        current_imported_high_mwh = Measurement.objects.filter(
            device__in=electric_meters,
            date__date__range=(start_current_month, end_current_month),
            data__importedActivePowerHigh__isnull=False
        ).aggregate(
            total_sum=Sum(Cast(F('data__importedActivePowerHigh'), FloatField()))
        )['total_sum'] or 0.0
        total_imported_current_month_kwh = current_imported_low_kwh + (current_imported_high_mwh * 1000) # Convert MWh to kWh

        previous_imported_low_kwh = Measurement.objects.filter(
            device__in=electric_meters,
            date__date__range=(start_previous_month, end_previous_month),
            data__importedActivePowerLow__isnull=False
        ).aggregate(
            total_sum=Sum(Cast(F('data__importedActivePowerLow'), FloatField()))
        )['total_sum'] or 0.0

        previous_imported_high_mwh = Measurement.objects.filter(
            device__in=electric_meters,
            date__date__range=(start_previous_month, end_previous_month),
            data__importedActivePowerHigh__isnull=False
        ).aggregate(
            total_sum=Sum(Cast(F('data__importedActivePowerHigh'), FloatField()))
        )['total_sum'] or 0.0
        total_imported_previous_month_kwh = previous_imported_low_kwh + (previous_imported_high_mwh * 1000) # Convert MWh to kWh

        # Energía Exportada (suma de Low y High, convirtiendo High de MWh a kWh)
        current_exported_low_kwh = Measurement.objects.filter(
            device__in=electric_meters,
            date__date__range=(start_current_month, end_current_month),
            data__exportedActivePowerLow__isnull=False
        ).aggregate(
            total_sum=Sum(Cast(F('data__exportedActivePowerLow'), FloatField()))
        )['total_sum'] or 0.0

        current_exported_high_mwh = Measurement.objects.filter(
            device__in=electric_meters,
            date__date__range=(start_current_month, end_current_month),
            data__exportedActivePowerHigh__isnull=False
        ).aggregate(
            total_sum=Sum(Cast(F('data__exportedActivePowerHigh'), FloatField()))
        )['total_sum'] or 0.0
        total_exported_current_month_kwh = current_exported_low_kwh + (current_exported_high_mwh * 1000) # Convert MWh to kWh

        previous_exported_low_kwh = Measurement.objects.filter(
            device__in=electric_meters,
            date__date__range=(start_previous_month, end_previous_month),
            data__exportedActivePowerLow__isnull=False
        ).aggregate(
            total_sum=Sum(Cast(F('data__exportedActivePowerLow'), FloatField()))
        )['total_sum'] or 0.0

        previous_exported_high_mwh = Measurement.objects.filter(
            device__in=electric_meters,
            date__date__range=(start_previous_month, end_previous_month),
            data__exportedActivePowerHigh__isnull=False
        ).aggregate(
            total_sum=Sum(Cast(F('data__exportedActivePowerHigh'), FloatField()))
        )['total_sum'] or 0.0
        total_exported_previous_month_kwh = previous_exported_low_kwh + (previous_exported_high_mwh * 1000) # Convert MWh to kWh

        logger.info(f"Imported - Current month: {total_imported_current_month_kwh}, Previous month: {total_imported_previous_month_kwh}")
        logger.info(f"Exported - Current month: {total_exported_current_month_kwh}, Previous month: {total_exported_previous_month_kwh}")

        # Update or create the single KPI record
        kpi_record, created = MonthlyConsumptionKPI.objects.get_or_create(
            pk=1, # Usamos un PK fijo para asegurar que solo haya un registro
            defaults={
                'total_consumption_current_month': current_month_consumption_sum,
                'total_consumption_previous_month': previous_month_consumption_sum,
                'total_generation_current_month': current_month_generation_sum,
                'total_generation_previous_month': previous_month_generation_sum,
                'total_imported_current_month': total_imported_current_month_kwh,
                'total_imported_previous_month': total_imported_previous_month_kwh,
                'total_exported_current_month': total_exported_current_month_kwh,
                'total_exported_previous_month': total_exported_previous_month_kwh,
            }
        )
        if not created:
            kpi_record.total_consumption_current_month = current_month_consumption_sum
            kpi_record.total_consumption_previous_month = previous_month_consumption_sum
            kpi_record.total_generation_current_month = current_month_generation_sum
            kpi_record.total_generation_previous_month = previous_month_generation_sum
            kpi_record.total_imported_current_month = total_imported_current_month_kwh
            kpi_record.total_imported_previous_month = total_imported_previous_month_kwh
            kpi_record.total_exported_current_month = total_exported_current_month_kwh
            kpi_record.total_exported_previous_month = total_exported_previous_month_kwh
            kpi_record.save()

        logger.info("All Monthly KPIs calculated and updated successfully.")
        return "All Monthly KPIs calculated and updated successfully."

    except Exception as e:
        logger.error(f"Error calculating monthly KPIs: {e}", exc_info=True)
        raise # Re-lanza la excepción para que Celery la marque como fallida