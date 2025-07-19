import os
from celery import Celery

# Establece la variable de entorno de configuración predeterminada de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('core')

# Usar el config de Django para Celery
app.config_from_object('django.conf:settings', namespace='CELERY')

# Carga las tareas de todas las aplicaciones de Django registradas en INSTALLED_APPS
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
    
app.conf.update(
    task_track_started=True,    # Permite el estado STARTED
    result_expires=3600,        # Resultados expiran en 1 hora
)