"""
WSGI config for core project.

Este archivo expone el callable WSGI como una variable a nivel de módulo llamada `application`.

WSGI (Web Server Gateway Interface) es el estándar utilizado para desplegar aplicaciones Django
en servidores compatibles (como Gunicorn, uWSGI, etc.).

Para más información sobre cómo desplegar con WSGI, consulta:
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

# Importa el módulo os para manipular variables de entorno
import os

# Importa la función para obtener la aplicación WSGI de Django
from django.core.wsgi import get_wsgi_application

# Establece la configuración por defecto del entorno para el proyecto Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Instancia de la aplicación WSGI, que será utilizada por el servidor para comunicarse con Django
application = get_wsgi_application()