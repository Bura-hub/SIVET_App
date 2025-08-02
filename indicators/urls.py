from django.urls import path
from .views import ConsumptionSummaryView, ChartDataView  # Se importan ambas vistas

# Definición de las rutas de URL asociadas a esta aplicación
urlpatterns = [
    # Endpoint existente para el resumen de consumo
    path('dashboard/summary/', ConsumptionSummaryView.as_view(), name='consumption-summary'),
    
    path('dashboard/chart-data/', ChartDataView.as_view(), name='chart-data'),
]