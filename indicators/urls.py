from django.urls import path
from .views import ConsumptionSummaryView, ChartDataView, CalculateKPIsView, CalculateDailyDataView  # Se importan todas las vistas

# Definición de las rutas de URL asociadas a esta aplicación
urlpatterns = [
    # Endpoint existente para el resumen de consumo
    path('dashboard/summary/', ConsumptionSummaryView.as_view(), name='consumption-summary'),
    
    path('dashboard/chart-data/', ChartDataView.as_view(), name='chart-data'),
    
    # Nuevos endpoints para ejecutar tareas manualmente
    path('dashboard/calculate-kpis/', CalculateKPIsView.as_view(), name='calculate-kpis'),
    path('dashboard/calculate-daily-data/', CalculateDailyDataView.as_view(), name='calculate-daily-data'),
]