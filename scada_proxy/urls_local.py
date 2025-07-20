from django.urls import path
from .views import (
    LocalInstitutionListView, LocalDeviceCategoryListView,
    LocalDeviceListView, HistoricalMeasurementsView,
    DailySummaryMeasurementsView, SyncLocalDevicesView
)


urlpatterns = [
    path('institutions/', LocalInstitutionListView.as_view(), name='local-institutions'),
    path('device-categories/', LocalDeviceCategoryListView.as_view(), name='local-device-categories'),
    path('devices/', LocalDeviceListView.as_view(), name='local-devices'),
    path('measurements/', HistoricalMeasurementsView.as_view(), name='local-measurements'),
    path('measurements/daily-summary/', DailySummaryMeasurementsView.as_view(), name='local-measurements-daily-summary'),
    path('sync-devices/', SyncLocalDevicesView.as_view(), name='sync-local-devices'),
]