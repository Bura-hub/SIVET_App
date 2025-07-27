import os
from celery import Celery

# Establece la variable de entorno para que Django utilice la configuración del proyecto 'core'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Crea una instancia de Celery asociada al proyecto 'core'
app = Celery('core')

# Configura Celery utilizando los parámetros definidos en la configuración de Django,
# considerando solo los que tienen el prefijo 'CELERY'
app.config_from_object('django.conf:settings', namespace='CELERY')

# Hace que Celery descubra automáticamente tareas definidas en los módulos 'tasks.py'
# de cada aplicación registrada en INSTALLED_APPS
app.autodiscover_tasks()

# Define una tarea de depuración simple que imprime el contenido de la solicitud
@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

# Configura opciones adicionales para el comportamiento de Celery
app.conf.update(
    task_track_started=True,    # Habilita el estado 'STARTED' para las tareas en ejecución
    result_expires=3600,        # Establece que los resultados de las tareas expiren tras 1 hora (3600 segundos)
)