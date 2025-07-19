from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from datetime import datetime, timedelta, timezone
from .models import Institution, DeviceCategory, Device, Measurement
from .serializers import InstitutionSerializer, DeviceCategorySerializer, DeviceSerializer, MeasurementSerializer
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


# Vistas de listado y detalle para tus modelos locales
class LocalInstitutionListView(generics.ListAPIView):
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

class LocalDeviceCategoryListView(generics.ListAPIView):
    queryset = DeviceCategory.objects.all()
    serializer_class = DeviceCategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

class LocalDeviceListView(generics.ListAPIView):
    queryset = Device.objects.filter(is_active=True).select_related('category', 'institution')
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'institution', 'is_active']
    search_fields = ['name', 'scada_id']
    ordering_fields = ['name', 'category__name', 'institution__name']
    pagination_class = PageNumberPagination

class HistoricalMeasurementsView(generics.ListAPIView):
    queryset = Measurement.objects.all()
    serializer_class = MeasurementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    # Permite filtrar por dispositivo, variable_key, y rango de tiempo
    filterset_fields = ['device', 'variable_key']
    ordering_fields = ['timestamp', 'value']

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtrado por rango de tiempo (fecha de inicio y fin)
        from_date_str = self.request.query_params.get('from_date')
        to_date_str = self.request.query_params.get('to_date')

        if from_date_str:
            try:
                from_date = datetime.fromisoformat(from_date_str).astimezone(timezone.utc)
                queryset = queryset.filter(timestamp__gte=from_date)
            except ValueError:
                pass # Manejo de error si la fecha no es válida
        if to_date_str:
            try:
                to_date = datetime.fromisoformat(to_date_str).astimezone(timezone.utc)
                queryset = queryset.filter(timestamp__lte=to_date)
            except ValueError:
                pass # Manejo de error si la fecha no es válida

        return queryset

@method_decorator(cache_page(60 * 30), name='dispatch')
class DailySummaryMeasurementsView(generics.ListAPIView):
    serializer_class = MeasurementSerializer # Podrías necesitar un serializer diferente para datos agregados
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # No se usa un queryset base aquí porque se agrupará.
        return Measurement.objects.none()

    def list(self, request, *args, **kwargs):
        device_id = request.query_params.get('device')
        variable_key = request.query_params.get('variable_key')
        from_date_str = request.query_params.get('from_date')
        to_date_str = request.query_params.get('to_date')

        if not all([device_id, variable_key, from_date_str, to_date_str]):
            return Response({"detail": "Se requieren 'device', 'variable_key', 'from_date' y 'to_date'."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from_date = datetime.fromisoformat(from_date_str).astimezone(timezone.utc)
            to_date = datetime.fromisoformat(to_date_str).astimezone(timezone.utc)
        except ValueError:
            return Response({"detail": "Formato de fecha inválido. Use ISO 8601."}, status=status.HTTP_400_BAD_REQUEST)

        # Lógica de agregación para obtener indicadores diarios
        # Ejemplo: Promedio diario de una variable para un dispositivo
        from django.db.models import Avg, Max, Min, Sum
        from django.db.models.functions import TruncDay

        summary_data = Measurement.objects.filter(
            device_id=device_id,
            variable_key=variable_key,
            timestamp__range=(from_date, to_date)
        ).annotate(
            day=TruncDay('timestamp')
        ).values('day').annotate(
            average_value=Avg('value'),
            max_value=Max('value'),
            min_value=Min('value'),
            total_sum=Sum('value') # Útil para energía
        ).order_by('day')

        # Puedes formatear esto como quieras para el frontend
        results = [{
            'date': entry['day'].date().isoformat(),
            'average': entry['average_value'],
            'max': entry['max_value'],
            'min': entry['min_value'],
            'sum': entry['total_sum']
        } for entry in summary_data]

        return Response(results)

def validate_date(self, date_str):
    try:
        return datetime.fromisoformat(date_str).astimezone(timezone.utc)
    except (ValueError, TypeError):
        return None
# Añade más vistas de agregación para otros indicadores (mensual, anual, etc.)
# dependiendo de los requisitos de tu frontend.