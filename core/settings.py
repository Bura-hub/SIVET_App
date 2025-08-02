"""
Configuración de Django para el proyecto core.

Generado por 'django-admin startproject' usando Django 5.2.4.

Para más información sobre este archivo:
https://docs.djangoproject.com/en/5.2/topics/settings/
"""

import os
from pathlib import Path
from dotenv import load_dotenv  # Permite cargar variables de entorno desde un archivo .env
from datetime import timedelta  # Para definir intervalos de tiempo en Celery
from celery.schedules import crontab

# Carga las variables de entorno del archivo .env
load_dotenv()

# Extrae credenciales SCADA desde variables de entorno
SCADA_USERNAME = os.getenv("SCADA_USERNAME")
SCADA_PASSWORD = os.getenv("SCADA_PASSWORD")

# Validación temprana para asegurar que las credenciales estén presentes
if not SCADA_USERNAME or not SCADA_PASSWORD:
    raise EnvironmentError("SCADA_USERNAME or SCADA_PASSWORD environment variables are not set.")

# ========================= Rutas del Proyecto =========================

# Ruta base del proyecto
BASE_DIR = Path(__file__).resolve().parent.parent

# ========================= Configuración General =========================

# Clave secreta del proyecto (¡no debe compartirse públicamente!)
SECRET_KEY = 'django-insecure-e=gg2m8*l$v$#0qq%*^sxpu23!kfw6rak55*o2t^_0^*w!^-zi'

# Modo debug activo (solo para desarrollo)
DEBUG = True

# Lista de hosts permitidos (comentada por ahora)
# ALLOWED_HOSTS = ['127.0.0.1', 'localhost', 'sivet.com']

# ========================= Aplicaciones Registradas =========================

INSTALLED_APPS = [
    'django.contrib.admin',                 # Admin de Django
    'django.contrib.auth',                  # Autenticación
    'django.contrib.contenttypes',          # Tipos de contenido (modelo base)
    'django.contrib.sessions',              # Soporte para sesiones
    'django.contrib.messages',              # Sistema de mensajes
    'django.contrib.staticfiles',           # Archivos estáticos

    # Aplicaciones de terceros
    'rest_framework',                       # Django REST Framework
    'corsheaders',                          # CORS (Cross-Origin Resource Sharing)
    'rest_framework.authtoken',             # Token Auth para DRF
    'django_celery_beat',                   # Planificación de tareas periódicas con Celery
    'django_filters',                       # Filtros para DRF
    'drf_spectacular',                      # Generación de documentación OpenAPI

    # Aplicaciones personalizadas
    'authentication',
    'indicators',
    'scada_proxy',
]

# ========================= Middleware =========================

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # CORS antes del CommonMiddleware
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ========================= CORS =========================

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # React frontend
    "http://127.0.0.1:3000",
]

# Restringe CORS a orígenes definidos explícitamente
CORS_ALLOW_ALL_ORIGINS = False

# ========================= Enrutamiento =========================

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],  # Puedes añadir rutas de templates personalizadas aquí
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# ========================= Base de Datos =========================

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv("name_db"),
        'USER': os.getenv("user_postgres"),
        'PASSWORD': os.getenv("password_user_postgres"),
        'HOST': 'localhost',
        'PORT': os.getenv("port_postgres", '5432'),
        'OPTIONS': {
            'options': '-c client_encoding=UTF8'
        }
    }
}

# ========================= Validación de Contraseñas =========================

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ========================= Internacionalización =========================

LANGUAGE_CODE = 'es-co'
TIME_ZONE = 'America/Bogota'
USE_I18N = True
USE_TZ = True

# ========================= Archivos Estáticos =========================

STATIC_URL = 'static/'

# ========================= Configuración por defecto de PK =========================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ========================= Django REST Framework =========================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',     # Autenticación por token
        'rest_framework.authentication.SessionAuthentication',   # Para acceso al admin
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',            # Requiere login por defecto
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',  # Esquema OpenAPI
}

# ========================= Caché en Memoria =========================

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
        'TIMEOUT': 300,        # Elementos expiran en 5 minutos
        'OPTIONS': {
            'MAX_ENTRIES': 1000  # Máximo de objetos en caché
        }
    }
}

# ========================= Celery =========================

# Broker y backend de resultados (usando Redis)
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'

CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'America/Bogota'
CELERY_TASK_TRACK_STARTED = True
CELERY_RESULT_EXTENDED = True

# Usar el programador basado en base de datos
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# ========================= Tareas Periódicas =========================

CELERY_BEAT_SCHEDULE = {
    'fetch-device-metadata-daily': {
        # Sincroniza los metadatos de los dispositivos diariamente a las 3:00 AM.
        'task': 'scada_proxy.tasks.sync_scada_metadata',
        'schedule': crontab(minute=0, hour=3),
    },
    'fetch-historical-measurements-hourly': {
        # Busca mediciones históricas cada hora al inicio del minuto 0.
        'task': 'scada_proxy.tasks.fetch_historical_measurements_for_all_devices',
        'schedule': crontab(minute=0),
        'args': (int(timedelta(hours=2).total_seconds()),),  # Últimas 2 horas
    },
    'calculate-monthly-consumption-kpi-daily': {
        # Calcula el KPI de consumo mensualmente diariamente a las 3:30 AM.
        'task': 'indicators.tasks.calculate_monthly_consumption_kpi',
        'schedule': crontab(minute=30, hour=3),
        'args': (),
        'kwargs': {},
        'options': {'queue': 'default'},
    },
    'calculate-daily-chart-data': {
        # ¡NUEVA TAREA! Calcula y guarda los datos diarios del gráfico.
        # Se ejecuta a las 3:45 AM para asegurarse de que todos los datos del día anterior están disponibles.
        'task': 'indicators.tasks.calculate_and_save_daily_data',
        'schedule': timedelta(days=1),
        'args': (),
        'kwargs': {},
        'options': {'queue': 'default'},
    },
}

# ========================= Documentación de la API (drf-spectacular) =========================

SPECTACULAR_SETTINGS = {
    'TITLE': 'SIVET API',
    'DESCRIPTION': (
        'API para integrar datos SCADA con sistemas de monitoreo y análisis, '
        'permitiendo la consulta de dispositivos y mediciones, así como la ejecución '
        'y seguimiento de tareas de procesamiento histórico en segundo plano.'
    ),
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SECURITY': [{"TokenAuth": []}],
    'COMPONENTS': {
        'securitySchemes': {
            'TokenAuth': {
                'type': 'apiKey',
                'in': 'header',
                'name': 'Authorization',
                'description': "Formato: **Token <tu_token>**"
            }
        }
    },
}