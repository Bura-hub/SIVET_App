import os
from celery import Celery
from celery.schedules import crontab

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
    
    # Configuración de tareas periódicas
    beat_schedule={
        # Sincronizar metadatos cada 6 horas
        'sync-scada-metadata-every-6-hours': {
            'task': 'scada_proxy.tasks.sync_scada_metadata',
            'schedule': crontab(minute=0, hour='*/6'),  # Cada 6 horas (00:00, 06:00, 12:00, 18:00)
        },
        
        # Sincronizar metadatos al inicio del día
        'sync-scada-metadata-daily': {
            'task': 'scada_proxy.tasks.sync_scada_metadata',
            'schedule': crontab(minute=0, hour=2),  # Todos los días a las 2:00 AM
        },
        
        # Verificar dispositivos cada hora
        'check-devices-status-hourly': {
            'task': 'scada_proxy.tasks.check_devices_status',
            'schedule': crontab(minute=1),  # Cada hora a los 30 minutos
        },
        
        # Reparar relaciones de dispositivos después de la verificación
        'repair-device-relationships-after-check': {
            'task': 'scada_proxy.tasks.repair_device_relationships',
            'schedule': crontab(minute=2),  # 5 minutos después de check-devices-status
        },
    },
)