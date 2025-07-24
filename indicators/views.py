from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
import logging
from datetime import datetime, timedelta, timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

# Importa el modelo de indicators
from .models import MonthlyConsumptionKPI 
# Importa el cliente SCADA (se mantiene para get_scada_token)
from scada_proxy.scada_client import ScadaConnectorClient 
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
            return Response({"detail": "Could not authenticate with SCADA API. Check credentials."}, status=status.HTTP_502_BAD_GATEWAY)

    def get(self, request, *args, **kwargs):
        token = self.get_scada_token()
        if isinstance(token, Response):
            return token

        try:
            # Obtener el registro de KPI pre-calculado (consumo, generación, balance)
            kpi_record = MonthlyConsumptionKPI.objects.first()
            if not kpi_record:
                logger.warning("MonthlyConsumptionKPI record not found. Task might not have run yet.")
                # Si no hay datos pre-calculados, aún podemos intentar obtener los inversores activos
                # para no bloquear completamente la respuesta.
                pass # Continuar para intentar obtener los inversores activos

            # --- Consumo Total ---
            total_consumption_current_month = kpi_record.total_consumption_current_month if kpi_record else 0.0
            total_consumption_previous_month = kpi_record.total_consumption_previous_month if kpi_record else 0.0
            
            # --- Generación Total ---
            total_generation_current_month = kpi_record.total_generation_current_month if kpi_record else 0.0
            total_generation_previous_month = kpi_record.total_generation_previous_month if kpi_record else 0.0

            # --- Balance Energético ---
            total_imported_current_month = kpi_record.total_imported_current_month if kpi_record else 0.0
            total_imported_previous_month = kpi_record.total_imported_previous_month if kpi_record else 0.0
            total_exported_current_month = kpi_record.total_exported_current_month if kpi_record else 0.0
            total_exported_previous_month = kpi_record.total_exported_previous_month if kpi_record else 0.0
            
            net_balance_current_month = total_imported_current_month - total_exported_current_month
            net_balance_previous_month = total_imported_previous_month - total_exported_previous_month

            logger.info(f"Retrieved pre-calculated KPIs: Consumption (C:{total_consumption_current_month}, P:{total_consumption_previous_month}), Generation (C:{total_generation_current_month}, P:{total_generation_previous_month}), Balance (C:{net_balance_current_month}, P:{net_balance_previous_month})")

            # --- Inversores Activos (Real-time from SCADA API) ---
            active_inverters_count = 0
            total_inverters_count = 0
            inverter_status_text = "normal"
            inverter_description_text = "Cargando..."

            try:
                # category_id = 1 para inversores
                scada_inverters_response = scada_client.get_devices(token, category_id=1) 
                scada_inverters = scada_inverters_response.get('data', []) # Asumiendo que 'data' contiene la lista de dispositivos

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

            except requests.exceptions.RequestException as e:
                logger.error(f"Error getting real-time inverter data from SCADA: {e}")
                inverter_status_text = "error"
                inverter_description_text = "Error de conexión SCADA"
            except Exception as e:
                logger.error(f"Error processing real-time inverter data: {e}", exc_info=True)
                inverter_status_text = "error"
                inverter_description_text = "Error interno"

            # Función de conversión de unidades (se mantiene igual)
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
                return f"{value_base_unit:.2f}", base_unit_name

            def calculate_kpi_metrics(current_value, previous_value, title, base_unit_name, is_balance=False):
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
                        description_text = "Déficit"
                        status_text = "negativo"
                    elif current_value < 0:
                        description_text = "Superávit"
                        status_text = "positivo"
                    else:
                        description_text = "Equilibrio"
                        status_text = "normal"
                else:
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

            # KPI de Equilibrio Energético
            energy_balance_kpi = calculate_kpi_metrics(
                net_balance_current_month,
                net_balance_previous_month, 
                "Equilibrio energético",
                "kWh",
                is_balance=True
            )

            # Nuevo KPI de Inversores Activos
            active_inverters_kpi = {
                "title": "Inversores activos",
                "value": str(active_inverters_count), # Valor como string
                "unit": f"/{total_inverters_count}",
                "description": inverter_description_text,
                "status": inverter_status_text
            }

            kpi_data = {
                "totalConsumption": consumption_kpi,
                "totalGeneration": generation_kpi,
                "energyBalance": energy_balance_kpi,
                "activeInverters": active_inverters_kpi, # Añadido el nuevo KPI
            }
            return Response(kpi_data)

        except Exception as e:
            logger.error(f"Internal error processing KPIs from local DB or SCADA: {e}", exc_info=True)
            return Response({"detail": f"Internal server error: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)