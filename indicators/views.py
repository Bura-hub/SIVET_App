from rest_framework import viewsets
from .models import Indicator
from .serializers import IndicatorSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import datetime, timedelta

from drf_spectacular.utils import extend_schema, OpenApiParameter  # Import necesario

# ========================= Vistas de Indicadores =========================

@extend_schema(tags=["Indicadores"])
class IndicatorViewSet(viewsets.ModelViewSet):
    queryset = Indicator.objects.all()
    serializer_class = IndicatorSerializer
    
    @extend_schema(
        tags=["Indicadores"],
        parameters=[
            OpenApiParameter(name="source", description="Fuente del indicador", required=False, type=str),
            OpenApiParameter(name="days", description="Cantidad de días a consultar (default: 30)", required=False, type=int),
        ],
        description="Obtiene indicadores filtrados por fuente y rango de días.",
        responses={200: IndicatorSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='by-source-and-range')
    def get_by_source_and_range(self, request):
        source = request.query_params.get('source', None)
        days = int(request.query_params.get('days', 30))  # Default 30 días

        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        queryset = self.queryset.filter(timestamp__range=(start_date, end_date))
        if source:
            queryset = queryset.filter(source=source)

        queryset = queryset.order_by('timestamp')  # Orden por fecha ascendente
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)