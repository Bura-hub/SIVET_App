from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .scada_client import ScadaConnectorClient
import logging, requests

from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

logger = logging.getLogger(__name__)
# Instancia del cliente SCADA (puede ser una instancia global o por vista si necesitas más control)
scada_client = ScadaConnectorClient()

class ScadaProxyView(APIView):
    permission_classes = [IsAuthenticated] # Asegura que solo usuarios autenticados de Django puedan acceder

    def get_scada_token(self):
        try:
            return scada_client.get_token()
        except EnvironmentError as e:
            logger.error(f"Error de configuración de SCADA: {e}")
            return Response({"detail": "Error de configuración del servidor SCADA."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener token de SCADA: {e}")
            return Response({"detail": "No se pudo autenticar con la API SCADA. Verifique las credenciales."}, status=status.HTTP_502_BAD_GATEWAY)

@method_decorator(cache_page(60 * 60 * 2), name='dispatch')
class InstitutionsView(ScadaProxyView):
    def get(self, request, *args, **kwargs):
        token = self.get_scada_token()
        if isinstance(token, Response):
            return token
        try:
            institutions_response = scada_client.get_institutions(token)
            data_for_frontend = {
                "data": institutions_response.get("data", []),
                "total": institutions_response.get("total", 0)
            }
            return Response(data_for_frontend)
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener instituciones: {e}")
            return Response({"detail": f"Error SCADA: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

@method_decorator(cache_page(60 * 60 * 2), name='dispatch') # Cachear por 2 horas (60 segundos * 60 minutos * 2)
class DeviceCategoriesView(ScadaProxyView):
    def get(self, request, *args, **kwargs):
        token = self.get_scada_token()
        if isinstance(token, Response):
            return token
        try:
            categories_response = scada_client.get_device_categories(token)

            # Extraer solo el array de 'data' y opcionalmente 'total'
            data_for_frontend = {
                "data": categories_response.get("data", []), 
                "total": categories_response.get("total", 0)
            }

            return Response(data_for_frontend) 
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener categorías de dispositivos de SCADA: {e}")
            return Response({"detail": f"Error al obtener datos de SCADA: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

@method_decorator(cache_page(60 * 5), name='dispatch')
class DevicesView(ScadaProxyView):
    def get(self, request, *args, **kwargs):
        token = self.get_scada_token()
        if isinstance(token, Response):
            return token
        try:
            params = {
                "category_id": request.query_params.get('category_id'),
                "institution_id": request.query_params.get('institution_id'),
                "name": request.query_params.get('name'),
                "limit": int(request.query_params.get('limit')) if request.query_params.get('limit') else None,
                "offset": int(request.query_params.get('offset')) if request.query_params.get('offset') else None
            }

            devices_response = scada_client.get_devices(token, **params)

            data_for_frontend = {
                "data": devices_response.get("data", []),
                "total": devices_response.get("total", 0)
            }
            return Response(data_for_frontend)
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener dispositivos: {e}")
            return Response({"detail": f"Error SCADA: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

class MeasurementsView(ScadaProxyView):
    def get(self, request, device_id, *args, **kwargs):
        token = self.get_scada_token()
        if isinstance(token, Response):
            return token
        try:
            params = {
                "device_id": device_id,
                "from_date": request.query_params.get('from_date'),
                "to_date": request.query_params.get('to_date'),
                "order_by": request.query_params.get('order_by', 'date desc'),
                "limit": int(request.query_params.get('limit')) if request.query_params.get('limit') else None,
                "offset": int(request.query_params.get('offset')) if request.query_params.get('offset') else None
            }

            measurements_response = scada_client.get_measurements(token, **params)

            data_for_frontend = {
                "data": measurements_response.get("data", []),
                "total": measurements_response.get("total", 0)
            }
            return Response(data_for_frontend)
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener mediciones para el dispositivo {device_id}: {e}")
            return Response({"detail": f"Error SCADA: {e}"}, status=status.HTTP_502_BAD_GATEWAY)