from celery import shared_task
from datetime import datetime, timedelta, timezone
from django.db.models import Sum, Avg, F, FloatField, Max # Importa Max
from django.db.models.functions import Cast, TruncDay
import logging
import calendar
from django.db.models import Sum, F, FloatField, QuerySet, Q

from scada_proxy.models import Measurement, Device # Necesitas esto para el modelo Measurement
from scada_proxy.models import TaskProgress # También puedes necesitar TaskProgress
from .models import MonthlyConsumptionKPI, DailyChartData

logger = logging.getLogger(__name__)

@shared_task
def calculate_monthly_consumption_kpi():
    """
    Calcula el consumo total, la generación total, la potencia instantánea promedio,
    la temperatura promedio diaria, la humedad relativa promedio, y la velocidad del viento promedio
    para el mes actual (hasta la fecha) y el mes anterior (hasta el mismo día).
    Guarda los resultados en MonthlyConsumptionKPI.
    """
    logger.info("Starting calculate_monthly_consumption_kpi task...")
    try:
        # Obtener la fecha y hora actual en UTC
        today = datetime.now(timezone.utc).date()
        current_day = today.day

        # --- Cálculo de rangos de fechas para el mes actual ---
        # El mes actual va desde el primer día hasta la fecha actual
        start_current_month = today.replace(day=1)
        end_current_month = today

        # --- Lógica de cálculo de rangos de fechas para el mes anterior ---
        first_day_current_month = today.replace(day=1)
        last_day_previous_month = first_day_current_month - timedelta(days=1)
        previous_month = last_day_previous_month.month
        previous_year = last_day_previous_month.year

        start_previous_month = last_day_previous_month.replace(day=1)
        
        # El final del rango del mes anterior es el mismo día que el mes actual,
        # pero ajustado por si el mes anterior tiene menos días (ej. febrero).
        last_day_of_previous_month = calendar.monthrange(previous_year, previous_month)[1]
        day_for_previous_month = min(current_day, last_day_of_previous_month)
        end_previous_month = last_day_previous_month.replace(day=day_for_previous_month)

        logger.info(f"Calculating for current month: {start_current_month} to {end_current_month}")
        logger.info(f"Calculating for previous month: {start_previous_month} to {end_previous_month}")

        # Obtener los dispositivos activos de cada categoría
        electric_meters = Device.objects.filter(category__id=2, is_active=True)
        inverters = Device.objects.filter(category__id=1, is_active=True)
        weather_stations = Device.objects.filter(category__name='weatherStation', is_active=True) 
        
        logger.info(f"Found {electric_meters.count()} active electric meter devices.")
        logger.info(f"Found {inverters.count()} active inverter devices.")
        logger.info(f"Found {weather_stations.count()} active weather station devices.")

        # --- Cálculo de Consumo Total (Medidores Eléctricos) ---
        # Se mantienen las consultas separadas por métrica y tipo de dispositivo
        # debido a que los campos de datos y los filtros son diferentes.
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

        # --- Cálculo: Velocidad del Viento Promedio (Estaciones Meteorológicas) ---
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

        # Usa 'update_or_create' para actualizar el registro, lo cual es más conciso.
        MonthlyConsumptionKPI.objects.update_or_create(
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
                'avg_wind_speed_current_month': avg_wind_speed_current,
                'avg_wind_speed_previous_month': avg_wind_speed_previous,
            }
        )

        logger.info("All Monthly KPIs calculated and updated successfully.")
        return "All Monthly KPIs calculated and updated successfully."

    except Exception as e:
        logger.error(f"Error calculating monthly KPIs: {e}", exc_info=True)
        raise

@shared_task
def calculate_and_save_daily_data(target_date: str = None, start_date_str: str = None, end_date_str: str = None):
    """
    Calcula el consumo y generación diario agregado para una fecha específica o un rango de fechas,
    y guarda los resultados en DailyChartData.
    """
    logger.info(f"Starting calculate_and_save_daily_data task for target_date: {target_date}, range: {start_date_str} to {end_date_str}...")

    if target_date:
        start_date = datetime.fromisoformat(target_date).date()
        end_date = start_date # Solo procesa ese día
        logger.info(f"Processing single day: {start_date}")
    elif start_date_str and end_date_str:
        start_date = datetime.fromisoformat(start_date_str).date()
        end_date = datetime.fromisoformat(end_date_str).date()
        logger.info(f"Processing date range: {start_date} to {end_date}")
    else:
        # Default a hoy si no se especifica nada
        start_date = datetime.now(timezone.utc).date()
        end_date = start_date
        logger.info(f"No date specified, processing current day: {start_date}")

    current_date = start_date
    while current_date <= end_date:
        logger.info(f"Calculating daily data for {current_date}")

        electric_meter_ids = Device.objects.filter(category__id=2, is_active=True).values_list('id', flat=True)
        inverter_ids = Device.objects.filter(category__id=1, is_active=True).values_list('id', flat=True)

        daily_aggregation = Measurement.objects.filter(
            date__date=current_date
        ).aggregate(
            daily_consumption=Sum(
                Cast(F('data__totalActivePower'), FloatField()),
                filter=Q(device__in=electric_meter_ids, data__totalActivePower__isnull=False)
            ),
            daily_generation=Sum(
                Cast(F('data__acPower'), FloatField()),
                filter=Q(device__in=inverter_ids, data__acPower__isnull=False)
            )
        )
        
        daily_consumption_sum = daily_aggregation.get('daily_consumption') or 0.0
        daily_generation_sum = daily_aggregation.get('daily_generation') or 0.0

        daily_data_obj, created = DailyChartData.objects.update_or_create(
            date=current_date,
            defaults={
                'daily_consumption': daily_consumption_sum,
                'daily_generation': daily_generation_sum
            }
        )
        
        action = "creado" if created else "actualizado"
        logger.info(f"Dato diario {action} para la fecha {current_date}. Consumo: {daily_consumption_sum}, Generación: {daily_generation_sum}")

        current_date += timedelta(days=1)
    
    logger.info(f"Cálculo diario completado para el rango {start_date} a {end_date}.")

@shared_task
def post_fetch_calculations_task(results, start_date_str: str, end_date_str: str, orchestration_task_id: str):
    """
    Tarea que se ejecuta después de que todas las mediciones históricas han sido guardadas.
    Dispara las tareas de cálculo de KPIs y datos diarios.
    `results` es el resultado del chord (una lista, no usada directamente aquí).
    """
    logger.info(f"post_fetch_calculations_task iniciada. Todas las mediciones históricas se han obtenido.")
    
    # Actualizar el estado de la tarea orquestadora
    task_progress = None
    try:
        task_progress = TaskProgress.objects.get(task_id=orchestration_task_id)
        task_progress.status = 'CALCULATING_KPIS'
        task_progress.message = 'Mediciones obtenidas. Calculando KPIs y datos diarios...'
        task_progress.save(update_fields=['status', 'message'])
    except TaskProgress.DoesNotExist:
        logger.warning(f"TaskProgress con ID {orchestration_task_id} no encontrado para post_fetch_calculations_task.")


    # Encolar la tarea de cálculo de KPI mensual
    calculate_monthly_consumption_kpi.delay()
    logger.info("Tarea calculate_monthly_consumption_kpi encolada.")

    # Encolar la tarea de cálculo de datos diarios para el rango recién sincronizado
    # Asumiendo que calculate_and_save_daily_data acepta un rango de fechas
    calculate_and_save_daily_data.delay(
        start_date_str=start_date_str,
        end_date_str=end_date_str
    )
    logger.info(f"Tarea calculate_and_save_daily_data encolada para rango {start_date_str} a {end_date_str}.")

    # Finalmente, actualizar el estado de la tarea orquestadora a éxito
    if task_progress:
        task_progress.status = 'SUCCESS'
        task_progress.message = 'Sincronización de datos y cálculos completados exitosamente.'
        task_progress.save(update_fields=['status', 'message'])
    logger.info("Todas las tareas de cálculo encoladas. Proceso de sincronización completo.")