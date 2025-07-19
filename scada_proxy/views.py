from datetime import datetime, timezone
import logging
import requests

from django.db.models import Avg, Max, Min, Sum
from django.db.models.functions import TruncDay
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend

from celery.result import AsyncResult
from celery import current_app

from .models import Institution, DeviceCategory, Device, Measurement, TaskProgress
from .serializers import InstitutionSerializer, DeviceCategorySerializer, DeviceSerializer, MeasurementSerializer, TaskProgressSerializer
from .scada_client import ScadaConnectorClient
from .tasks import fetch_historical_measurements_for_all_devices

logger = logging.getLogger(__name__)
scada_client = ScadaConnectorClient()


# ========================= SCADA Proxy Base =========================

class ScadaProxyView(APIView):
    permission_classes = [IsAuthenticated]

    def get_scada_token(self):
        """
        Obtiene el token de SCADA o devuelve una respuesta de error.
        """
        try:
            return scada_client.get_token()
        except EnvironmentError as e:
            logger.error(f"Error de configuración de SCADA: {e}")
            return Response({"detail": "Error de configuración del servidor SCADA."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener token de SCADA: {e}")
            return Response({"detail": "No se pudo autenticar con la API SCADA."},
                            status=status.HTTP_502_BAD_GATEWAY)


# ========================= SCADA Proxy Views =========================

@method_decorator(cache_page(60 * 60 * 2), name='dispatch')
class InstitutionsView(ScadaProxyView):
    def get(self, request, *args, **kwargs):
        token = self.get_scada_token()
        if isinstance(token, Response):
            return token
        try:
            resp = scada_client.get_institutions(token)
            return Response({"data": resp.get("data", []), "total": resp.get("total", 0)})
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener instituciones: {e}")
            return Response({"detail": f"Error SCADA: {e}"}, status=status.HTTP_502_BAD_GATEWAY)


@method_decorator(cache_page(60 * 60 * 2), name='dispatch')
class DeviceCategoriesView(ScadaProxyView):
    def get(self, request, *args, **kwargs):
        token = self.get_scada_token()
        if isinstance(token, Response):
            return token
        try:
            resp = scada_client.get_device_categories(token)
            return Response({"data": resp.get("data", []), "total": resp.get("total", 0)})
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener categorías de SCADA: {e}")
            return Response({"detail": f"Error SCADA: {e}"}, status=status.HTTP_502_BAD_GATEWAY)


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
                "limit": request.query_params.get('limit'),
                "offset": request.query_params.get('offset')
            }
            resp = scada_client.get_devices(token, **params)
            return Response({"data": resp.get("data", []), "total": resp.get("total", 0)})
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
                "limit": request.query_params.get('limit'),
                "offset": request.query_params.get('offset')
            }
            resp = scada_client.get_measurements(token, **params)
            return Response({"data": resp.get("data", []), "total": resp.get("total", 0)})
        except requests.exceptions.RequestException as e:
            logger.error(f"Error al obtener mediciones para {device_id}: {e}")
            return Response({"detail": f"Error SCADA: {e}"}, status=status.HTTP_502_BAD_GATEWAY)


# ========================= Local Models Views =========================

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
    serializer_class = MeasurementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['device', 'variable_key']
    ordering_fields = ['timestamp', 'value']

    def get_queryset(self):
        qs = Measurement.objects.all()
        from_date = self._parse_date(self.request.query_params.get('from_date'))
        to_date = self._parse_date(self.request.query_params.get('to_date'))
        if from_date:
            qs = qs.filter(timestamp__gte=from_date)
        if to_date:
            qs = qs.filter(timestamp__lte=to_date)
        return qs

    def _parse_date(self, date_str):
        try:
            return datetime.fromisoformat(date_str).astimezone(timezone.utc)
        except (ValueError, TypeError):
            return None


@method_decorator(cache_page(60 * 30), name='dispatch')
class DailySummaryMeasurementsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        device_id = request.query_params.get('device')
        variable_key = request.query_params.get('variable_key')
        from_date = self._parse_date(request.query_params.get('from_date'))
        to_date = self._parse_date(request.query_params.get('to_date'))

        if not all([device_id, variable_key, from_date, to_date]):
            return Response({"detail": "Se requieren 'device', 'variable_key', 'from_date' y 'to_date'."},
                            status=status.HTTP_400_BAD_REQUEST)

        summary = Measurement.objects.filter(
            device_id=device_id,
            variable_key=variable_key,
            timestamp__range=(from_date, to_date)
        ).annotate(day=TruncDay('timestamp')).values('day').annotate(
            average=Avg('value'),
            max=Max('value'),
            min=Min('value'),
            sum=Sum('value')
        ).order_by('day')

        return Response([{
            'date': s['day'].date().isoformat(),
            'average': s['average'],
            'max': s['max'],
            'min': s['min'],
            'sum': s['sum']
        } for s in summary])

    def _parse_date(self, date_str):
        try:
            return datetime.fromisoformat(date_str).astimezone(timezone.utc)
        except (ValueError, TypeError):
            return None


# ========================= Celery Tasks Views =========================

class HistoricalMeasurementsTaskView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            seconds = int(request.data.get('time_range_seconds', 31536000))
            task = fetch_historical_measurements_for_all_devices.delay(seconds)
            TaskProgress.objects.create(
                task_id=task.id,
                status='PENDING',
                total_devices=Device.objects.filter(is_active=True).count(),
                message="Tarea de obtención histórica encolada."
            )
            return Response({"task_id": task.id, "message": "Tarea encolada."},
                            status=status.HTTP_202_ACCEPTED)
        except Exception as e:
            logger.error(f"Error al lanzar tarea: {e}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TaskProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        try:
            progress = TaskProgress.objects.get(task_id=task_id)
            return Response({
                "task_id": progress.task_id,
                "status": progress.status,
                "processed_devices": progress.processed_devices,
                "total_devices": progress.total_devices,
                "progress_percent": progress.progress_percent(),
                "message": progress.message,
                "started_at": progress.started_at,
                "finished_at": progress.finished_at
            })
        except TaskProgress.DoesNotExist:
            # Consulta el estado de Celery
            result = AsyncResult(task_id)
            if result.state in ["PENDING", "STARTED", "SUCCESS", "FAILURE"]:
                return Response({
                    "task_id": task_id,
                    "status": result.state,
                    "message": "No hay registro en la BD, mostrando estado desde Celery."
                })
            return Response({"error": "Task not found"}, status=status.HTTP_404_NOT_FOUND)

class CancelTaskView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        task_id = request.data.get("task_id")
        if not task_id:
            return Response({"error": "task_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Marcar en la DB
            TaskProgress.objects.filter(task_id=task_id).update(
                is_cancelled=True,
                status='CANCELLED',
                message='Tarea cancelada desde API.'
            )

            # Cancelar en Celery (subtareas que aún no comenzaron)
            AsyncResult(task_id).revoke(terminate=False)

            return Response({"task_id": task_id, "message": "Cancelación solicitada."}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error al cancelar tarea {task_id}: {e}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ActiveTasksView(APIView):
    """
    Muestra las tareas activas, reservadas y programadas de Celery.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            insp = current_app.control.inspect()
            active = insp.active() or {}
            reserved = insp.reserved() or {}
            scheduled = insp.scheduled() or {}

            return Response({
                "active_tasks": active,
                "reserved_tasks": reserved,
                "scheduled_tasks": scheduled
            })
        except Exception as e:
            logger.error(f"Error al inspeccionar tareas activas: {e}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class TaskHistoryView(generics.ListAPIView):
    """
    Lista todas las tareas registradas en TaskProgress.
    """
    queryset = TaskProgress.objects.all().order_by('-started_at')
    serializer_class = TaskProgressSerializer
    permission_classes = [IsAuthenticated]
