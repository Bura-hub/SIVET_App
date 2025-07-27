# Importaciones necesarias para documentación de API con drf_spectacular
from drf_spectacular.utils import extend_schema, OpenApiExample

# Vista base para obtener tokens de autenticación
from rest_framework.authtoken.views import ObtainAuthToken

# Modelo de token de autenticación
from rest_framework.authtoken.models import Token

# Clases y utilidades de respuesta y vistas de DRF
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

# Serializadores personalizados para login y logout
from .serializers import (
    LoginRequestSerializer,
    LoginResponseSerializer,
    LogoutResponseSerializer
)

# ========================= Vistas de Autenticación =========================

@extend_schema(
    tags=["Autenticación"],  # Categoría en la documentación
    request=LoginRequestSerializer,  # Esquema de solicitud esperada
    responses={200: LoginResponseSerializer},  # Esquema de respuesta exitosa
    examples=[
        OpenApiExample(
            "Ejemplo de login",  # Nombre del ejemplo
            value={"username": "admin", "password": "12345"}  # Ejemplo de datos de entrada
        )
    ],
    description="Obtiene un token de autenticación para el usuario especificado."  # Descripción general del endpoint
)
class LoginView(ObtainAuthToken):
    # Maneja la solicitud POST para iniciar sesión
    def post(self, request, *args, **kwargs):
        # Serializa y valida los datos de entrada
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        # Obtiene o crea un token para el usuario autenticado
        token, created = Token.objects.get_or_create(user=user)

        # Devuelve el token junto con información básica del usuario
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'is_superuser': user.is_superuser
        })


@extend_schema(
    tags=["Autenticación"],  # Categoría en la documentación
    responses={200: LogoutResponseSerializer},  # Esquema de respuesta exitosa
    examples=[
        OpenApiExample(
            "Ejemplo de logout",  # Nombre del ejemplo
            value={"detail": "Logout exitoso"}  # Ejemplo de respuesta esperada
        )
    ],
    description=(
        "Invalida el token del usuario autenticado (cierra sesión). "
        "Debe enviarse en el encabezado **Authorization: Token <token>**."  # Instrucciones para el uso correcto del endpoint
    )
)
class LogoutView(APIView):
    # Restringe el acceso a usuarios autenticados únicamente
    permission_classes = [IsAuthenticated]

    # Maneja la solicitud POST para cerrar sesión
    def post(self, request):
        # Elimina el token del usuario actual, invalidando la sesión
        request.user.auth_token.delete()

        # Retorna una respuesta indicando que el logout fue exitoso
        return Response({"detail": "Logout exitoso"}, status=status.HTTP_200_OK)