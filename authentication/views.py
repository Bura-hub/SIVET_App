from drf_spectacular.utils import extend_schema, OpenApiExample
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .serializers import (
    LoginRequestSerializer,
    LoginResponseSerializer,
    LogoutResponseSerializer
)

# ========================= Vistas de Autenticación =========================

@extend_schema(
    tags=["Autenticación"],
    request=LoginRequestSerializer,
    responses={200: LoginResponseSerializer},
    examples=[
        OpenApiExample(
            "Ejemplo de login",
            value={"username": "admin", "password": "12345"}
        )
    ],
    description="Obtiene un token de autenticación para el usuario especificado."
)
class LoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'is_superuser': user.is_superuser
        })


@extend_schema(
    tags=["Autenticación"],
    responses={200: LogoutResponseSerializer},
    examples=[
        OpenApiExample(
            "Ejemplo de logout",
            value={"detail": "Logout exitoso"}
        )
    ],
    description=(
        "Invalida el token del usuario autenticado (cierra sesión). "
        "Debe enviarse en el encabezado **Authorization: Token <token>**."
    )
)
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.user.auth_token.delete()
        return Response({"detail": "Logout exitoso"}, status=status.HTTP_200_OK)