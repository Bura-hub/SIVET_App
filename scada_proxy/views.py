from datetime import datetime, timezone
import logging
import requests

from django.db.models import Avg, Max, Min, Sum, F, FloatField, Q
from django.db.models.functions import TruncDay, Cast
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

from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample, OpenApiResponse, OpenApiTypes
from .models import Institution, DeviceCategory, Device, Measurement, TaskProgress
from .serializers import (
    InstitutionSerializer, DeviceCategorySerializer, DeviceSerializer,
    MeasurementSerializer, TaskProgressSerializer, SCADAResponseSerializer,
)
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

@extend_schema(
    tags=["SCADA Proxy"],
    description="Obtiene la lista de instituciones desde el sistema SCADA.",
    responses={200: SCADAResponseSerializer}
)
@method_decorator(cache_page(60 * 60 * 2), name='dispatch')
class InstitutionsView(ScadaProxyView):
    serializer_class = InstitutionSerializer

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


@extend_schema(
    tags=["SCADA Proxy"],
    description="Obtiene las categorías de dispositivos desde el sistema SCADA.",
    responses={200: SCADAResponseSerializer}
)
@method_decorator(cache_page(60 * 60 * 2), name='dispatch')
class DeviceCategoriesView(ScadaProxyView):
    serializer_class = DeviceCategorySerializer

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


@extend_schema(
    tags=["SCADA Proxy"],
    description="Obtiene dispositivos desde el sistema SCADA, filtrando por categoría, institución o nombre.",
    parameters=[
        OpenApiParameter("category_id", str, OpenApiParameter.QUERY, description="Filtrar por ID de categoría"),
        OpenApiParameter("institution_id", str, OpenApiParameter.QUERY, description="Filtrar por ID de institución"),
        OpenApiParameter("name", str, OpenApiParameter.QUERY, description="Filtrar por nombre del dispositivo"),
        OpenApiParameter("limit", int, OpenApiParameter.QUERY, description="Cantidad máxima de resultados"),
        OpenApiParameter("offset", int, OpenApiParameter.QUERY, description="Paginación - desplazamiento inicial"),
    ],
    responses={200: SCADAResponseSerializer}
)
@method_decorator(cache_page(60 * 5), name='dispatch')
class DevicesView(ScadaProxyView):
    serializer_class = DeviceSerializer

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


@extend_schema(
    tags=["SCADA Proxy"],
    description="Obtiene mediciones de un dispositivo desde el sistema SCADA.",
    parameters=[
        OpenApiParameter("from_date", str, OpenApiParameter.QUERY, description="Fecha de inicio en formato ISO 8601"),
        OpenApiParameter("to_date", str, OpenApiParameter.QUERY, description="Fecha final en formato ISO 8601"),
        OpenApiParameter("order_by", str, OpenApiParameter.QUERY, description="Campo y orden para ordenar resultados"),
        OpenApiParameter("limit", int, OpenApiParameter.QUERY, description="Cantidad máxima de resultados"),
        OpenApiParameter("offset", int, OpenApiParameter.QUERY, description="Paginación - desplazamiento inicial"),
    ],
    responses={200: SCADAResponseSerializer}
)
class MeasurementsView(ScadaProxyView):
    serializer_class = MeasurementSerializer

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

@extend_schema(
    tags=["Datos Locales"],
    description="Lista todas las instituciones locales registradas.",
    parameters=[OpenApiParameter("search", str, OpenApiParameter.QUERY, description="Buscar por nombre de institución")],
    responses={200: InstitutionSerializer(many=True)}
)
class LocalInstitutionListView(generics.ListAPIView):
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

@extend_schema(
    tags=["Datos Locales"],
    description="Lista todas las categorías de dispositivos locales con datos SCADA enriquecidos (sin indicatorConfigurations).",
    parameters=[OpenApiParameter("search", str, OpenApiParameter.QUERY, description="Buscar por nombre de categoría (inverter, electricmeter, weatherstation)")],
    responses={200: DeviceCategorySerializer(many=True)}
)
class LocalDeviceCategoryListView(generics.ListAPIView):
    queryset = DeviceCategory.objects.all()
    serializer_class = DeviceCategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)

        try:
            token = scada_client.get_token()
            scada_categories = scada_client.get_device_categories(token).get('data', [])
            scada_map = {str(cat['id']): cat for cat in scada_categories}

            for item in response.data:
                scada_id = item.get('scada_id')
                if scada_id and scada_id in scada_map:
                    # Sobrescribir solo campos relevantes
                    scada_charts = scada_map[scada_id].get('charts', [])
                    # Removemos indicatorConfigurations si existiera
                    for chart in scada_charts:
                        chart.pop('indicatorConfigurations', None)
                    item['charts'] = scada_charts
        except Exception as e:
            logger.warning(f"No se pudo enriquecer categorías con SCADA: {e}")

        return response


@extend_schema(
    tags=["Datos Locales"],
    description="Lista todos los dispositivos locales activos, con soporte de filtros, búsqueda y ordenamiento.",
    parameters=[
        OpenApiParameter("category", int, OpenApiParameter.QUERY, description="ID de la categoría(1:inv 2:Med 3:Est)"),
        OpenApiParameter("institution", int, OpenApiParameter.QUERY, description="ID de la institución(1:Udenar 2:Cesmag 3:Mar 4:UCC 5:HUDN)"),
        OpenApiParameter("is_active", bool, OpenApiParameter.QUERY, description="Filtrar dispositivos activos"),
        OpenApiParameter("search", str, OpenApiParameter.QUERY, description="Buscar por nombre o SCADA ID"),
        OpenApiParameter("ordering", str, OpenApiParameter.QUERY, description="Ordenar por campos como 'name'"),
    ],
    responses={200: DeviceSerializer(many=True)}
)
class LocalDeviceListView(generics.ListAPIView):
    queryset = Device.objects.filter(is_active=True).select_related('category', 'institution')
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'institution', 'is_active']
    search_fields = ['name', 'scada_id']
    ordering_fields = ['name', 'category__name', 'institution__name']

@extend_schema(
    tags=["Datos Locales"],
    description="Lista mediciones históricas filtradas por dispositivo y rango de fechas.",
    parameters=[
        OpenApiParameter("device", str, OpenApiParameter.QUERY, description="ID o SCADA_ID del dispositivo (string)"),
        OpenApiParameter("from_date", str, OpenApiParameter.QUERY, description="Fecha de inicio (ISO 8601)"),
        OpenApiParameter("to_date", str, OpenApiParameter.QUERY, description="Fecha final (ISO 8601)"),
        OpenApiParameter("ordering", str, OpenApiParameter.QUERY, description="Ordenar por 'timestamp' o 'value'"),
    ],
    responses={200: MeasurementSerializer(many=True)}
)
class HistoricalMeasurementsView(generics.ListAPIView):
    queryset = Measurement.objects.all()
    serializer_class = MeasurementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = ['timestamp', 'value']

    def get_queryset(self):
        qs = Measurement.objects.all()

        device_param = self.request.query_params.get('device')
        if device_param:
            if device_param.isdigit():  # Si es un número entero
                qs = qs.filter(device__id=int(device_param))
            else:  # Si no es número, asumimos que es un SCADA_ID
                qs = qs.filter(device__scada_id=device_param)

        from_date = self._parse_date(self.request.query_params.get('from_date'))
        to_date = self._parse_date(self.request.query_params.get('to_date'))
        if from_date:
            qs = qs.filter(date__gte=from_date)
        if to_date:
            qs = qs.filter(date__lte=to_date)

        return qs

    def _parse_date(self, date_str):
        try:
            return datetime.fromisoformat(date_str).astimezone(timezone.utc)
        except (ValueError, TypeError):
            return None

@extend_schema(
    tags=["Datos Locales"],
    description="Obtiene un resumen diario (promedio, máximo, mínimo y suma) de las mediciones de un dispositivo.",
    parameters=[
        OpenApiParameter("device", str, OpenApiParameter.QUERY, description="ID del dispositivo (UUID o string)"),
        OpenApiParameter("variable_key", str, OpenApiParameter.QUERY, description="Clave de la variable medida (dentro de `data`)"),
        OpenApiParameter("from_date", str, OpenApiParameter.QUERY, description="Fecha de inicio (ISO 8601)"),
        OpenApiParameter("to_date", str, OpenApiParameter.QUERY, description="Fecha final (ISO 8601)"),
    ],
    responses={200: OpenApiExample(
        "Ejemplo Resumen Diario",
        value=[{
            "date": "2025-07-10",
            "average": 15.3,
            "max": 30.1,
            "min": 5.4,
            "sum": 153.2
        }]
    )}
)
@method_decorator(cache_page(60 * 30), name='dispatch')
class DailySummaryMeasurementsView(ScadaProxyView):
    serializer_class = MeasurementSerializer

    def get(self, request, *args, **kwargs):
        device_id = request.query_params.get('device')
        variable_key = request.query_params.get('variable_key')
        from_date = self._parse_date(request.query_params.get('from_date'))
        to_date = self._parse_date(request.query_params.get('to_date'))

        if not all([device_id, variable_key, from_date, to_date]):
            return Response(
                {"detail": "Se requieren 'device', 'variable_key', 'from_date' y 'to_date'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Construye el filtro dinámico para JSONField
            value_field = Cast(F(f"data__{variable_key}"), FloatField())

            queryset = Measurement.objects.filter(
                date__range=(from_date, to_date),
                **{f"data__{variable_key}__isnull": False}
            )

            # Si es un entero, filtra por device_id; de lo contrario, por scada_id
            if device_id.isdigit():
                queryset = queryset.filter(device_id=int(device_id))
            else:
                queryset = queryset.filter(device__scada_id=device_id)

            summary = (
                queryset
                .annotate(day=TruncDay('date'))
                .values('day')
                .annotate(
                    average=Avg(value_field),
                    max=Max(value_field),
                    min=Min(value_field),
                    sum=Sum(value_field),
                )
                .order_by('day')
            )

            return Response([
                {
                    'date': s['day'].date().isoformat(),
                    'average': s['average'],
                    'max': s['max'],
                    'min': s['min'],
                    'sum': s['sum']
                } for s in summary
            ])

        except Exception as e:
            return Response(
                {"detail": f"Error al calcular el resumen: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _parse_date(self, date_str):
        try:
            return datetime.fromisoformat(date_str).astimezone(timezone.utc)
        except (ValueError, TypeError):
            return None

# ========================= Celery Tasks Views =========================

@extend_schema(
    tags=["Tareas"],
    description="Lanza una tarea para obtener mediciones históricas.",
    request=OpenApiTypes.OBJECT,
    examples=[
        OpenApiExample(
            "Ejemplo de body",
            value={"time_range_seconds": 1000},
            request_only=True
        )
    ],
    responses={
        202: OpenApiResponse(
            response=OpenApiTypes.OBJECT,
            description="Respuesta tras encolar la tarea",
            examples=[
                OpenApiExample(
                    "Ejemplo de respuesta",
                    value={
                        "task_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
                        "message": "Tarea encolada."
                    }
                )
            ]
        )
    }
)
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
            return Response(
                {"task_id": task.id, "message": "Tarea encolada."},
                status=status.HTTP_202_ACCEPTED
            )
        except Exception as e:
            logger.error(f"Error al lanzar tarea: {e}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    tags=["Tareas"],
    description="Consulta el estado de una tarea por su ID.",
    parameters=[OpenApiParameter("task_id", str, OpenApiParameter.PATH, description="ID de la tarea")],
    responses={200: TaskProgressSerializer}
)
class TaskProgressView(APIView):
    serializer_class = TaskProgressSerializer
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
            result = AsyncResult(task_id)
            if result.state in ["PENDING", "STARTED", "SUCCESS", "FAILURE"]:
                return Response({
                    "task_id": task_id,
                    "status": result.state,
                    "message": "No hay registro en la BD, mostrando estado desde Celery."
                })
            return Response({"error": "Task not found"}, status=status.HTTP_404_NOT_FOUND)


@extend_schema(
    tags=["Tareas"],
    request=OpenApiTypes.OBJECT,
    examples=[
        OpenApiExample(
            "Ejemplo de body",
            value={"task_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"},
            request_only=True
        )
    ],
    responses={
        200: OpenApiResponse(
            response=OpenApiTypes.OBJECT,
            description="Respuesta tras cancelar una tarea",
            examples=[
                OpenApiExample(
                    "Ejemplo de respuesta",
                    value={
                        "task_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
                        "message": "Cancelación solicitada."
                    }
                )
            ]
        )
    }
)
class CancelTaskView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        task_id = request.data.get("task_id")
        if not task_id:
            return Response({"error": "task_id es requerido"}, status=status.HTTP_400_BAD_REQUEST)

        TaskProgress.objects.filter(task_id=task_id).update(
            is_cancelled=True,
            status='CANCELLED',
            message='Tarea cancelada desde API.'
        )
        AsyncResult(task_id).revoke(terminate=False)
        return Response({"task_id": task_id, "message": "Cancelación solicitada."})
    
@extend_schema(
    tags=["Tareas"],
    description="Obtiene las tareas activas, reservadas y programadas en Celery.",
    responses={200: OpenApiExample(
        "Respuesta Ejemplo",
        value={
            "active_tasks": [],
            "reserved_tasks": [],
            "scheduled_tasks": []
        }
    )}
)
class ActiveTasksView(APIView):
    serializer_class = TaskProgressSerializer
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


@extend_schema(
    tags=["Tareas"],
    description="Lista el historial de tareas ejecutadas en el sistema.",
    responses={200: TaskProgressSerializer(many=True)}
)
class TaskHistoryView(generics.ListAPIView):
    queryset = TaskProgress.objects.all().order_by('-started_at')
    serializer_class = TaskProgressSerializer
    permission_classes = [IsAuthenticated]
    
# ========================= Sincronización Local =========================

from django.db import transaction

@extend_schema(
    tags=["Sincronización"],
    description="Sincroniza categorías, instituciones y dispositivos desde SCADA hacia la base local.",
    responses={200: OpenApiExample(
        "Ejemplo Respuesta",
        value={"detail": "Sincronización completada con éxito."}
    )}
)
class SyncLocalDevicesView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = scada_client.get_token()
        if not token:
            return Response({"detail": "No se pudo autenticar con SCADA."},
                            status=status.HTTP_502_BAD_GATEWAY)

        try:
            with transaction.atomic():
                # 1. Sincronizar categorías
                scada_categories = scada_client.get_device_categories(token).get("data", [])
                category_map = {}
                for cat in scada_categories:
                    category_obj, _ = DeviceCategory.objects.update_or_create(
                        scada_id=cat["id"],
                        defaults={"name": cat["name"], "description": cat.get("description", "")}
                    )
                    category_map[cat["id"]] = category_obj

                # 2. Sincronizar instituciones
                scada_institutions = scada_client.get_institutions(token).get("data", [])
                institution_map = {}
                for inst in scada_institutions:
                    institution_obj, _ = Institution.objects.update_or_create(
                        scada_id=inst["id"],
                        defaults={"name": inst["name"]}
                    )
                    institution_map[inst["id"]] = institution_obj

                # 3. Sincronizar dispositivos
                scada_devices = scada_client.get_devices(token).get("data", [])
                for dev in scada_devices:
                    category_obj = category_map.get(dev["category"]["id"]) if dev.get("category") else None
                    institution_obj = institution_map.get(dev["institution"]["id"]) if dev.get("institution") else None

                    Device.objects.update_or_create(
                        scada_id=dev["id"],
                        defaults={
                            "name": dev["name"],
                            "status": dev.get("status"),
                            "category": category_obj,
                            "institution": institution_obj,
                            "is_active": True
                        }
                    )

            return Response({"detail": "Sincronización completada con éxito."}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error al sincronizar datos locales: {e}", exc_info=True)
            return Response({"detail": f"Error: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)