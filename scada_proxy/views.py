from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated # Para proteger tus endpoints Django
from .scada_client import ScadaConnectorClient
import logging, requests

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

class InstitutionsView(ScadaProxyView):
    def get(self, request, *args, **kwargs):
        token = self.get_scada_token()
        if isinstance(token, Response): # Si get_scada_token devolvió una respuesta de error
            return token
        try:
            institutions = scada_client.get_institutions(token)
            return Response(institutions)
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener instituciones de SCADA: {e}")
            return Response({"detail": f"Error al obtener datos de SCADA: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

class DeviceCategoriesView(ScadaProxyView):
    def get(self, request, *args, **kwargs):
        token = self.get_scada_token()
        if isinstance(token, Response):
            return token
        try:
            # Obtener parámetros de consulta del request de Django
            name = request.query_params.get('name')
            limit = request.query_params.get('limit')
            offset = request.query_params.get('offset')

            device_categories = scada_client.get_device_categories(
                token,
                name=name,
                limit=int(limit) if limit else None,
                offset=int(offset) if offset else None
            )
            return Response(device_categories)
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener categorías de dispositivos de SCADA: {e}")
            return Response({"detail": f"Error al obtener datos de SCADA: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

class DevicesView(ScadaProxyView):
    def get(self, request, *args, **kwargs):
        token = self.get_scada_token()
        if isinstance(token, Response):
            return token
        try:
            category_id = request.query_params.get('category_id')
            institution_id = request.query_params.get('institution_id')
            name = request.query_params.get('name')
            limit = request.query_params.get('limit')
            offset = request.query_params.get('offset')

            devices = scada_client.get_devices(
                token,
                category_id=category_id,
                institution_id=institution_id,
                name=name,
                limit=int(limit) if limit else None,
                offset=int(offset) if offset else None
            )
            return Response(devices)
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener dispositivos de SCADA: {e}")
            return Response({"detail": f"Error al obtener datos de SCADA: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

class MeasurementsView(ScadaProxyView):
    def get(self, request, device_id, *args, **kwargs):
        token = self.get_scada_token()
        if isinstance(token, Response):
            return token
        try:
            from_date = request.query_params.get('from_date')
            to_date = request.query_params.get('to_date')
            order_by = request.query_params.get('order_by', 'date desc')
            limit = request.query_params.get('limit')
            offset = request.query_params.get('offset')

            measurements = scada_client.get_measurements(
                token,
                device_id=device_id,
                from_date=from_date,
                to_date=to_date,
                order_by=order_by,
                limit=int(limit) if limit else None,
                offset=int(offset) if offset else None
            )
            return Response(measurements)
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener mediciones para el dispositivo {device_id} de SCADA: {e}")
            return Response({"detail": f"Error al obtener datos de SCADA: {e}"}, status=status.HTTP_502_BAD_GATEWAY)