from django.shortcuts import render

# Mis importaciones
from rest_framework import viewsets
from .models import Indicator
from .serializers import IndicatorSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from datetime import datetime, timedelta

# Create your views here.
class IndicatorViewSet(viewsets.ModelViewSet):
    queryset = Indicator.objects.all()
    serializer_class = IndicatorSerializer
    # permission_classes = [AllowAny] # Si quisiera que esta vista fuera pública

    @action(detail=False, methods=['get'], url_path='by-source-and-range')
    def get_by_source_and_range(self, request):
        source = request.query_params.get('source', None)
        days = int(request.query_params.get('days', 30)) # Default 30 days

        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        queryset = self.queryset.filter(timestamp__range=(start_date, end_date))

        if source:
            queryset = queryset.filter(source=source)

        # Ordenar por timestamp ascendente para gráficos de series de tiempo
        queryset = queryset.order_by('timestamp')

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)