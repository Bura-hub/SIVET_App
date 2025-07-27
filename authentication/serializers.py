# Importa el módulo de serializadores de Django REST Framework
from rest_framework import serializers

# ========================= Serializador de Solicitud de Login =========================

class LoginRequestSerializer(serializers.Serializer):
    # Campo de nombre de usuario (requerido)
    username = serializers.CharField(
        help_text="Nombre de usuario registrado"
    )

    # Campo de contraseña del usuario (requerido)
    password = serializers.CharField(
        help_text="Contraseña del usuario"
    )

    class Meta:
        # Nombre de referencia para la documentación OpenAPI/Swagger
        ref_name = "LoginRequest"


# ========================= Serializador de Respuesta de Login =========================

class LoginResponseSerializer(serializers.Serializer):
    # Token de autenticación generado tras el login exitoso
    token = serializers.CharField(help_text="Token de autenticación")

    # ID único del usuario autenticado
    user_id = serializers.IntegerField(help_text="ID del usuario")

    # Nombre de usuario autenticado
    username = serializers.CharField(help_text="Nombre de usuario")

    # Indicador booleano que muestra si el usuario es superusuario
    is_superuser = serializers.BooleanField(help_text="Indica si es superusuario")

    class Meta:
        # Nombre de referencia para la documentación OpenAPI/Swagger
        ref_name = "LoginResponse"


# ========================= Serializador de Respuesta de Logout =========================

class LogoutResponseSerializer(serializers.Serializer):
    # Mensaje informativo al cerrar sesión correctamente
    detail = serializers.CharField(
        default="Logout exitoso",
        help_text="Mensaje de confirmación al cerrar sesión"
    )

    class Meta:
        # Nombre de referencia para la documentación OpenAPI/Swagger
        ref_name = "LogoutResponse"