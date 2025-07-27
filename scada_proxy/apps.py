# Importación de la clase base AppConfig que permite configurar una aplicación dentro de un proyecto Django
from django.apps import AppConfig


# Definición de la clase de configuración para la aplicación 'scada_proxy'
class ScadaProxyConfig(AppConfig):
    # Especifica el tipo de campo automático por defecto para las claves primarias de los modelos de esta app
    default_auto_field = 'django.db.models.BigAutoField'

    # Nombre de la aplicación, usado por Django para registrar y localizar esta app dentro del proyecto
    name = 'scada_proxy'