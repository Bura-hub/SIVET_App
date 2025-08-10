from celery import shared_task
from datetime import datetime, timedelta, timezone
from django.db.models import Sum, Avg, F, FloatField, Max, Count, Min, Q, QuerySet
from django.db.models.functions import Cast, TruncDay
import logging
import calendar
from django.utils import timezone as django_timezone
import pytz
from collections import defaultdict

from scada_proxy.models import Measurement, Device, Institution, DeviceCategory, TaskProgress
from .models import (
    ElectricMeterEnergyConsumption, 
    MonthlyConsumptionKPI, 
    DailyChartData,
    ElectricMeterConsumption, 
    ElectricMeterChartData
)

logger = logging.getLogger(__name__)

# Zona horaria de Colombia
COLOMBIA_TZ = pytz.timezone('America/Bogota')

def get_colombia_now():
    """Obtiene la fecha y hora actual en zona horaria de Colombia"""
    return django_timezone.now().astimezone(COLOMBIA_TZ)

def get_colombia_date():
    """Obtiene la fecha actual en zona horaria de Colombia"""
    return get_colombia_now().date()

@shared_task(bind=True, retry_backoff=60, max_retries=3)
def calculate_monthly_consumption_kpi(self):
    """
    Calcula el consumo total, la generación total, la potencia instantánea promedio,
    la temperatura promedio diaria, la humedad relativa promedio, y la velocidad del viento promedio
    para el mes actual (hasta la fecha) y el mes anterior (hasta el mismo día).
    Guarda los resultados en MonthlyConsumptionKPI.
    """
    logger.info("=== INICIANDO TAREA: calculate_monthly_consumption_kpi ===")
    try:
        # Obtener la fecha y hora actual en zona horaria de Colombia
        today = get_colombia_date()
        current_day = today.day

        logger.info(f"Fecha actual en Colombia: {today}, día del mes: {current_day}")

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

        logger.info(f"Rango mes actual: {start_current_month} -> {end_current_month}")
        logger.info(f"Rango mes anterior: {start_previous_month} -> {end_previous_month}")

        # Obtener los dispositivos activos de cada categoría
        electric_meters = Device.objects.filter(category__id=2, is_active=True)
        inverters = Device.objects.filter(category__id=1, is_active=True)
        weather_stations = Device.objects.filter(category__name='weatherStation', is_active=True) 
        
        logger.info(f"Dispositivos encontrados:")
        logger.info(f"  - Medidores eléctricos: {electric_meters.count()} dispositivos")
        logger.info(f"  - Inversores: {inverters.count()} dispositivos")
        logger.info(f"  - Estaciones meteorológicas: {weather_stations.count()} dispositivos")

        # --- Cálculo de Consumo Total (Medidores Eléctricos) ---
        logger.info("Calculando consumo total (medidores eléctricos)...")
        # Cambiar el cálculo de consumo para que sea consistente
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
        logger.info(f"Consumo total - Mes actual: {current_month_consumption_sum:.2f} kWh, Mes anterior: {previous_month_consumption_sum:.2f} kWh")

        # --- Cálculo de Generación Total (Inversores) ---
        logger.info("Calculando generación total (inversores)...")

        # Cálculo para el mes actual
        current_month_generation = Measurement.objects.filter(
            device__in=inverters,
            date__date__range=(start_current_month, end_current_month),
            data__acPower__isnull=False
        ).annotate(
            day=TruncDay('date')
        ).values('day').annotate(
            total_power=Sum(Cast(F('data__acPower'), FloatField())),
            measurements_count=Count('id')
        ).order_by('day')

        current_month_generation_sum = 0
        for day_data in current_month_generation:
            hours_in_day = 24
            daily_energy_wh = (day_data['total_power'] / day_data['measurements_count']) * hours_in_day
            current_month_generation_sum += daily_energy_wh

        # Convertir a kWh
        current_month_generation_sum = current_month_generation_sum / 1000.0

        # Cálculo para el mes anterior
        previous_month_generation = Measurement.objects.filter(
            device__in=inverters,
            date__date__range=(start_previous_month, end_previous_month),
            data__acPower__isnull=False
        ).annotate(
            day=TruncDay('date')
        ).values('day').annotate(
            total_power=Sum(Cast(F('data__acPower'), FloatField())),
            measurements_count=Count('id')
        ).order_by('day')

        previous_month_generation_sum = 0
        for day_data in previous_month_generation:
            hours_in_day = 24
            daily_energy_wh = (day_data['total_power'] / day_data['measurements_count']) * hours_in_day
            previous_month_generation_sum += daily_energy_wh

        # Convertir a kWh
        previous_month_generation_sum = previous_month_generation_sum / 1000.0

        logger.info(f"Generación total - Mes actual: {current_month_generation_sum:.2f} kWh, Mes anterior: {previous_month_generation_sum:.2f} kWh")

        # --- Cálculo de Potencia Instantánea Promedio (Inversores) ---
        logger.info("Calculando potencia instantánea promedio (inversores)...")
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
        logger.info(f"Potencia instantánea promedio - Mes actual: {avg_instantaneous_power_current:.2f} W, Mes anterior: {avg_instantaneous_power_previous:.2f} W")

        # --- Cálculo: Temperatura Promedio Diaria (Estaciones Meteorológicas) ---
        logger.info("Calculando temperatura promedio diaria (estaciones meteorológicas)...")
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
        logger.info(f"Temperatura promedio diaria - Mes actual: {avg_daily_temp_current:.2f} °C, Mes anterior: {avg_daily_temp_previous:.2f} °C")

        # --- Cálculo: Humedad Relativa Promedio (Estaciones Meteorológicas) ---
        logger.info("Calculando humedad relativa promedio (estaciones meteorológicas)...")
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
        logger.info(f"Humedad relativa promedio - Mes actual: {avg_relative_humidity_current:.2f} %RH, Mes anterior: {avg_relative_humidity_previous:.2f} %RH")

        # --- Cálculo: Velocidad del Viento Promedio (Estaciones Meteorológicas) ---
        logger.info("Calculando velocidad del viento promedio (estaciones meteorológicas)...")
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
        logger.info(f"Velocidad del viento promedio - Mes actual: {avg_wind_speed_current:.2f} km/h, Mes anterior: {avg_wind_speed_previous:.2f} km/h")

        # Guardar en la base de datos
        logger.info("Guardando KPIs mensuales en la base de datos...")
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

        logger.info("=== TAREA COMPLETADA: calculate_monthly_consumption_kpi ===")
        logger.info("Todos los KPIs mensuales han sido calculados y actualizados exitosamente.")
        return "All Monthly KPIs calculated and updated successfully."

    except Exception as e:
        logger.error(f"=== ERROR EN TAREA: calculate_monthly_consumption_kpi ===")
        logger.error(f"Error calculando KPIs mensuales: {e}", exc_info=True)
        raise

@shared_task(bind=True, retry_backoff=30, max_retries=3)
def calculate_and_save_daily_data(self, start_date_str: str = None, end_date_str: str = None):
    """
    Calcula el consumo, la generación, el balance de energía y la temperatura promedio diaria 
    para un rango de fechas.
    """
    logger.info("=== INICIANDO TAREA: calculate_and_save_daily_data ===")
    try:
        # Si no se proporcionan fechas, calcular para el día anterior en Colombia
        if not start_date_str or not end_date_str:
            yesterday = get_colombia_date() - timedelta(days=1)
            start_date_str = yesterday.isoformat()
            end_date_str = yesterday.isoformat()
            logger.info(f"No se proporcionaron fechas, calculando para el día anterior en Colombia: {yesterday}")

        # 1. Convertir strings a objetos datetime conscientes de la zona horaria de Colombia
        start_date = datetime.fromisoformat(start_date_str).replace(tzinfo=COLOMBIA_TZ)
        end_date = datetime.fromisoformat(end_date_str).replace(tzinfo=COLOMBIA_TZ)

        logger.info(f"Rango de fechas a procesar en Colombia: {start_date.date()} -> {end_date.date()}")
        
        # 2. Obtener los dispositivos eléctricos, inversores y estaciones meteorológicas
        electric_meters: QuerySet[Device] = Device.objects.filter(category__id=2, is_active=True)
        inverters: QuerySet[Device] = Device.objects.filter(category__id=1, is_active=True)
        # Se asume que el id de la categoría para estaciones meteorológicas es 3
        weather_stations: QuerySet[Device] = Device.objects.filter(category__id=3, is_active=True)
        
        logger.info(f"Dispositivos encontrados para cálculo diario:")
        logger.info(f"  - Medidores eléctricos: {electric_meters.count()} dispositivos")
        logger.info(f"  - Inversores: {inverters.count()} dispositivos")
        logger.info(f"  - Estaciones meteorológicas: {weather_stations.count()} dispositivos")
        
        if not electric_meters.exists() and not inverters.exists() and not weather_stations.exists():
            logger.warning("No se encontraron dispositivos activos para procesar.")
            return

        electric_meter_ids = electric_meters.values_list('id', flat=True)
        inverter_ids = inverters.values_list('id', flat=True)
        weather_station_ids = weather_stations.values_list('id', flat=True)

        # 3. Iterar día por día en el rango especificado
        current_date = start_date
        total_days_processed = 0
        total_records_created = 0
        total_records_updated = 0
        
        logger.info(f"Iniciando procesamiento de {((end_date - start_date).days + 1)} días...")
        
        while current_date <= end_date:
            single_date = current_date.date()
            logger.info(f"Procesando fecha en Colombia: {single_date}")
            
            # Agregación para consumo y generación
            daily_aggregation = Measurement.objects.filter(
                date__date=single_date,
                device__in=list(electric_meter_ids) + list(inverter_ids)
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

            # Agregación para la temperatura media diaria
            daily_temp_aggregation = Measurement.objects.filter(
                date__date=single_date,
                device__in=weather_station_ids,
                data__temperature__isnull=False # CAMBIO: Se usa el campo 'temperature'
            ).aggregate(
                avg_daily_temp=Avg(Cast(F('data__temperature'), FloatField())) # CAMBIO: Se usa el campo 'temperature'
            )
            
            daily_consumption_sum = daily_aggregation.get('daily_consumption') or 0.0
            daily_generation_sum = daily_aggregation.get('daily_generation') or 0.0
            daily_temp_avg = daily_temp_aggregation.get('avg_daily_temp') or 0.0
            
            # Convertir consumo de Wh a kWh
            daily_consumption_kwh = daily_consumption_sum / 1000.0

            # Calcular generación correctamente (convertir potencia promedio a energía)
            # Primero obtener el número de mediciones para calcular el promedio
            inverter_measurements_count = Measurement.objects.filter(
                date__date=single_date,
                device__in=inverter_ids,
                data__acPower__isnull=False
            ).count()

            if inverter_measurements_count > 0:
                # Calcular potencia promedio del día
                avg_power_w = daily_generation_sum / inverter_measurements_count
                # Convertir a energía (24 horas)
                daily_generation_kwh = (avg_power_w * 24) / 1000.0
            else:
                daily_generation_kwh = 0.0

            # Calcular balance energético (ambos en kWh)
            daily_balance_sum = daily_generation_kwh - daily_consumption_kwh

            daily_data_obj, created = DailyChartData.objects.update_or_create(
                date=single_date,
                defaults={
                    'daily_consumption': daily_consumption_kwh,  # Ahora en kWh
                    'daily_generation': daily_generation_kwh,    # Ahora en kWh
                    'daily_balance': daily_balance_sum,
                    'avg_daily_temp': daily_temp_avg
                }
            )
            
            if created:
                total_records_created += 1
                action = "creado"
            else:
                total_records_updated += 1
                action = "actualizado"
                
            logger.info(f"  Dato diario {action} para {single_date}:")
            logger.info(f"    - Consumo: {daily_consumption_kwh:.2f} kWh")
            logger.info(f"    - Generación: {daily_generation_kwh:.2f} kWh")
            logger.info(f"    - Balance: {daily_balance_sum:.2f} kWh")
            logger.info(f"    - Temperatura promedio: {daily_temp_avg:.2f} °C")

            current_date += timedelta(days=1)
            total_days_processed += 1

        logger.info("=== RESUMEN DE PROCESAMIENTO ===")
        logger.info(f"Días procesados: {total_days_processed}")
        logger.info(f"Registros creados: {total_records_created}")
        logger.info(f"Registros actualizados: {total_records_updated}")
        logger.info("=== TAREA COMPLETADA: calculate_and_save_daily_data ===")

    except Exception as e:
        logger.error(f"=== ERROR EN TAREA: calculate_and_save_daily_data ===")
        logger.error(f"Error en el cálculo de datos diarios: {e}", exc_info=True)
        raise

@shared_task(bind=True, retry_backoff=60, max_retries=3)
def calculate_electric_meter_data(self, time_range='daily', start_date_str=None, end_date_str=None, institution_id=None, device_id=None):
    """
    Calcula y almacena datos de consumo de medidores eléctricos para un rango de tiempo específico.
    
    Args:
        time_range: 'daily' o 'monthly'
        start_date_str: fecha de inicio en formato ISO
        end_date_str: fecha de fin en formato ISO
        institution_id: ID de la institución (opcional)
        device_id: ID del dispositivo específico (opcional)
    """
    logger.info("=== INICIANDO TAREA: calculate_electric_meter_data ===")
    try:
        # Procesar fechas
        if not start_date_str or not end_date_str:
            # Por defecto, último mes
            end_date = get_colombia_date()
            start_date = end_date - timedelta(days=30)
        else:
            start_date = datetime.fromisoformat(start_date_str).date()
            end_date = datetime.fromisoformat(end_date_str).date()

        logger.info(f"Calculando datos para rango: {time_range}, desde {start_date} hasta {end_date}")

        # Obtener medidores eléctricos filtrados
        electric_meters = Device.objects.filter(category__name='electricMeter', is_active=True)
        
        if institution_id:
            electric_meters = electric_meters.filter(institution_id=institution_id)
            logger.info(f"Filtrado por institución ID: {institution_id}")
        
        if device_id:
            electric_meters = electric_meters.filter(scada_id=device_id)
            logger.info(f"Filtrado por dispositivo ID: {device_id}")

        logger.info(f"Procesando {electric_meters.count()} medidores eléctricos")

        total_records_created = 0
        total_records_updated = 0

        for meter in electric_meters:
            logger.info(f"Procesando medidor: {meter.name} (ID: {meter.id}, SCADA ID: {meter.scada_id})")
            
            if time_range == 'daily':
                records_created, records_updated = _calculate_daily_data(meter, start_date, end_date)
            else:  # monthly
                records_created, records_updated = _calculate_monthly_data(meter, start_date, end_date)
            
            total_records_created += records_created
            total_records_updated += records_updated

        logger.info(f"=== RESUMEN DE PROCESAMIENTO ===")
        logger.info(f"Registros creados: {total_records_created}")
        logger.info(f"Registros actualizados: {total_records_updated}")
        logger.info("=== TAREA COMPLETADA: calculate_electric_meter_data ===")

        return f"Procesados {electric_meters.count()} medidores. Creados: {total_records_created}, Actualizados: {total_records_updated}"

    except Exception as e:
        logger.error(f"=== ERROR EN TAREA: calculate_electric_meter_data ===")
        logger.error(f"Error calculando datos de medidores eléctricos: {e}", exc_info=True)
        raise

def _calculate_daily_data(meter, start_date, end_date):
    """
    Calcula datos diarios para un medidor específico
    """
    records_created = 0
    records_updated = 0
    
    current_date = start_date
    while current_date <= end_date:
        logger.info(f"  Procesando fecha: {current_date}")
        
        # Obtener mediciones del día
        daily_measurements = Measurement.objects.filter(
            device=meter,
            date__date=current_date,
            data__totalActivePower__isnull=False
        ).order_by('date')

        if not daily_measurements.exists():
            logger.info(f"    No hay mediciones para {current_date}")
            current_date += timedelta(days=1)
            continue

        # Calcular métricas diarias
        daily_stats = daily_measurements.aggregate(
            total_consumption=Sum(Cast(F('data__totalActivePower'), FloatField())),
            peak_demand=Max(Cast(F('data__totalActivePower'), FloatField())),
            avg_demand=Avg(Cast(F('data__totalActivePower'), FloatField())),
            measurement_count=Count('id'),
            last_measurement=Max('date')
        )

        # Calcular consumo acumulado (diferencia entre primera y última medición)
        first_measurement = daily_measurements.first()
        last_measurement = daily_measurements.last()
        
        cumulative_consumption = 0.0
        if first_measurement and last_measurement:
            first_value = first_measurement.data.get('totalActivePower', 0)
            last_value = last_measurement.data.get('totalActivePower', 0)
            cumulative_consumption = max(0, last_value - first_value)

        # Crear o actualizar registro de consumo
        consumption_record, created = ElectricMeterConsumption.objects.update_or_create(
            device=meter,
            institution=meter.institution,
            date=current_date,
            time_range='daily',
            defaults={
                'cumulative_active_power': cumulative_consumption,
                'total_active_power': daily_stats['total_consumption'] or 0.0,
                'peak_demand': daily_stats['peak_demand'] or 0.0,
                'avg_demand': daily_stats['avg_demand'] or 0.0,
                'measurement_count': daily_stats['measurement_count'] or 0,
                'last_measurement_date': daily_stats['last_measurement']
            }
        )

        if created:
            records_created += 1
        else:
            records_updated += 1

        # Calcular datos para gráficos (consumo por hora)
        hourly_consumption = _calculate_hourly_consumption(daily_measurements)
        
        # Encontrar hora pico
        peak_hour = 0
        peak_value = 0.0
        for hour, consumption in enumerate(hourly_consumption):
            if consumption > peak_value:
                peak_value = consumption
                peak_hour = hour

        # Crear o actualizar datos de gráfico
        chart_record, chart_created = ElectricMeterChartData.objects.update_or_create(
            device=meter,
            institution=meter.institution,
            date=current_date,
            defaults={
                'hourly_consumption': hourly_consumption,
                'daily_consumption': daily_stats['total_consumption'] or 0.0,
                'peak_hour': peak_hour,
                'peak_value': peak_value
            }
        )

        current_date += timedelta(days=1)

    return records_created, records_updated

def _calculate_monthly_data(meter, start_date, end_date):
    """
    Calcula datos mensuales para un medidor específico
    """
    records_created = 0
    records_updated = 0
    
    # Agrupar por mes
    current_date = start_date.replace(day=1)  # Primer día del mes
    while current_date <= end_date:
        month_end = (current_date.replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        month_end = min(month_end, end_date)
        
        logger.info(f"  Procesando mes: {current_date.month}/{current_date.year}")
        
        # Obtener mediciones del mes
        monthly_measurements = Measurement.objects.filter(
            device=meter,
            date__date__range=(current_date, month_end),
            data__totalActivePower__isnull=False
        ).order_by('date')

        if not monthly_measurements.exists():
            logger.info(f"    No hay mediciones para {current_date.month}/{current_date.year}")
            current_date = (current_date.replace(day=1) + timedelta(days=32)).replace(day=1)
            continue

        # Calcular métricas mensuales
        monthly_stats = monthly_measurements.aggregate(
            total_consumption=Sum(Cast(F('data__totalActivePower'), FloatField())),
            peak_demand=Max(Cast(F('data__totalActivePower'), FloatField())),
            avg_demand=Avg(Cast(F('data__totalActivePower'), FloatField())),
            measurement_count=Count('id'),
            last_measurement=Max('date')
        )

        # Calcular consumo acumulado del mes
        first_measurement = monthly_measurements.first()
        last_measurement = monthly_measurements.last()
        
        cumulative_consumption = 0.0
        if first_measurement and last_measurement:
            first_value = first_measurement.data.get('totalActivePower', 0)
            last_value = last_measurement.data.get('totalActivePower', 0)
            cumulative_consumption = max(0, last_value - first_value)

        # Crear o actualizar registro de consumo
        consumption_record, created = ElectricMeterConsumption.objects.update_or_create(
            device=meter,
            institution=meter.institution,
            date=current_date,
            time_range='monthly',
            defaults={
                'cumulative_active_power': cumulative_consumption,
                'total_active_power': monthly_stats['total_consumption'] or 0.0,
                'peak_demand': monthly_stats['peak_demand'] or 0.0,
                'avg_demand': monthly_stats['avg_demand'] or 0.0,
                'measurement_count': monthly_stats['measurement_count'] or 0,
                'last_measurement_date': monthly_stats['last_measurement']
            }
        )

        if created:
            records_created += 1
        else:
            records_updated += 1

        current_date = (current_date.replace(day=1) + timedelta(days=32)).replace(day=1)

    return records_created, records_updated

def _calculate_hourly_consumption(measurements):
    """
    Calcula el consumo por hora del día basado en las mediciones
    """
    hourly_data = defaultdict(list)
    
    for measurement in measurements:
        hour = measurement.date.hour
        power_value = measurement.data.get('totalActivePower', 0)
        hourly_data[hour].append(power_value)
    
    # Calcular promedio por hora
    hourly_consumption = [0.0] * 24
    for hour in range(24):
        if hour in hourly_data:
            hourly_consumption[hour] = sum(hourly_data[hour]) / len(hourly_data[hour])
    
    return hourly_consumption

# indicators/tasks.py
@shared_task(bind=True, retry_backoff=60, max_retries=3)
def calculate_electric_meter_energy_consumption(
    self, 
    time_range='daily', 
    start_date_str=None, 
    end_date_str=None, 
    institution_id=None, 
    device_id=None
):
    """
    Calcula el consumo de energía para medidores eléctricos según las fórmulas del documento técnico
    """
    logger.info("=== INICIANDO TAREA: calculate_electric_meter_energy_consumption ===")
    
    try:
        # Parsear fechas
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else get_colombia_date() - timedelta(days=30)
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else get_colombia_date()
        
        # Obtener medidores eléctricos
        meters_query = Device.objects.filter(category__name='electricMeter', is_active=True)
        if institution_id:
            meters_query = meters_query.filter(institution_id=institution_id)
        if device_id:
            meters_query = meters_query.filter(scada_id=device_id)
        
        meters = meters_query.select_related('institution')
        logger.info(f"Procesando {meters.count()} medidores eléctricos")
        
        records_created = 0
        records_updated = 0
        
        for meter in meters:
            logger.info(f"Procesando medidor: {meter.name} ({meter.institution.name})")
            
            if time_range == 'daily':
                created, updated = _calculate_daily_energy_data(meter, start_date, end_date)
            else:  # monthly
                created, updated = _calculate_monthly_energy_data(meter, start_date, end_date)
            
            records_created += created
            records_updated += updated
        
        logger.info(f"=== RESUMEN: {records_created} creados, {records_updated} actualizados ===")
        return records_created, records_updated
        
    except Exception as e:
        logger.error(f"Error en cálculo de energía: {e}", exc_info=True)
        raise

def _calculate_daily_energy_data(meter, start_date, end_date):
    """Calcula datos diarios de energía según la fórmula del documento técnico"""
    records_created = 0
    records_updated = 0
    
    current_date = start_date
    while current_date <= end_date:
        # Obtener mediciones del día
        day_start = datetime.combine(current_date, datetime.min.time())
        day_end = datetime.combine(current_date, datetime.max.time())
        
        measurements = Measurement.objects.filter(
            device=meter,
            date__range=(day_start, day_end),
            data__importedActivePowerLow__isnull=False,
            data__importedActivePowerHigh__isnull=False
        ).order_by('date')
        
        if measurements.exists():
            # Primera y última medición del día
            first_measurement = measurements.first()
            last_measurement = measurements.last()
            
            # Calcular energía importada según fórmula del documento
            start_imported_high = first_measurement.data.get('importedActivePowerHigh', 0) * 1000  # MWh a kWh
            start_imported_low = first_measurement.data.get('importedActivePowerLow', 0)
            start_total = start_imported_high + start_imported_low
            
            end_imported_high = last_measurement.data.get('importedActivePowerHigh', 0) * 1000  # MWh a kWh
            end_imported_low = last_measurement.data.get('importedActivePowerLow', 0)
            end_total = end_imported_high + end_imported_low
            
            # Energía diaria importada = diferencia entre final e inicio del día
            daily_imported_energy = max(0, end_total - start_total)
            
            # Calcular energía exportada de manera similar
            start_exported_high = first_measurement.data.get('exportedActivePowerHigh', 0) * 1000
            start_exported_low = first_measurement.data.get('exportedActivePowerLow', 0)
            start_exported_total = start_exported_high + start_exported_low
            
            end_exported_high = last_measurement.data.get('exportedActivePowerHigh', 0) * 1000
            end_exported_low = last_measurement.data.get('exportedActivePowerLow', 0)
            end_exported_total = end_exported_high + end_exported_low
            
            daily_exported_energy = max(0, end_exported_total - start_exported_total)
            
            # Balance neto
            net_energy_consumption = daily_imported_energy - daily_exported_energy
            
            # Crear o actualizar registro
            consumption_record, created = ElectricMeterEnergyConsumption.objects.update_or_create(
                device=meter,
                institution=meter.institution,
                date=current_date,
                time_range='daily',
                defaults={
                    'imported_energy_low': start_imported_low,
                    'imported_energy_high': start_imported_high / 1000,  # Guardar en MWh
                    'total_imported_energy': daily_imported_energy,
                    'exported_energy_low': start_exported_low,
                    'exported_energy_high': start_exported_high / 1000,  # Guardar en MWh
                    'total_exported_energy': daily_exported_energy,
                    'net_energy_consumption': net_energy_consumption,
                    'measurement_count': measurements.count(),
                    'last_measurement_date': last_measurement.date
                }
            )
            
            if created:
                records_created += 1
            else:
                records_updated += 1
        
        current_date += timedelta(days=1)
    
    return records_created, records_updated

def _calculate_monthly_energy_data(meter, start_date, end_date):
    """Calcula datos mensuales de energía según la fórmula del documento técnico"""
    records_created = 0
    records_updated = 0
    
    # Agrupar por mes
    current_date = start_date.replace(day=1)  # Primer día del mes
    while current_date <= end_date:
        month_end = (current_date.replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        month_end = min(month_end, end_date)
        
        # Obtener mediciones del mes
        month_start = datetime.combine(current_date, datetime.min.time())
        month_end_datetime = datetime.combine(month_end, datetime.max.time())
        
        measurements = Measurement.objects.filter(
            device=meter,
            date__range=(month_start, month_end_datetime),
            data__importedActivePowerLow__isnull=False,
            data__importedActivePowerHigh__isnull=False
        ).order_by('date')
        
        if measurements.exists():
            # Primera y última medición del mes
            first_measurement = measurements.first()
            last_measurement = measurements.last()
            
            # Calcular energía importada según fórmula del documento
            start_imported_high = first_measurement.data.get('importedActivePowerHigh', 0) * 1000  # MWh a kWh
            start_imported_low = first_measurement.data.get('importedActivePowerLow', 0)
            start_total = start_imported_high + start_imported_low
            
            end_imported_high = last_measurement.data.get('importedActivePowerHigh', 0) * 1000  # MWh a kWh
            end_imported_low = last_measurement.data.get('importedActivePowerLow', 0)
            end_total = end_imported_high + end_imported_low
            
            # Energía mensual importada = diferencia entre final e inicio del mes
            monthly_imported_energy = max(0, end_total - start_total)
            
            # Calcular energía exportada de manera similar
            start_exported_high = first_measurement.data.get('exportedActivePowerHigh', 0) * 1000
            start_exported_low = first_measurement.data.get('exportedActivePowerLow', 0)
            start_exported_total = start_exported_high + start_exported_low
            
            end_exported_high = last_measurement.data.get('exportedActivePowerHigh', 0) * 1000
            end_exported_low = last_measurement.data.get('exportedActivePowerLow', 0)
            end_exported_total = end_exported_high + end_exported_low
            
            monthly_exported_energy = max(0, end_exported_total - start_exported_total)
            
            # Balance neto
            net_energy_consumption = monthly_imported_energy - monthly_exported_energy
            
            # Crear o actualizar registro
            consumption_record, created = ElectricMeterEnergyConsumption.objects.update_or_create(
                device=meter,
                institution=meter.institution,
                date=current_date,
                time_range='monthly',
                defaults={
                    'imported_energy_low': start_imported_low,
                    'imported_energy_high': start_imported_high / 1000,  # Guardar en MWh
                    'total_imported_energy': monthly_imported_energy,
                    'exported_energy_low': start_exported_low,
                    'exported_energy_high': start_exported_high / 1000,  # Guardar en MWh
                    'total_exported_energy': monthly_exported_energy,
                    'net_energy_consumption': net_energy_consumption,
                    'measurement_count': measurements.count(),
                    'last_measurement_date': last_measurement.date
                }
            )
            
            if created:
                records_created += 1
            else:
                records_updated += 1
        
        # Avanzar al siguiente mes
        current_date = (current_date.replace(day=1) + timedelta(days=32)).replace(day=1)
    
    return records_created, records_updated

@shared_task
def calculate_electric_meter_indicators(device_id, date_str, time_range='daily'):
    """
    Calcula todos los indicadores eléctricos para un medidor específico en una fecha dada.
    """
    try:
        from datetime import datetime, timedelta
        from django.db.models import Max, Min, Avg
        from scada_proxy.models import Device, Institution
        from .models import ElectricMeterIndicators, Measurement
        
        # Parsear la fecha
        if isinstance(date_str, str):
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        else:
            date = date_str
        
        # Obtener el dispositivo y la institución
        device = Device.objects.get(id=device_id)
        institution = device.institution
        
        # Determinar el rango de fechas
        if time_range == 'daily':
            start_date = date
            end_date = date + timedelta(days=1)
        else:  # monthly
            start_date = date.replace(day=1)
            if date.month == 12:
                end_date = date.replace(year=date.year + 1, month=1, day=1)
            else:
                end_date = date.replace(month=date.month + 1, day=1)
        
        # Obtener todas las mediciones del período
        measurements = Measurement.objects.filter(
            device=device,
            date__gte=start_date,
            date__lt=end_date
        ).order_by('date')
        
        if not measurements.exists():
            return f"No hay mediciones para {device.name} en {date}"
        
        # Inicializar variables para cálculos
        imported_energy_low_start = None
        imported_energy_high_start = None
        exported_energy_low_start = None
        exported_energy_high_start = None
        
        imported_energy_low_end = None
        imported_energy_high_end = None
        exported_energy_low_end = None
        exported_energy_high_end = None
        
        total_active_power_values = []
        power_factor_values = []
        voltage_phases = []
        current_phases = []
        voltage_thd_values = []
        current_thd_values = []
        current_tdd_values = []
        
        # Procesar cada medición
        for measurement in measurements:
            data = measurement.data
            
            # Energía acumulada (primer y último valor)
            if imported_energy_low_start is None:
                imported_energy_low_start = data.get('importedActivePowerLow', 0)
                imported_energy_high_start = data.get('importedActivePowerHigh', 0)
                exported_energy_low_start = data.get('exportedActivePowerLow', 0)
                exported_energy_high_start = data.get('exportedActivePowerHigh', 0)
            
            imported_energy_low_end = data.get('importedActivePowerLow', 0)
            imported_energy_high_end = data.get('importedActivePowerHigh', 0)
            exported_energy_low_end = data.get('exportedActivePowerLow', 0)
            exported_energy_high_end = data.get('exportedActivePowerHigh', 0)
            
            # Potencia activa para demanda pico
            total_active_power = data.get('totalActivePower', 0)
            if total_active_power is not None:
                total_active_power_values.append(total_active_power)
            
            # Factor de potencia
            power_factor = data.get('totalPowerFactor', 0)
            if power_factor is not None:
                power_factor_values.append(power_factor)
            
            # Voltajes por fase
            voltage_a = data.get('voltagePhaseA', 0)
            voltage_b = data.get('voltagePhaseB', 0)
            voltage_c = data.get('voltagePhaseC', 0)
            if all(v is not None for v in [voltage_a, voltage_b, voltage_c]):
                voltage_phases.append([voltage_a, voltage_b, voltage_c])
            
            # Corrientes por fase
            current_a = data.get('currentPhaseA', 0)
            current_b = data.get('currentPhaseB', 0)
            current_c = data.get('currentPhaseC', 0)
            if all(c is not None for c in [current_a, current_b, current_c]):
                current_phases.append([current_a, current_b, current_c])
            
            # THD y TDD
            voltage_thd_a = data.get('voltageTHDPhaseA', 0)
            voltage_thd_b = data.get('voltageTHDPhaseB', 0)
            voltage_thd_c = data.get('voltageTHDPhaseC', 0)
            if all(thd is not None for thd in [voltage_thd_a, voltage_thd_b, voltage_thd_c]):
                voltage_thd_values.extend([voltage_thd_a, voltage_thd_b, voltage_thd_c])
            
            current_thd_a = data.get('currentTHDPhaseA', 0)
            current_thd_b = data.get('currentTHDPhaseB', 0)
            current_thd_c = data.get('currentTHDPhaseC', 0)
            if all(thd is not None for thd in [current_thd_a, current_thd_b, current_thd_c]):
                current_thd_values.extend([current_thd_a, current_thd_b, current_thd_c])
            
            current_tdd_a = data.get('currentTDDPhaseA', 0)
            current_tdd_b = data.get('currentTDDPhaseB', 0)
            current_tdd_c = data.get('currentTDDPhaseC', 0)
            if all(tdd is not None for tdd in [current_tdd_a, current_tdd_b, current_tdd_c]):
                current_tdd_values.extend([current_tdd_a, current_tdd_b, current_tdd_c])
        
        # Calcular indicadores
        
        # 3.2. Energía Consumida Acumulada
        imported_energy_kwh = (
            (imported_energy_high_end - imported_energy_high_start) * 1000 +
            (imported_energy_low_end - imported_energy_low_start)
        )
        exported_energy_kwh = (
            (exported_energy_high_end - exported_energy_high_start) * 1000 +
            (exported_energy_low_end - exported_energy_low_start)
        )
        net_energy_consumption_kwh = imported_energy_kwh - exported_energy_kwh
        
        # 3.3. Demanda Pico
        if total_active_power_values:
            # Calcular demanda pico usando promedio móvil de 15 minutos
            # Como tenemos datos cada 2 minutos, 15 minutos = 7-8 mediciones
            window_size = 7
            moving_averages = []
            for i in range(len(total_active_power_values) - window_size + 1):
                window_avg = sum(total_active_power_values[i:i+window_size]) / window_size
                moving_averages.append(window_avg)
            
            peak_demand_kw = max(moving_averages) if moving_averages else max(total_active_power_values)
            avg_demand_kw = sum(total_active_power_values) / len(total_active_power_values)
        else:
            peak_demand_kw = 0
            avg_demand_kw = 0
        
        # 3.4. Factor de Carga
        if peak_demand_kw > 0:
            hours_in_period = 24 if time_range == 'daily' else 24 * 30
            load_factor_pct = (net_energy_consumption_kwh / (peak_demand_kw * hours_in_period)) * 100
        else:
            load_factor_pct = 0
        
        # 3.5. Factor de Potencia Promedio
        if power_factor_values:
            avg_power_factor = sum(power_factor_values) / len(power_factor_values)
        else:
            avg_power_factor = 0
        
        # 3.6. Desbalance de Fases
        max_voltage_unbalance_pct = 0
        max_current_unbalance_pct = 0
        
        if voltage_phases:
            voltage_unbalances = []
            for v_phases in voltage_phases:
                v_avg = sum(v_phases) / 3
                max_deviation = max(abs(v - v_avg) for v in v_phases)
                unbalance_pct = (max_deviation / v_avg) * 100 if v_avg > 0 else 0
                voltage_unbalances.append(unbalance_pct)
            max_voltage_unbalance_pct = max(voltage_unbalances) if voltage_unbalances else 0
        
        if current_phases:
            current_unbalances = []
            for c_phases in current_phases:
                c_avg = sum(c_phases) / 3
                max_deviation = max(abs(c - c_avg) for c in c_phases)
                unbalance_pct = (max_deviation / c_avg) * 100 if c_avg > 0 else 0
                current_unbalances.append(unbalance_pct)
            max_current_unbalance_pct = max(current_unbalances) if current_unbalances else 0
        
        # 3.7. THD y TDD
        max_voltage_thd_pct = max(voltage_thd_values) if voltage_thd_values else 0
        max_current_thd_pct = max(current_thd_values) if current_thd_values else 0
        max_current_tdd_pct = max(current_tdd_values) if current_tdd_values else 0
        
        # Guardar o actualizar los indicadores
        indicators, created = ElectricMeterIndicators.objects.update_or_create(
            device=device,
            institution=institution,
            date=date,
            time_range=time_range,
            defaults={
                'imported_energy_kwh': imported_energy_kwh,
                'exported_energy_kwh': exported_energy_kwh,
                'net_energy_consumption_kwh': net_energy_consumption_kwh,
                'peak_demand_kw': peak_demand_kw,
                'avg_demand_kw': avg_demand_kw,
                'load_factor_pct': load_factor_pct,
                'avg_power_factor': avg_power_factor,
                'max_voltage_unbalance_pct': max_voltage_unbalance_pct,
                'max_current_unbalance_pct': max_current_unbalance_pct,
                'max_voltage_thd_pct': max_voltage_thd_pct,
                'max_current_thd_pct': max_current_thd_pct,
                'max_current_tdd_pct': max_current_tdd_pct,
                'measurement_count': measurements.count(),
                'last_measurement_date': measurements.last().date if measurements.exists() else None,
            }
        )
        
        action = "creado" if created else "actualizado"
        return f"Indicadores eléctricos {action} para {device.name} en {date} ({time_range})"
        
    except Exception as e:
        return f"Error calculando indicadores eléctricos: {str(e)}"


@shared_task
def calculate_all_electric_meter_indicators(time_range='daily', start_date=None, end_date=None):
    """
    Calcula indicadores eléctricos para todos los medidores en un rango de fechas.
    """
    try:
        from datetime import datetime, timedelta
        from scada_proxy.models import Device, DeviceCategory
        
        # Obtener todos los medidores eléctricos
        electric_meter_category = DeviceCategory.objects.filter(name='electricMeter').first()
        if not electric_meter_category:
            return "No se encontró la categoría de medidores eléctricos"
        
        electric_meters = Device.objects.filter(
            category=electric_meter_category,
            is_active=True
        )
        
        if not electric_meters.exists():
            return "No se encontraron medidores eléctricos activos"
        
        # Determinar fechas si no se proporcionan
        if not start_date:
            if time_range == 'daily':
                start_date = datetime.now().date() - timedelta(days=7)  # Últimos 7 días
            else:
                start_date = datetime.now().date().replace(day=1) - timedelta(days=30)  # Último mes
        
        if not end_date:
            end_date = datetime.now().date()
        
        # Calcular indicadores para cada medidor y fecha
        total_calculations = 0
        successful_calculations = 0
        
        current_date = start_date
        while current_date <= end_date:
            for meter in electric_meters:
                try:
                    result = calculate_electric_meter_indicators.delay(
                        meter.id, 
                        current_date.strftime('%Y-%m-%d'), 
                        time_range
                    )
                    total_calculations += 1
                    successful_calculations += 1
                except Exception as e:
                    total_calculations += 1
                    print(f"Error calculando indicadores para {meter.name} en {current_date}: {e}")
            
            # Avanzar al siguiente período
            if time_range == 'daily':
                current_date += timedelta(days=1)
            else:
                # Avanzar al siguiente mes
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
        
        return f"Proceso completado. {successful_calculations}/{total_calculations} cálculos exitosos."
        
    except Exception as e:
        return f"Error en el proceso masivo: {str(e)}"