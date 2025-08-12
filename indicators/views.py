# Importaciones existentes
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample, OpenApiRequest, OpenApiResponse
from drf_spectacular.types import OpenApiTypes
import logging
from datetime import datetime, timedelta, timezone, date
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
import uuid 
import requests
import calendar
import pytz

# Importa los modelos de indicadores
from .models import ElectricMeterEnergyConsumption, MonthlyConsumptionKPI, DailyChartData, ElectricMeterConsumption, ElectricMeterChartData, ElectricMeterIndicators, InverterIndicators, InverterChartData, WeatherStationIndicators, WeatherStationChartData
# Importa el cliente SCADA y los modelos DeviceCategory, Measurement, Device de scada_proxy
from scada_proxy.scada_client import ScadaConnectorClient 
from scada_proxy.models import DeviceCategory, Measurement, Device, Institution
# Importa las tareas de Celery
from .tasks import calculate_monthly_consumption_kpi, calculate_and_save_daily_data

# Importaciones adicionales para los nuevos modelos - CORREGIDAS
from django.db.models import Q, Sum, Avg, Max, F, FloatField, Count, Min
from django.db.models.functions import Cast
from .serializers import ElectricMeterEnergySerializer, MonthlyConsumptionKPISerializer, DailyChartDataSerializer, ElectricMeterConsumptionSerializer, ElectricMeterChartDataSerializer, ElectricMeterCalculationRequestSerializer, ElectricMeterCalculationResponseSerializer, ElectricMeterIndicatorsSerializer, InverterIndicatorsSerializer, InverterChartDataSerializer, InverterCalculationRequestSerializer, InverterCalculationResponseSerializer, WeatherStationIndicatorsSerializer, WeatherStationChartDataSerializer, WeatherStationCalculationRequestSerializer, WeatherStationCalculationResponseSerializer
from collections import defaultdict

logger = logging.getLogger(__name__)

scada_client = ScadaConnectorClient() 

# Zona horaria de Colombia
COLOMBIA_TZ = pytz.timezone('America/Bogota')

def get_colombia_now():
    """Obtiene la fecha y hora actual en zona horaria de Colombia"""
    from django.utils import timezone as dj_timezone
    return dj_timezone.now().astimezone(COLOMBIA_TZ)

def get_colombia_date():
    """Obtiene la fecha actual en zona horaria de Colombia"""
    return get_colombia_now().date()

@method_decorator(cache_page(60 * 5), name='dispatch')
class ConsumptionSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get_scada_token(self):
        try:
            return scada_client.get_token()
        except EnvironmentError as e:
            logger.error(f"SCADA configuration error: {e}")
            return Response({"detail": "SCADA server configuration error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting SCADA token: {e}")
            return Response({"detail": "No se pudo autenticar con la API SCADA. Revise las credenciales."}, status=status.HTTP_502_BAD_GATEWAY)

    @extend_schema(
        summary="Obtener resumen de consumo, generación y balance energético",
        description="Obtiene el resumen de consumo, generación y balance energético mensual",
        responses={
            200: {
                "type": "object",
                "properties": {
                    "totalConsumption": {"type": "object"},
                    "totalGeneration": {"type": "object"},
                    "energyBalance": {"type": "object"},
                    "averageInstantaneousPower": {"type": "object"},
                    "avgDailyTemp": {"type": "object"},
                    "relativeHumidity": {"type": "object"},
                    "windSpeed": {"type": "object"},
                    "activeInverters": {"type": "object"},
                }
            },
            500: {"description": "Error interno del servidor"},
        },
        tags=["Dashboard"]
    )
    def get(self, request, *args, **kwargs):
        """
        GET /api/dashboard/summary/
        
        Obtiene el resumen de consumo, generación y balance energético mensual.
        """
        token = self.get_scada_token()
        if isinstance(token, Response):
            return token

        try:
            # Obtener el registro de KPI pre-calculado
            kpi_record = MonthlyConsumptionKPI.objects.first()
            if not kpi_record:
                logger.warning("MonthlyConsumptionKPI record not found. Task might not have run yet.")
                # Si el registro no existe, devolvemos valores por defecto en lugar de un error.
                kpi_record = MonthlyConsumptionKPI()

            # --- Consumo Total ---
            total_consumption_current_month = kpi_record.total_consumption_current_month
            total_consumption_previous_month = kpi_record.total_consumption_previous_month
            
            # --- Generación Total ---
            total_generation_current_month = kpi_record.total_generation_current_month
            total_generation_previous_month = kpi_record.total_generation_previous_month

            # --- Balance Energético (Generación - Consumo) ---
            # Ahora ambos valores están en kWh
            net_balance_current_month = total_generation_current_month - total_consumption_current_month
            net_balance_previous_month = total_generation_previous_month - total_consumption_previous_month

            logger.info(f"Retrieved pre-calculated KPIs: Consumption (C:{total_consumption_current_month}, P:{total_consumption_previous_month}), Generation (C:{total_generation_current_month}, P:{total_generation_previous_month}), Balance (C:{net_balance_current_month}, P:{net_balance_previous_month})")

            # --- Potencia Instantánea Promedio (Inversores) ---
            avg_instantaneous_power_current = kpi_record.avg_instantaneous_power_current_month
            avg_instantaneous_power_previous = kpi_record.avg_instantaneous_power_previous_month

            logger.info(f"Avg Instantaneous Power: Current: {avg_instantaneous_power_current} W, Previous: {avg_instantaneous_power_previous} W")

            # --- Temperatura Promedio Diaria ---
            avg_daily_temp_current = kpi_record.avg_daily_temp_current_month
            avg_daily_temp_previous = kpi_record.avg_daily_temp_previous_month
            logger.info(f"Avg Daily Temperature: Current: {avg_daily_temp_current} °C, Previous: {avg_daily_temp_previous} °C")

            # --- Humedad Relativa Promedio ---
            avg_relative_humidity_current = kpi_record.avg_relative_humidity_current_month
            avg_relative_humidity_previous = kpi_record.avg_relative_humidity_previous_month
            logger.info(f"Avg Relative Humidity: Current: {avg_relative_humidity_current} %RH, Previous: {avg_relative_humidity_previous} %RH")

            # --- Velocidad del Viento Promedio ---
            avg_wind_speed_current = kpi_record.avg_wind_speed_current_month
            avg_wind_speed_previous = kpi_record.avg_wind_speed_previous_month
            logger.info(f"Avg Wind Speed: Current: {avg_wind_speed_current} km/h, Previous: {avg_wind_speed_previous} km/h")

            # --- Inversores Activos (Real-time from SCADA API) ---
            active_inverters_count = 0
            total_inverters_count = 0
            inverter_status_text = "normal"
            inverter_description_text = "Cargando..."

            try:
                inverter_category_obj = DeviceCategory.objects.get(name='inverter')
                inverter_scada_id = inverter_category_obj.scada_id

                scada_inverters_response = scada_client.get_devices(token, category_scada_id=inverter_scada_id) 
                scada_inverters = scada_inverters_response.get('data', [])

                total_inverters_count = len(scada_inverters)
                online_inverters_count = 0

                for inverter in scada_inverters:
                    if inverter.get('status') == 'online':
                        online_inverters_count += 1
                
                active_inverters_count = online_inverters_count
                inactive_inverters_count = total_inverters_count - active_inverters_count

                if total_inverters_count > 0:
                    if inactive_inverters_count > 0:
                        inverter_status_text = "critico"
                        inverter_description_text = f"{inactive_inverters_count} inactivos"
                    else:
                        inverter_status_text = "estable"
                        inverter_description_text = "Todos activos"
                else:
                    inverter_status_text = "normal"
                    inverter_description_text = "Sin inversores registrados"

                logger.info(f"Inverters: Active: {active_inverters_count}, Total: {total_inverters_count}")

            except DeviceCategory.DoesNotExist:
                logger.error("Inverter category not found in local DB. Cannot fetch real-time inverters from SCADA.")
                inverter_status_text = "error"
                inverter_description_text = "Categoría 'inverter' no encontrada localmente."
            except requests.exceptions.RequestException as e:
                logger.error(f"Error getting real-time inverter data from SCADA: {e}")
                inverter_status_text = "error"
                inverter_description_text = "Error de conexión SCADA"
            except Exception as e:
                logger.error(f"Error processing real-time inverter data: {e}", exc_info=True)
                inverter_status_text = "error"
                inverter_description_text = "Error interno"

            # Función de conversión de unidades
            def format_energy_value(value_base_unit, base_unit_name="kWh"):
                # Manejar valores negativos para el equilibrio energético
                is_negative = value_base_unit < 0
                abs_value = abs(value_base_unit)
                
                if base_unit_name == "kWh":
                    if abs_value >= 1_000_000:
                        formatted_value = abs_value / 1_000_000
                        unit = "GWh"
                    elif abs_value >= 1_000:
                        formatted_value = abs_value / 1_000
                        unit = "MWh"
                    else:
                        formatted_value = abs_value
                        unit = "kWh"
                    
                    # Aplicar signo negativo si es necesario
                    if is_negative:
                        return f"-{formatted_value:.2f}", unit
                    else:
                        return f"{formatted_value:.2f}", unit
                elif base_unit_name == "W":
                    if abs_value >= 1_000_000:
                        formatted_value = abs_value / 1_000_000
                        unit = "MW"
                    elif abs_value >= 1_000:
                        formatted_value = abs_value / 1_000
                        unit = "kW"
                    else:
                        formatted_value = abs_value
                        unit = "W"
                    
                    # Aplicar signo negativo si es necesario
                    if is_negative:
                        return f"-{formatted_value:.2f}", unit
                    else:
                        return f"{formatted_value:.2f}", unit
                elif base_unit_name == "°C": 
                    return f"{value_base_unit:.1f}", "°C" 
                elif base_unit_name == "%RH": 
                    return f"{value_base_unit:.1f}", "%" 
                elif base_unit_name == "km/h":
                    return f"{value_base_unit:.1f}", "km/h"
                return f"{value_base_unit:.2f}", base_unit_name

            def calculate_kpi_metrics(current_value, previous_value, title, base_unit_name, is_balance=False, is_average_power=False, is_temperature=False, is_humidity=False, is_wind_speed=False):
                formatted_value, unit = format_energy_value(current_value, base_unit_name)
                change_percentage = 0.0
                status_text = "normal"
                description_text = ""

                if previous_value != 0:
                    change_percentage = ((current_value - previous_value) / previous_value) * 100
                elif current_value != 0:
                    change_percentage = 100.0 if current_value > 0 else -100.0

                if is_balance:
                    if current_value > 0:
                        description_text = "Superávit"
                        status_text = "positivo"
                    elif current_value < 0:
                        description_text = "Déficit"
                        status_text = "negativo"
                    else:
                        description_text = "Equilibrio"
                        status_text = "normal"
                elif is_average_power:
                    if current_value > 0:
                        description_text = "Generando"
                        status_text = "estable"
                    else:
                        description_text = "Sin generación"
                        status_text = "normal" 
                    
                    if change_percentage > 0:
                        description_text += f" (+{change_percentage:.2f}%)"
                    elif change_percentage < 0:
                        description_text += f" ({change_percentage:.2f}%)"
                elif is_temperature: 
                    description_text = "Rango normal"
                    status_text = "normal" 
                    
                    if change_percentage > 0:
                        description_text += f" (+{change_percentage:.1f}%)" 
                    elif change_percentage < 0:
                        description_text += f" ({change_percentage:.1f}%)"
                elif is_humidity: 
                    if 40 <= current_value <= 60: 
                        description_text = "Óptimo"
                        status_text = "optimo"
                    elif current_value > 60:
                        description_text = "Alta"
                        status_text = "critico" 
                    else:
                        description_text = "Baja"
                        status_text = "critico" 

                    if change_percentage > 0:
                        description_text += f" (+{change_percentage:.1f}%)"
                    elif change_percentage < 0:
                        description_text += f" ({change_percentage:.1f}%)"
                elif is_wind_speed:
                    if current_value < 10:
                        description_text = "Bajo"
                        status_text = "normal"
                    elif 10 <= current_value <= 30:
                        description_text = "Moderado"
                        status_text = "moderado"
                    else:
                        description_text = "Alto"
                        status_text = "critico"

                    if change_percentage > 0:
                        description_text += f" (+{change_percentage:.1f}%)"
                    elif change_percentage < 0:
                        description_text += f" ({change_percentage:.1f}%)"
                    
                else: # Para consumo y generación
                    if change_percentage > 0:
                        status_text = "positivo"
                    elif change_percentage < 0:
                        status_text = "negativo"
                    else:
                        status_text = "normal"
                    
                    description_text = f"{'+' if change_percentage >= 0 else ''}{change_percentage:.2f}% vs mes pasado"

                change_text = f"{'+' if change_percentage >= 0 else ''}{change_percentage:.2f}% vs mes pasado"
                
                return {
                    "title": title,
                    "value": formatted_value,
                    "unit": unit,
                    "change": change_text,
                    "description": description_text,
                    "status": status_text
                }

            # KPI de Consumo Total
            consumption_kpi = calculate_kpi_metrics(
                total_consumption_current_month,
                total_consumption_previous_month,
                "Consumo total",
                "kWh"
            )

            # KPI de Generación Total
            generation_kpi = calculate_kpi_metrics(
                total_generation_current_month,
                total_generation_previous_month,
                "Generación total",
                "kWh" 
            )

            # KPI de Equilibrio Energético (Generación - Consumo)
            energy_balance_kpi = calculate_kpi_metrics(
                net_balance_current_month,
                net_balance_previous_month, 
                "Equilibrio energético",
                "kWh", 
                is_balance=True
            )

            # KPI de Potencia Instantánea Promedio
            avg_power_kpi = calculate_kpi_metrics(
                avg_instantaneous_power_current,
                avg_instantaneous_power_previous,
                "Pot. instan. promedio", 
                "W", 
                is_average_power=True 
            )

            # KPI de Temperatura Promedio Diaria
            avg_daily_temp_kpi = calculate_kpi_metrics(
                avg_daily_temp_current,
                avg_daily_temp_previous,
                "Temp. prom. diaria",
                "°C",
                is_temperature=True 
            )

            # KPI de Humedad Relativa Promedio
            avg_relative_humidity_kpi = calculate_kpi_metrics(
                avg_relative_humidity_current,
                avg_relative_humidity_previous,
                "Humedad relativa", 
                "%RH", 
                is_humidity=True 
            )

            # Nuevo KPI de Velocidad del Viento Promedio
            avg_wind_speed_kpi = calculate_kpi_metrics(
                avg_wind_speed_current,
                avg_wind_speed_previous,
                "Velocidad del viento",
                "km/h",
                is_wind_speed=True
            )

            # KPI de Inversores Activos
            active_inverters_kpi = {
                "title": "Inversores activos",
                "value": str(active_inverters_count),
                "unit": f"/{total_inverters_count}",
                "description": inverter_description_text,
                "status": inverter_status_text
            }

            kpi_data = {
                "totalConsumption": consumption_kpi,
                "totalGeneration": generation_kpi,
                "energyBalance": energy_balance_kpi,
                "averageInstantaneousPower": avg_power_kpi,
                "avgDailyTemp": avg_daily_temp_kpi, 
                "relativeHumidity": avg_relative_humidity_kpi, 
                "windSpeed": avg_wind_speed_kpi,
                "activeInverters": active_inverters_kpi,
            }
            return Response(kpi_data)

        except Exception as e:
            logger.error(f"Internal error processing KPIs from local DB or SCADA: {e}", exc_info=True)
            return Response({"detail": f"Internal server error: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- NUEVA CLASE PARA LOS DATOS DEL GRÁFICO (REEMPLAZA A LA FUNCIÓN) ---

# Modificar la vista ChartDataView para incluir unidades automáticas
@method_decorator(cache_page(60 * 5), name='dispatch')
class ChartDataView(APIView):
    permission_classes = [IsAuthenticated]

    def format_energy_value(self, value_base_unit, base_unit_name="kWh"):
        # Manejar valores negativos para el equilibrio energético
        is_negative = value_base_unit < 0
        abs_value = abs(value_base_unit)
        
        if base_unit_name == "kWh":
            if abs_value >= 1_000_000:
                formatted_value = abs_value / 1_000_000
                unit = "GWh"
            elif abs_value >= 1_000:
                formatted_value = abs_value / 1_000
                unit = "MWh"
            else:
                formatted_value = abs_value
                unit = "kWh"
            
            # Aplicar signo negativo si es necesario
            if is_negative:
                return f"-{formatted_value:.2f}", unit
            else:
                return f"{formatted_value:.2f}", unit
        else:
            return f"{value_base_unit:.2f}", base_unit_name

    @extend_schema(
        summary="Obtener datos diarios de consumo, generación, balance y temperatura",
        description="Obtiene datos diarios de consumo, generación, balance y temperatura para gráficos.",
        parameters=[
            OpenApiParameter(
                name='start_date',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description="Fecha de inicio en formato YYYY-MM-DD",
                required=False
            ),
            OpenApiParameter(
                name='end_date',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description="Fecha de fin en formato YYYY-MM-DD",
                required=False
            ),
        ],
        responses={
            200: {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "date": {"type": "string"},
                        "daily_consumption": {"type": "number"},
                        "daily_generation": {"type": "number"},
                        "daily_balance": {"type": "number"},
                        "avg_daily_temp": {"type": "number"},
                    }
                }
            },
            500: {"description": "Error interno del servidor"},
        },
        tags=["Dashboard"]
    )
    def get(self, request, *args, **kwargs):
        """
        GET /api/dashboard/chart-data/
        
        Obtiene datos diarios de consumo, generación, balance y temperatura para gráficos.
        Por defecto, retorna los datos de los últimos 60 días.
        """
        try:
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')

            # Si no se proporcionan fechas, se usa los últimos 60 días por defecto
            if not start_date_str or not end_date_str:
                end_date = get_colombia_now().date()
                start_date = end_date - timedelta(days=60)
            else:
                # Parsear fechas y asegurar que estén en zona horaria de Colombia
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
                
                # Localizar las fechas en zona horaria de Colombia
                end_date = COLOMBIA_TZ.localize(end_date).date()
                start_date = COLOMBIA_TZ.localize(start_date).date()

            # Consultar el modelo DailyChartData para obtener los datos precalculados
            chart_data = DailyChartData.objects.filter(
                date__range=(start_date, end_date)
            ).order_by('date').values('date', 'daily_consumption', 'daily_generation', 'daily_balance', 'avg_daily_temp')

            # Calcular unidades automáticas basadas en los valores
            consumption_values = [item['daily_consumption'] for item in chart_data if item['daily_consumption'] is not None]
            generation_values = [item['daily_generation'] for item in chart_data if item['daily_generation'] is not None]
            balance_values = [item['daily_balance'] for item in chart_data if item['daily_balance'] is not None]
            
            # Determinar unidades automáticas
            max_consumption = max(consumption_values) if consumption_values else 0
            max_generation = max(generation_values) if generation_values else 0
            max_balance = max(abs(min(balance_values)) if balance_values else 0, abs(max(balance_values)) if balance_values else 0)
            
            # IMPORTANTE: Los datos ya están convertidos a kWh en las tareas de Celery
            # Consumo: totalActivePower (kW) → kWh (ya convertido en tasks.py)
            # Generación: acPower (W) → kWh (ya convertido en tasks.py)

            # Determinar unidades para consumo (usar la misma lógica que format_energy_value)
            if max_consumption >= 1_000_000:
                consumption_unit = "GWh"
                consumption_divider = 1_000_000
            elif max_consumption >= 1_000:
                consumption_unit = "MWh"
                consumption_divider = 1_000
            else:
                consumption_unit = "kWh"
                consumption_divider = 1

            # Determinar unidades para generación (usar la misma lógica)
            if max_generation >= 1_000_000:
                generation_unit = "GWh"
                generation_divider = 1_000_000
            elif max_generation >= 1_000:
                generation_unit = "MWh"
                generation_divider = 1_000
            else:
                generation_unit = "kWh"
                generation_divider = 1

            # Determinar unidades para balance (usar la misma lógica)
            if max_balance >= 1_000_000:
                balance_unit = "GWh"
                balance_divider = 1_000_000
            elif max_balance >= 1_000:
                balance_unit = "MWh"
                balance_divider = 1_000
            else:
                balance_unit = "kWh"
                balance_divider = 1

            # Formatear el queryset a una lista de diccionarios con fechas en formato string
            response_data = [
                {
                    'date': item['date'].isoformat(),
                    'daily_consumption': item['daily_consumption'] / consumption_divider if item['daily_consumption'] is not None else 0,
                    'daily_generation': item['daily_generation'] / generation_divider if item['daily_generation'] is not None else 0,
                    'daily_balance': item['daily_balance'] / balance_divider if item['daily_balance'] is not None else 0,
                    'avg_daily_temp': item['avg_daily_temp'],
                    'units': {
                        'consumption': consumption_unit,
                        'generation': generation_unit,
                        'balance': balance_unit,
                        'temperature': '°C'
                    }
                }
                for item in chart_data
            ]
            
            return Response(response_data)
        except Exception as e:
            logger.error(f"Error al obtener los datos del gráfico: {e}", exc_info=True)
            return Response({'error': 'Ocurrió un error inesperado al procesar la solicitud.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- NUEVAS VISTAS PARA EJECUTAR TAREAS MANUALMENTE ---

class CalculateKPIsView(APIView):
    """
    Vista para ejecutar manualmente la tarea de cálculo de KPIs mensuales
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Ejecutar cálculo de KPIs mensuales",
        description="Ejecuta manualmente el cálculo de KPIs mensuales.",
        responses={
            200: {
                "type": "object",
                "properties": {
                    "message": {"type": "string"},
                    "task_result": {"type": "string"},
                    "status": {"type": "string"},
                }
            },
            500: {"description": "Error interno del servidor"},
        },
        tags=["Dashboard"]
    )
    def post(self, request, *args, **kwargs):
        """
        POST /api/dashboard/calculate-kpis/
        
        Ejecuta manualmente la tarea de cálculo de KPIs mensuales.
        """
        try:
            logger.info("=== INICIANDO CÁLCULO MANUAL DE KPIs ===")
            
            # Ejecutar la tarea de cálculo de KPIs
            task_result = calculate_monthly_consumption_kpi()
            
            logger.info("=== CÁLCULO MANUAL DE KPIs COMPLETADO ===")
            
            return Response({
                "message": "Cálculo de KPIs mensuales iniciado exitosamente",
                "task_result": task_result,
                "status": "success"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error al ejecutar cálculo de KPIs: {e}", exc_info=True)
            return Response({
                "message": f"Error al ejecutar cálculo de KPIs: {str(e)}",
                "status": "error"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CalculateDailyDataView(APIView):
    """
    Vista para ejecutar manualmente la tarea de cálculo de datos diarios
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Ejecutar cálculo de datos diarios",
        description="Ejecuta manualmente el cálculo de datos diarios.",
        request={
            "type": "object",
            "properties": {
                "days_back": {
                    "type": "integer",
                    "description": "Número de días hacia atrás para calcular",
                    "default": 3
                }
            }
        },
        responses={
            200: {
                "type": "object",
                "properties": {
                    "message": {"type": "string"},
                    "start_date": {"type": "string"},
                    "end_date": {"type": "string"},
                    "task_result": {"type": "string"},
                    "status": {"type": "string"},
                }
            },
            500: {"description": "Error interno del servidor"},
        },
        tags=["Dashboard"]
    )
    def post(self, request, *args, **kwargs):
        """
        POST /api/dashboard/calculate-daily-data/
        
        Ejecuta manualmente la tarea de cálculo de datos diarios.
        
        Cuerpo de la petición:
        - days_back: número de días hacia atrás para calcular (por defecto: 3)
        """
        try:
            logger.info("=== INICIANDO CÁLCULO MANUAL DE DATOS DIARIOS ===")
            
            # Obtener parámetros del request
            days_back = request.data.get('days_back', 3)  # Por defecto 3 días
            
            # Calcular fechas en zona horaria de Colombia
            end_date = get_colombia_now()
            start_date = end_date - timedelta(days=days_back)
            
            logger.info(f"Calculando datos diarios desde {start_date.date()} hasta {end_date.date()} (hora Colombia)")
            
            # Ejecutar la tarea de cálculo de datos diarios
            task_result = calculate_and_save_daily_data(
                start_date_str=start_date.isoformat(),
                end_date_str=end_date.isoformat()
            )
            
            logger.info("=== CÁLCULO MANUAL DE DATOS DIARIOS COMPLETADO ===")
            
            return Response({
                "message": f"Cálculo de datos diarios iniciado exitosamente para los últimos {days_back} días",
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "task_result": task_result,
                "status": "success"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error al ejecutar cálculo de datos diarios: {e}", exc_info=True)
            return Response({
                "message": f"Error al ejecutar cálculo de datos diarios: {str(e)}",
                "status": "error"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(cache_page(60 * 5), name='dispatch')
class ElectricMeterIndicatorsView(APIView):
    """
    Vista para obtener indicadores de medidores eléctricos filtrados por:
    - Rango de tiempo (diario/mensual)
    - Institución (Udenar, Cesmag, Mariana, UCC, HUDN)
    - Medidor específico
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Obtener indicadores de medidores eléctricos",
        description="Obtiene indicadores de consumo de medidores eléctricos filtrados por institución, rango de tiempo y medidor específico",
        parameters=[
            OpenApiParameter(
                name='time_range',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Rango de tiempo para los datos (daily/monthly)",
                enum=['daily', 'monthly'],
                default='daily'
            ),
            OpenApiParameter(
                name='institution_id',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description="ID de la institución (requerido)",
                required=True
            ),
            OpenApiParameter(
                name='device_id',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="ID específico del medidor (opcional)"
            ),
            OpenApiParameter(
                name='start_date',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description="Fecha de inicio en formato YYYY-MM-DD"
            ),
            OpenApiParameter(
                name='end_date',
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                description="Fecha de fin en formato YYYY-MM-DD"
            ),
        ],
        responses={
            200: {
                "type": "object",
                "properties": {
                    "time_range": {"type": "string"},
                    "institution_id": {"type": "string"},
                    "institution_name": {"type": "string"},
                    "device_id": {"type": "string", "nullable": True},
                    "start_date": {"type": "string"},
                    "end_date": {"type": "string"},
                    "consumption_data": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "date": {"type": "string"},
                                "device_id": {"type": "integer"},
                                "device_name": {"type": "string"},
                                "institution_name": {"type": "string"},
                                "cumulative_active_power": {"type": "number"},
                                "total_active_power": {"type": "number"},
                                "peak_demand": {"type": "number"},
                                "avg_demand": {"type": "number"},
                                "measurement_count": {"type": "integer"},
                                "last_measurement_date": {"type": "string", "nullable": True},
                            }
                        }
                    },
                    "chart_data": {"type": "array", "items": {"type": "object"}},
                    "summary": {
                        "type": "object",
                        "properties": {
                            "total_consumption": {"type": "number"},
                            "avg_daily_consumption": {"type": "number"},
                            "peak_demand": {"type": "number"},
                            "total_devices": {"type": "integer"},
                            "active_devices": {"type": "integer"},
                            "days_processed": {"type": "integer"},
                        }
                    },
                }
            },
            400: {"description": "Parámetros inválidos"},
            404: {"description": "Institución no encontrada"},
            500: {"description": "Error interno del servidor"},
        },
        tags=["Medidores Eléctricos"]
    )
    def get(self, request, *args, **kwargs):
        """
        GET /api/electric-meters/
        
        Obtiene indicadores de consumo de medidores eléctricos filtrados por institución, 
        rango de tiempo y medidor específico.
        
        Parámetros de consulta:
        - time_range: 'daily' o 'monthly' (por defecto: 'daily')
        - institution_id: ID de la institución (requerido)
        - device_id: ID del medidor específico (opcional)
        - start_date: fecha de inicio (YYYY-MM-DD)
        - end_date: fecha de fin (YYYY-MM-DD)
        """
        try:
            # Obtener parámetros de consulta
            time_range = request.query_params.get('time_range', 'daily')
            institution_id = request.query_params.get('institution_id')
            device_id = request.query_params.get('device_id')
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')

            # Validar parámetros
            if time_range not in ['daily', 'monthly']:
                return Response(
                    {"detail": "time_range debe ser 'daily' o 'monthly'"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not institution_id:
                return Response(
                    {"detail": "institution_id es requerido"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Procesar fechas
            if not start_date_str or not end_date_str:
                # Por defecto, último mes
                end_date = get_colombia_now().date()
                start_date = end_date - timedelta(days=30)
            else:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()

            # Obtener la institución
            try:
                institution = Institution.objects.get(id=institution_id)
            except Institution.DoesNotExist:
                return Response(
                    {"detail": "Institución no encontrada"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Construir filtros para datos locales
            filters = {
                'time_range': time_range,
                'date__range': (start_date, end_date),
                'institution': institution
            }

            if device_id:
                filters['device__scada_id'] = device_id

            # Obtener datos de consumo locales
            consumption_data = ElectricMeterConsumption.objects.filter(**filters).select_related(
                'device', 'institution'
            ).order_by('date')

            # Obtener datos de gráficos si es necesario
            chart_data = None
            if time_range == 'daily':
                chart_filters = {
                    'date__range': (start_date, end_date),
                    'institution': institution
                }
                if device_id:
                    chart_filters['device__scada_id'] = device_id

                chart_data = ElectricMeterChartData.objects.filter(**chart_filters).select_related(
                    'device', 'institution'
                ).order_by('date')

            # Formatear respuesta
            response_data = {
                'time_range': time_range,
                'institution_id': institution_id,
                'institution_name': institution.name,
                'device_id': device_id,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'consumption_data': [],
                'chart_data': [],
                'summary': {
                    'total_consumption': 0.0,
                    'avg_daily_consumption': 0.0,
                    'peak_demand': 0.0,
                    'total_devices': 0,
                    'active_devices': 0
                }
            }

            # Procesar datos de consumo
            total_consumption = 0.0
            peak_demand = 0.0
            devices_processed = set()

            for record in consumption_data:
                devices_processed.add(record.device_id)
                total_consumption += record.total_active_power
                peak_demand = max(peak_demand, record.peak_demand)

                response_data['consumption_data'].append({
                    'date': record.date.isoformat(),
                    'device_id': record.device_id,
                    'device_name': record.device.name,
                    'institution_name': record.institution.name,
                    'cumulative_active_power': record.cumulative_active_power,
                    'total_active_power': record.total_active_power,
                    'peak_demand': record.peak_demand,
                    'avg_demand': record.avg_demand,
                    'measurement_count': record.measurement_count,
                    'last_measurement_date': record.last_measurement_date.isoformat() if record.last_measurement_date else None
                })

            # Procesar datos de gráficos
            if chart_data:
                for record in chart_data:
                    response_data['chart_data'].append({
                        'date': record.date.isoformat(),
                        'device_id': record.device_id,
                        'device_name': record.device.name,
                        'institution_name': record.institution.name,
                        'hourly_consumption': record.hourly_consumption,
                        'daily_consumption': record.daily_consumption,
                        'peak_hour': record.peak_hour,
                        'peak_value': record.peak_value
                    })

            # Calcular resumen
            days_count = (end_date - start_date).days + 1
            response_data['summary'] = {
                'total_consumption': total_consumption,
                'avg_daily_consumption': total_consumption / days_count if days_count > 0 else 0.0,
                'peak_demand': peak_demand,
                'total_devices': len(devices_processed),
                'active_devices': len(devices_processed),
                'days_processed': days_count
            }

            return Response(response_data)

        except Exception as e:
            logger.error(f"Error en ElectricMeterIndicatorsView: {e}", exc_info=True)
            return Response(
                {"detail": f"Error interno del servidor: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(cache_page(60 * 5), name='dispatch')
class InstitutionsListView(APIView):
    """
    Vista para obtener la lista de instituciones disponibles
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Obtener lista de instituciones",
        description="Obtiene la lista de todas las instituciones disponibles en el sistema",
        responses={
            200: {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "name": {"type": "string"},
                        "scada_id": {"type": "string"},
                    }
                }
            },
            500: {"description": "Error interno del servidor"},
        },
        tags=["Instituciones"]
    )
    def get(self, request, *args, **kwargs):
        """
        GET /api/institutions/
        
        Obtiene la lista de todas las instituciones disponibles en el sistema.
        """
        try:
            institutions = Institution.objects.all().values('id', 'name', 'scada_id')
            return Response(list(institutions))
        except Exception as e:
            logger.error(f"Error en InstitutionsListView: {e}", exc_info=True)
            return Response(
                {"detail": f"Error interno del servidor: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(cache_page(60 * 5), name='dispatch')
class ElectricMetersListView(APIView):
    """
    Vista para obtener la lista de medidores eléctricos por institución
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Obtener lista de medidores eléctricos",
        description="Obtiene la lista de medidores eléctricos, opcionalmente filtrados por institución",
        parameters=[
            OpenApiParameter(
                name='institution_id',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description="ID de la institución para filtrar medidores (opcional)"
            ),
        ],
        responses={
            200: {
                "type": "object",
                "properties": {
                    "institution_id": {"type": "integer", "nullable": True},
                    "devices": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "scada_id": {"type": "string"},
                                "name": {"type": "string"},
                                "institution_id": {"type": "string"},
                                "institution_name": {"type": "string"},
                                "status": {"type": "string"},
                                "is_active": {"type": "boolean"},
                                "description": {"type": "string"},
                                "location": {"type": "object"},
                            }
                        }
                    },
                    "total_count": {"type": "integer"},
                }
            },
            404: {"description": "Institución no encontrada"},
            500: {"description": "Error interno del servidor"},
        },
        tags=["Medidores Eléctricos"]
    )
    def get(self, request, *args, **kwargs):
        """
        GET /api/electric-meters/list/
        
        Obtiene la lista de medidores eléctricos, opcionalmente filtrados por institución.
        
        Parámetros de consulta:
        - institution_id: ID de la institución (opcional)
        """
        try:
            institution_id = request.query_params.get('institution_id')
            
            # Obtener medidores eléctricos directamente de la base de datos local
            try:
                # Obtener la categoría de medidores eléctricos
                electric_meter_category = DeviceCategory.objects.get(name='electricMeter')
                
                # Obtener todos los dispositivos de esta categoría
                local_devices = Device.objects.filter(
                    category=electric_meter_category,
                    is_active=True
                ).select_related('institution')
                
                logger.info(f"Dispositivos encontrados en BD local: {local_devices.count()}")
                
            except DeviceCategory.DoesNotExist:
                logger.error("Categoría 'electricMeter' no encontrada")
                return Response(
                    {"detail": "Categoría de medidores eléctricos no encontrada"},
                    status=status.HTTP_404_NOT_FOUND
                )
            except Exception as e:
                logger.error(f"Error obteniendo dispositivos de BD local: {e}")
                return Response(
                    {"detail": f"Error obteniendo dispositivos: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Filtrar por institución si se especifica
            if institution_id:
                try:
                    institution = Institution.objects.get(id=institution_id)
                    local_devices = local_devices.filter(institution=institution)
                    logger.info(f"Dispositivos filtrados por institución {institution.name}: {local_devices.count()}")
                except Institution.DoesNotExist:
                    return Response(
                        {"detail": "Institución no encontrada"},
                        status=status.HTTP_404_NOT_FOUND
                    )

            # Formatear respuesta
            devices_list = []
            for device in local_devices:
                devices_list.append({
                    'scada_id': device.scada_id,
                    'name': device.name,
                    'institution_id': device.institution.scada_id if device.institution else None,
                    'institution_name': device.institution.name if device.institution else 'Sin institución',
                    'status': device.status or 'unknown',
                    'is_active': device.is_active,
                    'description': device.name,  # Usar el nombre como descripción
                    'location': {}  # No tenemos datos de ubicación en el modelo local
                })

            logger.info(f"Respuesta formateada con {len(devices_list)} dispositivos")

            return Response({
                'institution_id': institution_id,
                'devices': devices_list,
                'total_count': len(devices_list)
            })

        except Exception as e:
            logger.error(f"Error en ElectricMetersListView: {e}", exc_info=True)
            return Response(
                {"detail": f"Error interno del servidor: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CalculateElectricMeterDataView(APIView):
    """
    Vista para ejecutar manualmente el cálculo de datos de medidores eléctricos
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Calcular datos de medidores eléctricos",
        description="Ejecuta manualmente el cálculo de datos de medidores eléctricos para un rango de tiempo específico. "
                   "Este endpoint inicia una tarea asíncrona que procesa los datos de consumo de energía "
                   "para los medidores eléctricos de la institución especificada.",
        request=ElectricMeterCalculationRequestSerializer,
        responses={
            200: ElectricMeterCalculationResponseSerializer,
            400: OpenApiResponse(
                description="Datos de entrada inválidos",
                examples=[
                    OpenApiExample(
                        "Error de validación",
                        value={
                            "detail": "Los datos proporcionados no son válidos",
                            "errors": {
                                "institution_id": ["Este campo es requerido."],
                                "start_date": ["Fecha de inicio debe ser anterior a fecha de fin."]
                            }
                        }
                    )
                ]
            ),
            500: OpenApiResponse(
                description="Error interno del servidor",
                examples=[
                    OpenApiExample(
                        "Error de cálculo",
                        value={
                            "detail": "Error al procesar los datos de medidores eléctricos",
                            "error": "No se pudieron obtener datos del servidor SCADA"
                        }
                    )
                ]
            )
        },
        examples=[
            OpenApiExample(
                "Cálculo diario",
                value={
                    "time_range": "daily",
                    "start_date": "2024-01-01",
                    "end_date": "2024-01-31",
                    "institution_id": 1
                },
                description="Ejemplo de cálculo diario para una institución"
            ),
            OpenApiExample(
                "Cálculo mensual con medidor específico",
                value={
                    "time_range": "monthly",
                    "start_date": "2024-01-01",
                    "end_date": "2024-12-31",
                    "institution_id": 2,
                    "device_id": "3ccb420f-e6a0-4461-8dc6-e8568bd699f0"
                },
                description="Ejemplo de cálculo mensual para un medidor específico"
            )
        ]
    )
    def post(self, request, *args, **kwargs):
        """
        POST /api/electric-meters/calculate/
        
        Ejecuta el cálculo de datos de medidores eléctricos.
        
        Headers requeridos:
        - Authorization: Token <token>
        - Content-Type: application/json
        
        Body requerido:
        - time_range: 'daily' o 'monthly'
        - start_date: YYYY-MM-DD
        - end_date: YYYY-MM-DD
        - institution_id: integer
        - device_id: string (opcional)
        """
        try:
            # Validar datos de entrada
            serializer = ElectricMeterCalculationRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    "detail": "Los datos proporcionados no son válidos",
                    "errors": serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            validated_data = serializer.validated_data
            
            # Ejecutar tarea de cálculo
            from .tasks import calculate_electric_meter_energy_consumption
            task = calculate_electric_meter_energy_consumption.delay(
                time_range=validated_data['time_range'],
                start_date_str=validated_data['start_date'].isoformat(),
                end_date_str=validated_data['end_date'].isoformat(),
                institution_id=validated_data['institution_id'],
                device_id=validated_data.get('device_id')
            )
            
            logger.info(f"Tarea de cálculo iniciada: {task.id} para institución {validated_data['institution_id']}")
            
            return Response({
                "success": True,
                "message": "Cálculo de datos de medidores eléctricos iniciado correctamente",
                "task_id": task.id,
                "processed_devices": 0,  # Se actualizará cuando termine la tarea
                "total_consumption": 0.0  # Se actualizará cuando termine la tarea
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error en cálculo de medidores eléctricos: {str(e)}")
            return Response({
                "success": False,
                "detail": "Error al procesar los datos de medidores eléctricos",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TriggerElectricMeterCalculationView(APIView):
    """
    Vista para disparar el cálculo de datos de medidores eléctricos
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Disparar cálculo de datos de medidores eléctricos",
        description="Inicia el cálculo de datos de medidores eléctricos para los filtros especificados",
        request=ElectricMeterCalculationRequestSerializer,
        responses={
            200: {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "message": {"type": "string"},
                    "task_id": {"type": "string"},
                }
            },
            400: {"description": "Datos de entrada inválidos"},
            500: {"description": "Error interno del servidor"},
        },
        tags=["Medidores Eléctricos"]
    )
    def post(self, request, *args, **kwargs):
        """
        POST /api/electric-meters/trigger-calculation/
        
        Dispara el cálculo de datos de medidores eléctricos.
        """
        try:
            # Validar datos de entrada
            serializer = ElectricMeterCalculationRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    "detail": "Los datos proporcionados no son válidos",
                    "errors": serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            validated_data = serializer.validated_data
            
            # Ejecutar tarea de cálculo
            from .tasks import calculate_electric_meter_energy_consumption
            task = calculate_electric_meter_energy_consumption.delay(
                time_range=validated_data['time_range'],
                start_date_str=validated_data['start_date'].isoformat(),
                end_date_str=validated_data['end_date'].isoformat(),
                institution_id=validated_data['institution_id'],
                device_id=validated_data.get('device_id')
            )
            
            logger.info(f"Tarea de cálculo disparada: {task.id}")
            
            return Response({
                "success": True,
                "message": "Cálculo de datos iniciado correctamente",
                "task_id": task.id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error disparando cálculo de medidores eléctricos: {str(e)}")
            return Response({
                "success": False,
                "detail": "Error al iniciar el cálculo",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
# indicators/views.py
class ElectricMeterEnergyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API para datos de energía de medidores eléctricos
    """
    serializer_class = ElectricMeterEnergySerializer
    
    def get_queryset(self):
        queryset = ElectricMeterEnergyConsumption.objects.all()

        # Filtros
        time_range = self.request.query_params.get('time_range', 'daily')
        institution_id = self.request.query_params.get('institution_id')
        device_id = self.request.query_params.get('device_id')
        start_date_str = self.request.query_params.get('start_date')
        end_date_str = self.request.query_params.get('end_date')

        if time_range:
            queryset = queryset.filter(time_range=time_range)
        if institution_id:
            queryset = queryset.filter(institution_id=institution_id)
        if device_id:
            # Aceptar tanto el id entero local como el scada_id (UUID/string)
            if str(device_id).isdigit():
                queryset = queryset.filter(device_id=int(device_id))
            else:
                queryset = queryset.filter(device__scada_id=device_id)
        # Parseo seguro de fechas (YYYY-MM-DD)
        from datetime import datetime
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                queryset = queryset.filter(date__gte=start_date)
            except ValueError:
                pass
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                queryset = queryset.filter(date__lte=end_date)
            except ValueError:
                pass

        return queryset.order_by('date')

class ElectricMeterIndicatorsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Vista para obtener indicadores eléctricos de medidores.
    """
    serializer_class = ElectricMeterIndicatorsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = ElectricMeterIndicators.objects.all()
        
        # Filtros
        institution_id = self.request.query_params.get('institution_id')
        device_id = self.request.query_params.get('device_id')
        time_range = self.request.query_params.get('time_range', 'daily')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if institution_id:
            queryset = queryset.filter(institution_id=institution_id)
        
        if device_id:
            # Aceptar tanto el id entero local como el scada_id (UUID/string)
            if str(device_id).isdigit():
                queryset = queryset.filter(device_id=int(device_id))
            else:
                queryset = queryset.filter(device__scada_id=device_id)
        
        if time_range:
            queryset = queryset.filter(time_range=time_range)
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset.order_by('-date', 'device__name')
    
    def list(self, request, *args, **kwargs):
        """
        Lista los indicadores eléctricos con opciones de filtrado.
        """
        queryset = self.get_queryset()
        
        # Agregar información de resumen
        summary = {
            'total_records': queryset.count(),
            'institutions': list(queryset.values('institution__name').distinct()),
            'devices': list(queryset.values('device__name').distinct()),
            'date_range': {
                'min_date': queryset.aggregate(Min('date'))['date__min'],
                'max_date': queryset.aggregate(Max('date'))['date__max']
            }
        }
        
        # Paginación
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response_data = {
                'summary': summary,
                'results': serializer.data,
                'pagination': self.paginator.get_paginated_response(serializer.data).data
            }
            return Response(response_data)
        
        serializer = self.get_serializer(queryset, many=True)
        response_data = {
            'summary': summary,
            'results': serializer.data
        }
        return Response(response_data)

# ========================= Vistas para Indicadores de Inversores =========================

@extend_schema(
    tags=["Inversores"],
    description="Lista todos los indicadores de inversores con opciones de filtrado.",
    parameters=[
        OpenApiParameter("institution_id", int, OpenApiParameter.QUERY, description="ID de la institución"),
        OpenApiParameter("device_id", str, OpenApiParameter.QUERY, description="ID del inversor específico"),
        OpenApiParameter("time_range", str, OpenApiParameter.QUERY, description="Rango de tiempo: 'daily' o 'monthly'"),
        OpenApiParameter("start_date", str, OpenApiParameter.QUERY, description="Fecha de inicio (YYYY-MM-DD)"),
        OpenApiParameter("end_date", str, OpenApiParameter.QUERY, description="Fecha de fin (YYYY-MM-DD)"),
    ],
    responses={200: InverterIndicatorsSerializer(many=True)}
)
class InverterIndicatorsView(APIView):
    """
    Vista para obtener indicadores de inversores.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        """
        GET /api/inverter-indicators/
        
        Lista los indicadores de inversores con opciones de filtrado.
        """
        try:
            # Obtener parámetros de filtrado
            institution_id = request.query_params.get('institution_id')
            device_id = request.query_params.get('device_id')
            time_range = request.query_params.get('time_range', 'daily')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Validar parámetros requeridos
            if not institution_id:
                return Response({
                    "detail": "El parámetro 'institution_id' es requerido"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Construir queryset base
            from .models import InverterIndicators
            queryset = InverterIndicators.objects.all()
            
            # Aplicar filtros
            if institution_id:
                queryset = queryset.filter(institution_id=institution_id)
            
            if device_id:
                # Aceptar tanto el id entero local como el scada_id (UUID/string)
                if str(device_id).isdigit():
                    queryset = queryset.filter(device_id=int(device_id))
                else:
                    queryset = queryset.filter(device__scada_id=device_id)
            
            if time_range:
                queryset = queryset.filter(time_range=time_range)
            
            if start_date:
                queryset = queryset.filter(date__gte=start_date)
            
            if end_date:
                queryset = queryset.filter(date__lte=end_date)
            
            # Ordenar por fecha descendente y nombre del dispositivo
            queryset = queryset.order_by('-date', 'device__name')
            
            # Agregar información de resumen
            summary = {
                'total_records': queryset.count(),
                'institutions': list(queryset.values('institution__name').distinct()),
                'devices': list(queryset.values('device__name').distinct()),
                'date_range': {
                    'min_date': queryset.aggregate(Min('date'))['date__min'],
                    'max_date': queryset.aggregate(Max('date'))['date__max']
                }
            }
            
            # Serializar datos
            from .serializers import InverterIndicatorsSerializer
            serializer = InverterIndicatorsSerializer(queryset, many=True)
            
            response_data = {
                'summary': summary,
                'results': serializer.data
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error obteniendo indicadores de inversores: {str(e)}")
            return Response({
                "detail": "Error al obtener indicadores de inversores",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    tags=["Inversores"],
    description="Lista todos los datos de gráficos de inversores con opciones de filtrado.",
    parameters=[
        OpenApiParameter("institution_id", int, OpenApiParameter.QUERY, description="ID de la institución"),
        OpenApiParameter("device_id", str, OpenApiParameter.QUERY, description="ID del inversor específico"),
        OpenApiParameter("start_date", str, OpenApiParameter.QUERY, description="Fecha de inicio (YYYY-MM-DD)"),
        OpenApiParameter("end_date", str, OpenApiParameter.QUERY, description="Fecha de fin (YYYY-MM-DD)"),
    ],
    responses={200: InverterChartDataSerializer(many=True)}
)
class InverterChartDataView(APIView):
    """
    Vista para obtener datos de gráficos de inversores.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        """
        GET /api/inverter-chart-data/
        
        Lista los datos de gráficos de inversores con opciones de filtrado.
        """
        try:
            # Obtener parámetros de filtrado
            institution_id = request.query_params.get('institution_id')
            device_id = request.query_params.get('device_id')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Validar parámetros requeridos
            if not institution_id:
                return Response({
                    "detail": "El parámetro 'institution_id' es requerido"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Construir queryset base
            from .models import InverterChartData
            queryset = InverterChartData.objects.all()
            
            # Aplicar filtros
            if institution_id:
                queryset = queryset.filter(institution_id=institution_id)
            
            if device_id:
                # Aceptar tanto el id entero local como el scada_id (UUID/string)
                if str(device_id).isdigit():
                    queryset = queryset.filter(device_id=int(device_id))
                else:
                    queryset = queryset.filter(device__scada_id=device_id)
            
            if start_date:
                queryset = queryset.filter(date__gte=start_date)
            
            if end_date:
                queryset = queryset.filter(date__lte=end_date)
            
            # Ordenar por fecha descendente y nombre del dispositivo
            queryset = queryset.order_by('-date', 'device__name')
            
            # Serializar datos
            from .serializers import InverterChartDataSerializer
            serializer = InverterChartDataSerializer(queryset, many=True)
            
            response_data = {
                'total_records': queryset.count(),
                'results': serializer.data
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error obteniendo datos de gráficos de inversores: {str(e)}")
            return Response({
                "detail": "Error al obtener datos de gráficos de inversores",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    tags=["Inversores"],
    description="Ejecuta el cálculo de indicadores de inversores.",
    request=InverterCalculationRequestSerializer,
    responses={
        200: InverterCalculationResponseSerializer,
        400: {"description": "Datos de entrada inválidos"},
        500: {"description": "Error interno del servidor"},
    }
)
class CalculateInverterDataView(APIView):
    """
    Vista para ejecutar el cálculo de indicadores de inversores.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """
        POST /api/inverters/calculate/
        
        Ejecuta el cálculo de indicadores de inversores.
        
        Headers requeridos:
        - Authorization: Token <token>
        - Content-Type: application/json
        
        Body requerido:
        - time_range: 'daily' o 'monthly'
        - start_date: YYYY-MM-DD
        - end_date: YYYY-MM-DD
        - institution_id: integer
        - device_id: string (opcional)
        """
        try:
            # Validar datos de entrada
            from .serializers import InverterCalculationRequestSerializer
            serializer = InverterCalculationRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    "detail": "Los datos proporcionados no son válidos",
                    "errors": serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            validated_data = serializer.validated_data
            
            # Ejecutar tarea de cálculo
            from .tasks import calculate_inverter_data
            task = calculate_inverter_data.delay(
                time_range=validated_data['time_range'],
                start_date_str=validated_data['start_date'].isoformat(),
                end_date_str=validated_data['end_date'].isoformat(),
                institution_id=validated_data['institution_id'],
                device_id=validated_data.get('device_id')
            )
            
            logger.info(f"Tarea de cálculo de inversores iniciada: {task.id} para institución {validated_data['institution_id']}")
            
            return Response({
                "success": True,
                "message": "Cálculo de indicadores de inversores iniciado correctamente",
                "task_id": task.id,
                "processed_records": 0,  # Se actualizará cuando termine la tarea
                "estimated_completion_time": "Variable según la cantidad de datos"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error en cálculo de indicadores de inversores: {str(e)}")
            return Response({
                "success": False,
                "detail": "Error al procesar los indicadores de inversores",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    tags=["Medidores Eléctricos"],
    description="Ejecuta el cálculo de indicadores eléctricos.",
    request=InverterCalculationRequestSerializer,  # Reutilizamos el mismo serializer
    responses={
        200: InverterCalculationResponseSerializer,
        400: {"description": "Datos de entrada inválidos"},
        500: {"description": "Error interno del servidor"},
    }
)
class CalculateElectricalDataView(APIView):
    """
    Vista para ejecutar el cálculo de indicadores eléctricos.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """
        POST /api/electric-meters/calculate/
        
        Ejecuta el cálculo de indicadores eléctricos.
        
        Headers requeridos:
        - Authorization: Token <token>
        - Content-Type: application/json
        
        Body requerido:
        - time_range: 'daily' o 'monthly'
        - start_date: YYYY-MM-DD
        - end_date: YYYY-MM-DD
        - institution_id: integer
        - device_id: string (opcional)
        """
        try:
            # Validar datos de entrada
            from .serializers import InverterCalculationRequestSerializer
            serializer = InverterCalculationRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    "detail": "Los datos proporcionados no son válidos",
                    "errors": serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            validated_data = serializer.validated_data
            
            # Ejecutar tarea de cálculo
            from .tasks import calculate_electrical_data
            task = calculate_electrical_data.delay(
                time_range=validated_data['time_range'],
                start_date_str=validated_data['start_date'].isoformat(),
                end_date_str=validated_data['end_date'].isoformat(),
                institution_id=validated_data['institution_id'],
                device_id=validated_data.get('device_id')
            )
            
            logger.info(f"Tarea de cálculo eléctrico iniciada: {task.id} para institución {validated_data['institution_id']}")
            
            return Response({
                "success": True,
                "message": "Cálculo de indicadores eléctricos iniciado correctamente",
                "task_id": task.id,
                "processed_records": 0,  # Se actualizará cuando termine la tarea
                "estimated_completion_time": "Variable según la cantidad de datos"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error en cálculo de indicadores eléctricos: {str(e)}")
            return Response({
                "success": False,
                "detail": "Error al procesar los indicadores eléctricos",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    tags=["Inversores"],
    description="Lista inversores filtrados por institución.",
    parameters=[
        OpenApiParameter("institution_id", int, OpenApiParameter.QUERY, description="ID de la institución"),
    ],
    responses={200: {"type": "object", "properties": {"devices": {"type": "array"}, "total_count": {"type": "integer"}}}}
)
class InvertersListView(APIView):
    """
    Vista para listar inversores filtrados por institución.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        """
        GET /api/inverters/list/
        
        Lista inversores filtrados por institución.
        """
        try:
            institution_id = request.query_params.get('institution_id')
            
            if not institution_id:
                return Response({
                    "detail": "El parámetro 'institution_id' es requerido"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Obtener inversores de la institución
            from scada_proxy.models import Device
            inverters = Device.objects.filter(
                category__id=1,  # category_id=1 para inversores
                institution_id=institution_id,
                is_active=True
            ).select_related('institution')
            
            # Serializar datos
            from scada_proxy.serializers import DeviceSerializer
            serializer = DeviceSerializer(inverters, many=True)
            
            response_data = {
                "devices": serializer.data,
                "total_count": inverters.count()
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error obteniendo lista de inversores: {str(e)}")
            return Response(
                {"detail": "Error al obtener lista de inversores",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Vistas para estaciones meteorológicas
@method_decorator(cache_page(60 * 5), name='dispatch')
class WeatherStationIndicatorsView(APIView):
    permission_classes = [IsAuthenticated]

    def get_scada_token(self):
        try:
            return scada_client.get_token()
        except EnvironmentError as e:
            logger.error(f"SCADA configuration error: {e}")
            return Response({"detail": "SCADA server configuration error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting SCADA token: {e}")
            return Response({"detail": "No se pudo autenticar con la API SCADA. Revise las credenciales."}, status=status.HTTP_502_BAD_GATEWAY)

    @extend_schema(
        summary="Obtener indicadores de estaciones meteorológicas",
        description="Obtiene los indicadores meteorológicos calculados para estaciones meteorológicas",
        parameters=[
            OpenApiParameter(name='time_range', type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, 
                           description='Rango de tiempo: daily o monthly', required=False),
            OpenApiParameter(name='institution_id', type=OpenApiTypes.INT, location=OpenApiParameter.QUERY, 
                           description='ID de la institución', required=False),
            OpenApiParameter(name='device_id', type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, 
                           description='ID específico de la estación meteorológica', required=False),
            OpenApiParameter(name='start_date', type=OpenApiTypes.DATE, location=OpenApiParameter.QUERY, 
                           description='Fecha de inicio (YYYY-MM-DD)', required=False),
            OpenApiParameter(name='end_date', type=OpenApiTypes.DATE, location=OpenApiParameter.QUERY, 
                           description='Fecha de fin (YYYY-MM-DD)', required=False),
        ],
        responses={
            200: WeatherStationIndicatorsSerializer(many=True),
            400: {"description": "Parámetros inválidos"},
            500: {"description": "Error interno del servidor"},
        },
        tags=["Estaciones Meteorológicas"]
    )
    def get(self, request, *args, **kwargs):
        """
        GET /api/weather-station-indicators/
        
        Obtiene los indicadores meteorológicos calculados para estaciones meteorológicas.
        """
        token = self.get_scada_token()
        if isinstance(token, Response):
            return token

        try:
            # Obtener parámetros de consulta
            time_range = request.query_params.get('time_range', 'daily')
            institution_id = request.query_params.get('institution_id')
            device_id = request.query_params.get('device_id')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')

            # Validar parámetros
            if time_range not in ['daily', 'monthly']:
                return Response(
                    {"detail": "time_range debe ser 'daily' o 'monthly'"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Construir filtros
            filters = Q(time_range=time_range)
            
            if institution_id:
                filters &= Q(institution_id=institution_id)
            
            if device_id:
                filters &= Q(device_id=device_id)
            
            if start_date:
                try:
                    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                    filters &= Q(date__gte=start_date)
                except ValueError:
                    return Response(
                        {"detail": "start_date debe estar en formato YYYY-MM-DD"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            if end_date:
                try:
                    end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                    filters &= Q(date__lte=end_date)
                except ValueError:
                    return Response(
                        {"detail": "end_date debe estar en formato YYYY-MM-DD"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Obtener indicadores
            indicators = WeatherStationIndicators.objects.filter(filters).order_by('-date')
            
            # Serializar y devolver resultados
            serializer = WeatherStationIndicatorsSerializer(indicators, many=True)
            
            return Response({
                'count': indicators.count(),
                'results': serializer.data,
                'time_range': time_range,
                'filters_applied': {
                    'institution_id': institution_id,
                    'device_id': device_id,
                    'start_date': start_date.isoformat() if start_date else None,
                    'end_date': end_date.isoformat() if end_date else None
                }
            })

        except Exception as e:
            logger.error(f"Error obteniendo indicadores meteorológicos: {str(e)}")
            return Response(
                {"detail": "Error interno del servidor"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(cache_page(60 * 5), name='dispatch')
class WeatherStationChartDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get_scada_token(self):
        try:
            return scada_client.get_token()
        except EnvironmentError as e:
            logger.error(f"SCADA configuration error: {e}")
            return Response({"detail": "SCADA server configuration error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting SCADA token: {e}")
            return Response({"detail": "No se pudo autenticar con la API SCADA. Revise las credenciales."}, status=status.HTTP_502_BAD_GATEWAY)

    @extend_schema(
        summary="Obtener datos de gráficos de estaciones meteorológicas",
        description="Obtiene los datos de gráficos meteorológicos para visualización",
        parameters=[
            OpenApiParameter(name='time_range', type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, 
                           description='Rango de tiempo: daily o monthly', required=False),
            OpenApiParameter(name='institution_id', type=OpenApiTypes.INT, location=OpenApiParameter.QUERY, 
                           description='ID de la institución', required=False),
            OpenApiParameter(name='device_id', type=OpenApiTypes.STR, location=OpenApiParameter.QUERY, 
                           description='ID específico de la estación meteorológica', required=False),
            OpenApiParameter(name='start_date', type=OpenApiTypes.DATE, location=OpenApiParameter.QUERY, 
                           description='Fecha de inicio (YYYY-MM-DD)', required=False),
            OpenApiParameter(name='end_date', type=OpenApiTypes.DATE, location=OpenApiParameter.QUERY, 
                           description='Fecha de fin (YYYY-MM-DD)', required=False),
        ],
        responses={
            200: WeatherStationChartDataSerializer(many=True),
            400: {"description": "Parámetros inválidos"},
            500: {"description": "Error interno del servidor"},
        },
        tags=["Estaciones Meteorológicas"]
    )
    def get(self, request, *args, **kwargs):
        """
        GET /api/weather-station-chart-data/
        
        Obtiene los datos de gráficos meteorológicos para visualización.
        """
        token = self.get_scada_token()
        if isinstance(token, Response):
            return token

        try:
            # Obtener parámetros de consulta
            time_range = request.query_params.get('time_range', 'daily')
            institution_id = request.query_params.get('institution_id')
            device_id = request.query_params.get('device_id')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')

            # Validar parámetros
            if time_range not in ['daily', 'monthly']:
                return Response(
                    {"detail": "time_range debe ser 'daily' o 'monthly'"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Construir filtros
            filters = Q()
            
            if institution_id:
                filters &= Q(institution_id=institution_id)
            
            if device_id:
                filters &= Q(device_id=device_id)
            
            if start_date:
                try:
                    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                    filters &= Q(date__gte=start_date)
                except ValueError:
                    return Response(
                        {"detail": "start_date debe estar en formato YYYY-MM-DD"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            if end_date:
                try:
                    end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                    filters &= Q(date__lte=end_date)
                except ValueError:
                    return Response(
                        {"detail": "end_date debe estar en formato YYYY-MM-DD"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Obtener datos de gráficos
            chart_data = WeatherStationChartData.objects.filter(filters).order_by('-date')
            
            # Serializar y devolver resultados
            serializer = WeatherStationChartDataSerializer(chart_data, many=True)
            
            return Response({
                'count': chart_data.count(),
                'results': serializer.data,
                'time_range': time_range,
                'filters_applied': {
                    'institution_id': institution_id,
                    'device_id': device_id,
                    'start_date': start_date.isoformat() if start_date else None,
                    'end_date': end_date.isoformat() if end_date else None
                }
            })

        except Exception as e:
            logger.error(f"Error obteniendo datos de gráficos meteorológicos: {str(e)}")
            return Response(
                {"detail": "Error interno del servidor"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CalculateWeatherStationDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get_scada_token(self):
        try:
            return scada_client.get_token()
        except EnvironmentError as e:
            logger.error(f"SCADA configuration error: {e}")
            return Response({"detail": "SCADA server configuration error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting SCADA token: {e}")
            return Response({"detail": "No se pudo autenticar con la API SCADA. Revise las credenciales."}, status=status.HTTP_502_BAD_GATEWAY)

    @extend_schema(
        summary="Calcular indicadores meteorológicos",
        description="Calcula los indicadores meteorológicos para estaciones meteorológicas",
        request=WeatherStationCalculationRequestSerializer,
        responses={
            200: WeatherStationCalculationResponseSerializer,
            400: {"description": "Parámetros inválidos"},
            500: {"description": "Error interno del servidor"},
        },
        tags=["Estaciones Meteorológicas"]
    )
    def post(self, request, *args, **kwargs):
        """
        POST /api/weather-stations/calculate/
        
        Calcula los indicadores meteorológicos para estaciones meteorológicas.
        """
        token = self.get_scada_token()
        if isinstance(token, Response):
            return token

        try:
            # Validar datos de entrada
            serializer = WeatherStationCalculationRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            data = serializer.validated_data
            
            # Ejecutar tarea asíncrona
            from .tasks import calculate_weather_station_indicators
            
            task = calculate_weather_station_indicators.delay(
                time_range=data['time_range'],
                start_date=data['start_date'].isoformat(),
                end_date=data['end_date'].isoformat(),
                institution_id=data['institution_id'],
                device_id=data.get('device_id', '')
            )
            
            # Calcular tiempo estimado de finalización
            estimated_time = "5-10 minutos" if data['time_range'] == 'daily' else "15-20 minutos"
            
            return Response({
                'success': True,
                'message': 'Cálculo de indicadores meteorológicos iniciado exitosamente',
                'task_id': task.id,
                'time_range': data['time_range'],
                'start_date': data['start_date'],
                'end_date': data['end_date'],
                'institution_id': data['institution_id'],
                'device_id': data.get('device_id'),
                'processed_records': 0,  # Se actualizará cuando la tarea termine
                'estimated_completion_time': estimated_time
            })

        except Exception as e:
            logger.error(f"Error iniciando cálculo de indicadores meteorológicos: {str(e)}")
            return Response(
                {"detail": "Error interno del servidor"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class WeatherStationsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get_scada_token(self):
        try:
            return scada_client.get_token()
        except EnvironmentError as e:
            logger.error(f"SCADA configuration error: {e}")
            return Response({"detail": "SCADA server configuration error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting SCADA token: {e}")
            return Response({"detail": "No se pudo autenticar con la API SCADA. Revise las credenciales."}, status=status.HTTP_502_BAD_GATEWAY)

    @extend_schema(
        summary="Listar estaciones meteorológicas",
        description="Obtiene la lista de estaciones meteorológicas disponibles",
        parameters=[
            OpenApiParameter(name='institution_id', type=OpenApiTypes.INT, location=OpenApiParameter.QUERY, 
                           description='ID de la institución para filtrar', required=False),
        ],
        responses={
            200: {
                "type": "object",
                "properties": {
                    "count": {"type": "integer"},
                    "results": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "name": {"type": "string"},
                                "institution": {"type": "object"},
                                "is_active": {"type": "boolean"}
                            }
                        }
                    }
                }
            },
            500: {"description": "Error interno del servidor"},
        },
        tags=["Estaciones Meteorológicas"]
    )
    def get(self, request, *args, **kwargs):
        """
        GET /api/weather-stations/list/
        
        Obtiene la lista de estaciones meteorológicas disponibles.
        """
        token = self.get_scada_token()
        if isinstance(token, Response):
            return token

        try:
            # Obtener parámetros de consulta
            institution_id = request.query_params.get('institution_id')

            # Construir filtros
            filters = Q(category__id=3, is_active=True)  # category_id=3 para estaciones meteorológicas
            
            if institution_id:
                filters &= Q(institution_id=institution_id)

            # Obtener estaciones meteorológicas
            weather_stations = Device.objects.filter(filters).select_related('institution').order_by('institution__name', 'name')
            
            # Preparar respuesta
            results = []
            for station in weather_stations:
                results.append({
                    'id': station.id,
                    'name': station.name,
                    'institution': {
                        'id': station.institution.id,
                        'name': station.institution.name
                    },
                    'is_active': station.is_active,
                    'last_measurement': station.last_measurement_date.isoformat() if station.last_measurement_date else None
                })
            
            return Response({
                'count': len(results),
                'results': results
            })

        except Exception as e:
            logger.error(f"Error obteniendo lista de estaciones meteorológicas: {str(e)}")
            return Response(
                {"detail": "Error interno del servidor"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )