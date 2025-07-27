# Importación de la función 'path' para definir patrones de URL en Django
from django.urls import path

# Importación de las vistas que manejan las operaciones sobre instituciones, dispositivos y mediciones a nivel local
from .views import (
    LocalInstitutionListView,           # Vista para listar las instituciones locales registradas
    LocalDeviceCategoryListView,        # Vista para listar las categorías de dispositivos disponibles localmente
    LocalDeviceListView,                # Vista para listar los dispositivos locales
    HistoricalMeasurementsView,         # Vista para consultar mediciones históricas de los dispositivos locales
    DailySummaryMeasurementsView,       # Vista para obtener un resumen diario de mediciones locales
    SyncLocalDevicesView                # Vista encargada de sincronizar dispositivos locales con una fuente externa
)

# Definición del conjunto de rutas disponibles para la API local SCADA
urlpatterns = [
    # Ruta para obtener la lista de instituciones locales disponibles
    path('institutions/', LocalInstitutionListView.as_view(), name='local-institutions'),

    # Ruta para consultar las categorías de dispositivos locales
    path('device-categories/', LocalDeviceCategoryListView.as_view(), name='local-device-categories'),

    # Ruta para obtener los dispositivos registrados en el entorno local
    path('devices/', LocalDeviceListView.as_view(), name='local-devices'),

    # Ruta para acceder a las mediciones históricas locales de los dispositivos
    path('measurements/', HistoricalMeasurementsView.as_view(), name='local-measurements'),

    # Ruta para obtener un resumen diario de las mediciones locales (agrupadas por día)
    path('measurements/daily-summary/', DailySummaryMeasurementsView.as_view(), name='local-measurements-daily-summary'),

    # Ruta para sincronizar dispositivos locales con otra fuente (por ejemplo, un sistema SCADA centralizado)
    path('sync-devices/', SyncLocalDevicesView.as_view(), name='sync-local-devices'),
]