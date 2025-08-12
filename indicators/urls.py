from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ConsumptionSummaryView, 
    ChartDataView, 
    CalculateKPIsView, 
    CalculateDailyDataView,
    ElectricMeterIndicatorsView,
    InstitutionsListView,
    ElectricMetersListView,
    CalculateElectricMeterDataView,
    TriggerElectricMeterCalculationView,
    ElectricMeterEnergyViewSet,
    ElectricMeterIndicatorsViewSet,
    # Nuevas vistas para inversores
    InverterIndicatorsView,
    InverterChartDataView,
    CalculateInverterDataView,
    InvertersListView,
    # Nueva vista para cálculo eléctrico
    CalculateElectricalDataView
)

router = DefaultRouter()
router.register(r'electrical/energy', ElectricMeterEnergyViewSet, basename='electrical-energy')
router.register(r'electric-meter-indicators', ElectricMeterIndicatorsViewSet, basename='electric-meter-indicators')

# Definición de las rutas de URL asociadas a esta aplicación
urlpatterns = [
    # Endpoints existentes
    path('dashboard/summary/', ConsumptionSummaryView.as_view(), name='consumption-summary'),
    path('dashboard/chart-data/', ChartDataView.as_view(), name='chart-data'),
    path('dashboard/calculate-kpis/', CalculateKPIsView.as_view(), name='calculate-kpis'),
    path('dashboard/calculate-daily-data/', CalculateDailyDataView.as_view(), name='calculate-daily-data'),
    
    # Nuevos endpoints para medidores eléctricos - CORREGIDOS
    path('electric-meters/', ElectricMeterIndicatorsView.as_view(), name='electric-meter-indicators'),
    path('electric-meters/list/', ElectricMetersListView.as_view(), name='electric-meters-list'),
    path('institutions/', InstitutionsListView.as_view(), name='institutions-list'),
    path('electric-meters/calculate/', CalculateElectricMeterDataView.as_view(), name='calculate-electric-meter-data'),
    path('electric-meters/calculate-new/', CalculateElectricalDataView.as_view(), name='calculate-electrical-data'),
    
    # Nuevos endpoints para inversores
    path('inverter-indicators/', InverterIndicatorsView.as_view(), name='inverter-indicators'),
    path('inverter-chart-data/', InverterChartDataView.as_view(), name='inverter-chart-data'),
    path('inverters/calculate/', CalculateInverterDataView.as_view(), name='calculate-inverter-data'),
    path('inverters/list/', InvertersListView.as_view(), name='inverters-list'),
    
    path('', include(router.urls)),
]