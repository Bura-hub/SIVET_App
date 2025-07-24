from django.urls import path
from .views import ConsumptionSummaryView

urlpatterns = [
    path('dashboard/consumption-summary/', ConsumptionSummaryView.as_view(), name='consumption-summary'),
]