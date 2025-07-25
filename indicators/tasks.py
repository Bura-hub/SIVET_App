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
    Calcula el consumo total, la generación total, la potencia instantánea promedio,
    la temperatura promedio diaria, la humedad relativa promedio, y la velocidad del viento promedio
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

        weather_stations = Device.objects.filter(category__name='weatherStation', is_active=True) 
        logger.info(f"Found {weather_stations.count()} active weather station devices.")

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
        avg_instantaneous_power_current = Measurement.objects.filter(
            device__in=inverters,
            date__date__range=(start_current_month, end_current_month),
            data__acPower__isnull=False
        ).aggregate(
            avg_value=Avg(Cast(F('data__acPower'), FloatField()))
        )['avg_value'] or 0.0

        avg_instantaneous_power_previous = Measurement.objects.filter(
            device__in=inverters,
            date__date__range=(start_previous_month, end_previous_month),
            data__acPower__isnull=False
        ).aggregate(
            avg_value=Avg(Cast(F('data__acPower'), FloatField()))
        )['avg_value'] or 0.0
        logger.info(f"Avg Instantaneous Power - Current month: {avg_instantaneous_power_current} W, Previous month: {avg_instantaneous_power_previous} W")

        # --- Cálculo: Temperatura Promedio Diaria (Estaciones Meteorológicas) ---
        avg_daily_temp_current = Measurement.objects.filter(
            device__in=weather_stations,
            date__date__range=(start_current_month, end_current_month),
            data__temperature__isnull=False
        ).aggregate(
            avg_value=Avg(Cast(F('data__temperature'), FloatField()))
        )['avg_value'] or 0.0

        avg_daily_temp_previous = Measurement.objects.filter(
            device__in=weather_stations,
            date__date__range=(start_previous_month, end_previous_month),
            data__temperature__isnull=False
        ).aggregate(
            avg_value=Avg(Cast(F('data__temperature'), FloatField()))
        )['avg_value'] or 0.0
        logger.info(f"Avg Daily Temperature - Current month: {avg_daily_temp_current} °C, Previous month: {avg_daily_temp_previous} °C")

        # --- Cálculo: Humedad Relativa Promedio (Estaciones Meteorológicas) ---
        avg_relative_humidity_current = Measurement.objects.filter(
            device__in=weather_stations,
            date__date__range=(start_current_month, end_current_month),
            data__humidity__isnull=False
        ).aggregate(
            avg_value=Avg(Cast(F('data__humidity'), FloatField()))
        )['avg_value'] or 0.0

        avg_relative_humidity_previous = Measurement.objects.filter(
            device__in=weather_stations,
            date__date__range=(start_previous_month, end_previous_month),
            data__humidity__isnull=False
        ).aggregate(
            avg_value=Avg(Cast(F('data__humidity'), FloatField()))
        )['avg_value'] or 0.0
        logger.info(f"Avg Relative Humidity - Current month: {avg_relative_humidity_current} %RH, Previous month: {avg_relative_humidity_previous} %RH")

        # --- Nuevo Cálculo: Velocidad del Viento Promedio (Estaciones Meteorológicas) ---
        avg_wind_speed_current = Measurement.objects.filter(
            device__in=weather_stations,
            date__date__range=(start_current_month, end_current_month),
            data__windSpeed__isnull=False
        ).aggregate(
            avg_value=Avg(Cast(F('data__windSpeed'), FloatField()))
        )['avg_value'] or 0.0

        avg_wind_speed_previous = Measurement.objects.filter(
            device__in=weather_stations,
            date__date__range=(start_previous_month, end_previous_month),
            data__windSpeed__isnull=False
        ).aggregate(
            avg_value=Avg(Cast(F('data__windSpeed'), FloatField()))
        )['avg_value'] or 0.0
        logger.info(f"Avg Wind Speed - Current month: {avg_wind_speed_current} km/h, Previous month: {avg_wind_speed_previous} km/h")


        # Update or create the single KPI record
        kpi_record, created = MonthlyConsumptionKPI.objects.get_or_create(
            pk=1,
            defaults={
                'total_consumption_current_month': current_month_consumption_sum,
                'total_consumption_previous_month': previous_month_consumption_sum,
                'total_generation_current_month': current_month_generation_sum,
                'total_generation_previous_month': previous_month_generation_sum,
                'avg_instantaneous_power_current_month': avg_instantaneous_power_current,
                'avg_instantaneous_power_previous_month': avg_instantaneous_power_previous,
                'avg_daily_temp_current_month': avg_daily_temp_current,
                'avg_daily_temp_previous_month': avg_daily_temp_previous,
                'avg_relative_humidity_current_month': avg_relative_humidity_current,
                'avg_relative_humidity_previous_month': avg_relative_humidity_previous,
                'avg_wind_speed_current_month': avg_wind_speed_current, # Nuevo campo
                'avg_wind_speed_previous_month': avg_wind_speed_previous, # Nuevo campo
            }
        )
        if not created:
            kpi_record.total_consumption_current_month = current_month_consumption_sum
            kpi_record.total_consumption_previous_month = previous_month_consumption_sum
            kpi_record.total_generation_current_month = current_month_generation_sum
            kpi_record.total_generation_previous_month = previous_month_generation_sum
            kpi_record.avg_instantaneous_power_current_month = avg_instantaneous_power_current
            kpi_record.avg_instantaneous_power_previous_month = avg_instantaneous_power_previous
            kpi_record.avg_daily_temp_current_month = avg_daily_temp_current
            kpi_record.avg_daily_temp_previous_month = avg_daily_temp_previous
            kpi_record.avg_relative_humidity_current_month = avg_relative_humidity_current
            kpi_record.avg_relative_humidity_previous_month = avg_relative_humidity_previous
            kpi_record.avg_wind_speed_current_month = avg_wind_speed_current # Actualizar
            kpi_record.avg_wind_speed_previous_month = avg_wind_speed_previous # Actualizar
            kpi_record.save()

        logger.info("All Monthly KPIs calculated and updated successfully.")
        return "All Monthly KPIs calculated and updated successfully."

    except Exception as e:
        logger.error(f"Error calculating monthly KPIs: {e}", exc_info=True)
        raise