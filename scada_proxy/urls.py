from django.urls import path
from .views import (
    InstitutionsView, DeviceCategoriesView, DevicesView, MeasurementsView,  # Vistas proxy existentes
    LocalInstitutionListView, LocalDeviceCategoryListView, LocalDeviceListView,  # Vistas de datos locales
    HistoricalMeasurementsView, DailySummaryMeasurementsView,  # Vistas de datos históricos/agregados
    HistoricalMeasurementsTaskView, TaskProgressView, CancelTaskView,
    ActiveTasksView, TaskHistoryView  # Nuevas vistas de tareas
)

urlpatterns = [
    # Rutas SCADA Proxy
    path('institutions/', InstitutionsView.as_view(), name='scada-institutions'),
    path('device-categories/', DeviceCategoriesView.as_view(), name='scada-device-categories'),
    path('devices/', DevicesView.as_view(), name='scada-devices'),
    path('measurements/<str:device_id>/', MeasurementsView.as_view(), name='scada-measurements'),

    # Rutas para datos locales
    path('local/institutions/', LocalInstitutionListView.as_view(), name='local-institutions'),
    path('local/device-categories/', LocalDeviceCategoryListView.as_view(), name='local-device-categories'),
    path('local/devices/', LocalDeviceListView.as_view(), name='local-devices'),
    path('local/measurements/', HistoricalMeasurementsView.as_view(), name='local-measurements'),
    path('local/measurements/daily-summary/', DailySummaryMeasurementsView.as_view(), name='local-measurements-daily-summary'),

    # NUEVAS URLs para tareas
    path('tasks/fetch-historical/', HistoricalMeasurementsTaskView.as_view(), name='fetch-historical-task'),
    path('tasks/progress/<str:task_id>/', TaskProgressView.as_view(), name='task-progress'),
    path('tasks/cancel/', CancelTaskView.as_view(), name='cancel-task'),
    path('tasks/active/', ActiveTasksView.as_view(), name='tasks-active'),
    path('tasks/history/', TaskHistoryView.as_view(), name='tasks-history'),
]
