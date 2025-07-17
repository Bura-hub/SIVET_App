from django.urls import path
from .views import InstitutionsView, DeviceCategoriesView, DevicesView, MeasurementsView

urlpatterns = [
    path('institutions/', InstitutionsView.as_view(), name='scada-institutions'),
    path('device-categories/', DeviceCategoriesView.as_view(), name='scada-device-categories'),
    path('devices/', DevicesView.as_view(), name='scada-devices'),
    path('measurements/<str:device_id>/', MeasurementsView.as_view(), name='scada-measurements'),
]