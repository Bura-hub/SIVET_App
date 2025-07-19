from django.urls import path
from .views import (
    InstitutionsView, DeviceCategoriesView, DevicesView, MeasurementsView, # Vistas proxy existentes
    LocalInstitutionListView, LocalDeviceCategoryListView, LocalDeviceListView, # Vistas de datos locales
    HistoricalMeasurementsView, DailySummaryMeasurementsView # Vistas de datos históricos/agregados
)

urlpatterns = [
    path('institutions/', InstitutionsView.as_view(), name='scada-institutions'),
    path('device-categories/', DeviceCategoriesView.as_view(), name='scada-device-categories'),
    path('devices/', DevicesView.as_view(), name='scada-devices'),
    path('measurements/<str:device_id>/', MeasurementsView.as_view(), name='scada-measurements'),
    
    # NUEVAS URLs para datos históricos almacenados localmente
    path('local/institutions/', LocalInstitutionListView.as_view(), name='local-institutions'),
    path('local/device-categories/', LocalDeviceCategoryListView.as_view(), name='local-device-categories'),
    path('local/devices/', LocalDeviceListView.as_view(), name='local-devices'),
    path('local/measurements/', HistoricalMeasurementsView.as_view(), name='local-measurements'),
    path('local/measurements/daily-summary/', DailySummaryMeasurementsView.as_view(), name='local-measurements-daily-summary'),
    # Añade aquí más URLs para tus vistas de indicadores o resúmenes
]