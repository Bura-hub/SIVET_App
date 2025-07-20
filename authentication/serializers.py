from rest_framework import serializers


class LoginRequestSerializer(serializers.Serializer):
    username = serializers.CharField(
        help_text="Nombre de usuario registrado"
    )
    password = serializers.CharField(
        help_text="Contraseña del usuario"
    )

    class Meta:
        ref_name = "LoginRequest"


class LoginResponseSerializer(serializers.Serializer):
    token = serializers.CharField(help_text="Token de autenticación")
    user_id = serializers.IntegerField(help_text="ID del usuario")
    username = serializers.CharField(help_text="Nombre de usuario")
    is_superuser = serializers.BooleanField(help_text="Indica si es superusuario")

    class Meta:
        ref_name = "LoginResponse"


class LogoutResponseSerializer(serializers.Serializer):
    detail = serializers.CharField(
        default="Logout exitoso",
        help_text="Mensaje de confirmación al cerrar sesión"
    )

    class Meta:
        ref_name = "LogoutResponse"