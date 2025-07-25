from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
import logging
from datetime import datetime, timedelta, timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
import uuid 

# Importa el modelo de indicators
from .models import MonthlyConsumptionKPI 
# Importa el cliente SCADA y el modelo DeviceCategory de scada_proxy
from scada_proxy.scada_client import ScadaConnectorClient 
from scada_proxy.models import DeviceCategory
import requests

logger = logging.getLogger(__name__)

scada_client = ScadaConnectorClient() 

@method_decorator(cache_page(60 * 5), name='dispatch') # Cachear la respuesta por 5 minutos
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

    def get(self, request, *args, **kwargs):
        token = self.get_scada_token()
        if isinstance(token, Response):
            return token

        try:
            # Obtener el registro de KPI pre-calculado
            kpi_record = MonthlyConsumptionKPI.objects.first()
            if not kpi_record:
                logger.warning("MonthlyConsumptionKPI record not found. Task might not have run yet.")
                pass 

            # --- Consumo Total ---
            total_consumption_current_month = kpi_record.total_consumption_current_month if kpi_record else 0.0
            total_consumption_previous_month = kpi_record.total_consumption_previous_month if kpi_record else 0.0
            
            # --- Generación Total ---
            total_generation_current_month = kpi_record.total_generation_current_month if kpi_record else 0.0
            total_generation_previous_month = kpi_record.total_generation_previous_month if kpi_record else 0.0

            # --- Balance Energético (Generación - Consumo) ---
            net_balance_current_month = (total_generation_current_month / 1000.0) - total_consumption_current_month
            net_balance_previous_month = (total_generation_previous_month / 1000.0) - total_consumption_previous_month

            logger.info(f"Retrieved pre-calculated KPIs: Consumption (C:{total_consumption_current_month}, P:{total_consumption_previous_month}), Generation (C:{total_generation_current_month}, P:{total_generation_previous_month}), Balance (C:{net_balance_current_month}, P:{net_balance_previous_month})")

            # --- Potencia Instantánea Promedio (Inversores) ---
            avg_instantaneous_power_current = kpi_record.avg_instantaneous_power_current_month if kpi_record else 0.0
            avg_instantaneous_power_previous = kpi_record.avg_instantaneous_power_previous_month if kpi_record else 0.0

            logger.info(f"Avg Instantaneous Power: Current: {avg_instantaneous_power_current} W, Previous: {avg_instantaneous_power_previous} W")

            # --- Temperatura Promedio Diaria ---
            avg_daily_temp_current = kpi_record.avg_daily_temp_current_month if kpi_record else 0.0
            avg_daily_temp_previous = kpi_record.avg_daily_temp_previous_month if kpi_record else 0.0
            logger.info(f"Avg Daily Temperature: Current: {avg_daily_temp_current} °C, Previous: {avg_daily_temp_previous} °C")

            # --- Humedad Relativa Promedio ---
            avg_relative_humidity_current = kpi_record.avg_relative_humidity_current_month if kpi_record else 0.0
            avg_relative_humidity_previous = kpi_record.avg_relative_humidity_previous_month if kpi_record else 0.0
            logger.info(f"Avg Relative Humidity: Current: {avg_relative_humidity_current} %RH, Previous: {avg_relative_humidity_previous} %RH")

            # --- Velocidad del Viento Promedio ---
            avg_wind_speed_current = kpi_record.avg_wind_speed_current_month if kpi_record else 0.0
            avg_wind_speed_previous = kpi_record.avg_wind_speed_previous_month if kpi_record else 0.0
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
            def format_energy_value(value_base_unit, base_unit_name="Wh"):
                if base_unit_name == "Wh":
                    if value_base_unit >= 1_000_000_000:
                        return f"{value_base_unit / 1_000_000_000:.2f}", "GWh"
                    elif value_base_unit >= 1_000_000:
                        return f"{value_base_unit / 1_000_000:.2f}", "MWh"
                    elif value_base_unit >= 1_000:
                        return f"{value_base_unit / 1_000:.2f}", "kWh"
                    else:
                        return f"{value_base_unit:.2f}", "Wh"
                elif base_unit_name == "kWh": 
                    if value_base_unit >= 1_000_000:
                        return f"{value_base_unit / 1_000_000:.2f}", "GWh"
                    elif value_base_unit >= 1_000:
                        return f"{value_base_unit / 1_000:.2f}", "MWh"
                    else:
                        return f"{value_base_unit:.2f}", "kWh"
                elif base_unit_name == "W":
                    if value_base_unit >= 1_000_000:
                        return f"{value_base_unit / 1_000_000:.2f}", "MW"
                    elif value_base_unit >= 1_000:
                        return f"{value_base_unit / 1_000:.2f}", "kW"
                    else:
                        return f"{value_base_unit:.2f}", "W"
                elif base_unit_name == "°C": 
                    return f"{value_base_unit:.1f}", "°C" 
                elif base_unit_name == "%RH": 
                    return f"{value_base_unit:.1f}", "%" 
                elif base_unit_name == "km/h": # Nueva unidad para velocidad del viento
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
                elif is_wind_speed: # Lógica específica para Velocidad del Viento
                    # Puedes definir rangos para "Moderado", "Alto", "Bajo"
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
                "Wh" 
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
                "Velocidad del viento", # Título solicitado
                "km/h", # Unidad base de la DB
                is_wind_speed=True # Flag para lógica específica de velocidad del viento
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
                "windSpeed": avg_wind_speed_kpi, # Añadido el nuevo KPI
                "activeInverters": active_inverters_kpi,
            }
            return Response(kpi_data)

        except Exception as e:
            logger.error(f"Internal error processing KPIs from local DB or SCADA: {e}", exc_info=True)
            return Response({"detail": f"Internal server error: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)