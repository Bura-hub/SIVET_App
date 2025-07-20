from django.urls import path
from .views import (
    HistoricalMeasurementsTaskView,
    TaskProgressView,
    CancelTaskView,
    ActiveTasksView,
    TaskHistoryView
)

urlpatterns = [
    path('fetch-historical/', HistoricalMeasurementsTaskView.as_view(), name='fetch-historical-task'),
    path('progress/<str:task_id>/', TaskProgressView.as_view(), name='task-progress'),
    path('cancel/', CancelTaskView.as_view(), name='cancel-task'),
    path('active/', ActiveTasksView.as_view(), name='tasks-active'),
    path('history/', TaskHistoryView.as_view(), name='tasks-history'),
]