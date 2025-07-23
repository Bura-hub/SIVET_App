from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, F, FloatField
from django.db.models.functions import Cast
import logging
from datetime import datetime, timedelta, timezone
import calendar
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from drf_spectacular.utils import extend_schema

# Importa el nuevo modelo de indicators
from .models import MonthlyConsumptionKPI 
# Importa los modelos necesarios de scada_proxy (aunque no se usen directamente para la consulta de KPI)
from scada_proxy.models import Device, Measurement, DeviceCategory 
from scada_proxy.scada_client import ScadaConnectorClient 
import requests

logger = logging.getLogger(__name__)

# NOTA: scada_client se mantiene para get_scada_token si la vista hereda de ScadaProxyView
scada_client = ScadaConnectorClient() 

@extend_schema(
    tags=["Indicadores"],
)    
@method_decorator(cache_page(60 * 5), name='dispatch') # Cachear la respuesta por 5 minutos
class ConsumptionSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    # get_scada_token se mantiene si esta vista hereda de ScadaProxyView o si es necesaria para la autenticación
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
        # Aunque el token se obtiene, no se usará para las consultas a la DB local.
        # Se mantiene para la validación de permisos si ScadaProxyView lo requiere implícitamente.
        token = self.get_scada_token()
        if isinstance(token, Response):
            return token

        try:
            # Obtener el registro de KPI pre-calculado
            kpi_record = MonthlyConsumptionKPI.objects.first()
            if not kpi_record:
                # Si no hay registro, significa que la tarea Celery aún no se ha ejecutado
                # o no hay datos. Podrías lanzar la tarea aquí o devolver un mensaje.
                # Para evitar un cálculo pesado en la primera carga, devolvemos un estado de "no disponible".
                logger.warning("MonthlyConsumptionKPI record not found. Task might not have run yet.")
                return Response(
                    {"detail": "Consumo total no disponible. Calculando, por favor intente de nuevo en unos minutos."},
                    status=status.HTTP_202_ACCEPTED # Accepted, but data not ready
                )

            total_consumption_current_month = kpi_record.total_consumption_current_month
            total_consumption_previous_month = kpi_record.total_consumption_previous_month
            
            logger.info(f"Retrieved pre-calculated KPI: Current month: {total_consumption_current_month}, Previous month: {total_consumption_previous_month}")

            # 4. Calculate comparison and format output (this part remains the same)

            def format_consumption(value_kwh):
                if value_kwh >= 1_000_000:
                    return f"{value_kwh / 1_000_000:.2f}", "GWh"
                elif value_kwh >= 1_000:
                    return f"{value_kwh / 1_000:.2f}", "MWh"
                else:
                    return f"{value_kwh:.2f}", "kWh"

            formatted_current_value, current_unit = format_consumption(total_consumption_current_month)

            change_percentage = 0.0
            status_text = "normal"

            if total_consumption_previous_month > 0:
                change_percentage = ((total_consumption_current_month - total_consumption_previous_month) / total_consumption_previous_month) * 100
                if change_percentage > 0:
                    status_text = "positivo"
                elif change_percentage < 0:
                    status_text = "negativo"
            elif total_consumption_current_month > 0:
                status_text = "positivo"
            
            change_text = f"{'+' if change_percentage >= 0 else ''}{change_percentage:.2f}% vs mes pasado"

            kpi_data = {
                "totalConsumption": {
                    "title": "Consumo total",
                    "value": formatted_current_value,
                    "unit": current_unit,
                    "change": change_text,
                    "status": status_text
                }
            }
            return Response(kpi_data)

        except Exception as e:
            logger.error(f"Internal error processing consumption summary from local DB: {e}", exc_info=True)
            return Response({"detail": f"Internal server error: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)