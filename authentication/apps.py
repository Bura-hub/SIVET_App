# Importa la clase base AppConfig para definir la configuración de la aplicación
from django.apps import AppConfig


# ========================= Configuración de la Aplicación =========================

class AuthenticationConfig(AppConfig):
    # Define el tipo de campo automático por defecto para las claves primarias
    default_auto_field = 'django.db.models.BigAutoField'

    # Nombre interno de la aplicación, utilizado por Django para el ruteo y la organización
    name = 'authentication'