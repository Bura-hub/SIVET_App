# Importación del método 'path' para definir rutas URL
from django.urls import path

# Importación de las vistas necesarias para el manejo de tareas relacionadas con mediciones históricas
from .views import (
    HistoricalMeasurementsTaskView,  # Vista para iniciar una tarea de recolección de datos históricos
    TaskProgressView,                # Vista para consultar el progreso de una tarea específica
    CancelTaskView,                  # Vista para cancelar una tarea en ejecución
    ActiveTasksView,                 # Vista para obtener la lista de tareas activas
    TaskHistoryView                  # Vista para consultar el historial de tareas
)

# Definición de las rutas de la aplicación relacionadas con las tareas SCADA
urlpatterns = [
    # Ruta para iniciar una tarea de recolección de datos históricos
    path('fetch-historical/', HistoricalMeasurementsTaskView.as_view(), name='fetch-historical-task'),

    # Ruta para consultar el progreso de una tarea específica mediante su ID
    path('progress/<str:task_id>/', TaskProgressView.as_view(), name='task-progress'),

    # Ruta para cancelar una tarea en ejecución
    path('cancel/', CancelTaskView.as_view(), name='cancel-task'),

    # Ruta para consultar las tareas activas actualmente en ejecución
    path('active/', ActiveTasksView.as_view(), name='tasks-active'),

    # Ruta para consultar el historial de todas las tareas ejecutadas
    path('history/', TaskHistoryView.as_view(), name='tasks-history'),
]