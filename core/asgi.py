"""
ASGI config for core project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

# Establece la variable de entorno para que Django utilice la configuración del proyecto 'core'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Obtiene la aplicación ASGI para el proyecto, necesaria para servidores compatibles con ASGI (como Daphne o Uvicorn)
application = get_asgi_application()
