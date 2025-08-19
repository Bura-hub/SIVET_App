# Importaciones necesarias para documentación de API con drf_spectacular
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiParameter

# Vista base para obtener tokens de autenticación
from rest_framework.authtoken.views import ObtainAuthToken

# Modelo de token de autenticación
from rest_framework.authtoken.models import Token

# Clases y utilidades de respuesta y vistas de DRF
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.viewsets import ViewSet
from rest_framework.exceptions import AuthenticationFailed

# Rate limiting
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator

# Utilidades de Django
from django.utils import timezone
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

# No logging por seguridad

# Serializadores personalizados para login y logout
from .serializers import (
    LoginRequestSerializer,
    LoginResponseSerializer,
    LogoutResponseSerializer,
    RefreshTokenRequestSerializer,
    RefreshTokenResponseSerializer,
    ChangePasswordSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
    SessionInfoSerializer
)

# Modelos personalizados
from .models import UserProfile, AuthToken, RefreshToken

# Utilidades
import ipaddress
from datetime import timedelta

# ========================= Vistas de Autenticación =========================

@extend_schema(
    tags=["Autenticación"],
    request=LoginRequestSerializer,
    responses={200: LoginResponseSerializer, 400: "Bad Request", 429: "Too Many Requests"},
    examples=[
        OpenApiExample(
            "Ejemplo de login exitoso",
            value={
                "username": "admin",
                "password": "SecurePass123!",
                "remember_device": True
            }
        )
    ],
    description="Obtiene tokens de acceso y refresco para el usuario especificado."
)
@method_decorator(ratelimit(key='ip', rate='5/m', method='POST'), name='post')
class LoginView(ObtainAuthToken):
    """
    Vista de login mejorada con rate limiting, logging de seguridad y tokens de refresco
    """
    
    def post(self, request, *args, **kwargs):
        """
        Maneja la solicitud POST para iniciar sesión
        """
        # Obtener IP del cliente
        client_ip = self._get_client_ip(request)
        username = request.data.get('username', '')
        
        # No logging por seguridad
        
        try:
            # Serializa y valida los datos de entrada
            serializer = self.serializer_class(data=request.data, context={'request': request})
            
            # Validar datos sin lanzar excepción
            if not serializer.is_valid():
                            # No logging por seguridad
                return Response({
                    'error': 'Datos de entrada inválidos',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Autenticar usuario
            user = serializer.validated_data['user']

            # Obtener o crear el perfil del usuario
            profile, created = UserProfile.objects.get_or_create(user=user)
            
            # Verificar si la cuenta está bloqueada
            if profile.is_locked():
                return Response({
                    'error': 'Cuenta bloqueada',
                    'message': f'Tu cuenta está bloqueada hasta {profile.locked_until.strftime("%H:%M")}',
                    'locked_until': profile.locked_until
                }, status=status.HTTP_423_LOCKED)
            
            # Verificar si requiere cambio de contraseña
            if profile.require_password_change:
                return Response({
                    'error': 'Cambio de contraseña requerido',
                    'message': 'Debes cambiar tu contraseña antes de continuar',
                    'require_password_change': True
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Crear tokens
            access_token, refresh_token = self._create_tokens(user, request)
            
            # Resetear intentos fallidos
            profile.reset_failed_attempts()
            
            # Actualizar información de login
            profile.last_login_ip = client_ip
            profile.last_activity = timezone.now()
            profile.save(update_fields=['last_login_ip', 'last_activity'])
            
            # No logging por seguridad
            
            # Preparar respuesta
            response_data = {
                'access_token': access_token.key,
                'refresh_token': refresh_token.token,
                'user_id': user.pk,
                'username': user.username,
                'email': user.email,
                'is_superuser': user.is_superuser,
                'expires_in': int((access_token.expires_at - timezone.now()).total_seconds()),
                'profile': self._get_user_profile(user),
                'settings': {
                    'require_password_change': profile.require_password_change,
                    'last_password_change': profile.password_changed_at,
                    'created_at': profile.created_at,
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except ValidationError as e:
            # No logging por seguridad
            return Response({'error': 'Error de validación', 'details': e.detail}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        except AuthenticationFailed as e:
            # No logging por seguridad
            return Response({
                'error': 'Credenciales inválidas',
                'message': 'Usuario o contraseña incorrectos'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        except Exception as e:
            # No logging por seguridad
            return Response({'error': 'Error interno del servidor'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _create_tokens(self, user, request):
        """
        Crea tokens de acceso y refresco para el usuario
        """
        # Obtener información del dispositivo
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        client_ip = self._get_client_ip(request)
        device_name = self._detect_device_name(user_agent)
        
        # Crear token de acceso (30 días)
        access_token = AuthToken.create_token(
            user=user,
            name=device_name,
            user_agent=user_agent,
            ip_address=client_ip,
            days_valid=30
        )
        
        # Crear token de refresco (90 días)
        refresh_token = RefreshToken.create_refresh_token(user, days_valid=90)
        
        return access_token, refresh_token
    
    def _get_client_ip(self, request):
        """
        Obtiene la IP real del cliente
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def _detect_device_name(self, user_agent):
        """
        Detecta el tipo de dispositivo basado en el User Agent
        """
        user_agent_lower = user_agent.lower()
        
        if 'mobile' in user_agent_lower or 'android' in user_agent_lower or 'iphone' in user_agent_lower:
            return 'Dispositivo móvil'
        elif 'tablet' in user_agent_lower or 'ipad' in user_agent_lower:
            return 'Tablet'
        elif 'windows' in user_agent_lower:
            return 'PC Windows'
        elif 'mac' in user_agent_lower:
            return 'Mac'
        elif 'linux' in user_agent_lower:
            return 'Linux'
        else:
            return 'Navegador web'
    
    def _get_user_profile(self, user):
        """
        Obtiene información del perfil del usuario
        """
        try:
            profile = user.profile
            return {
                'avatar': profile.avatar.url if profile.avatar else None,
                'bio': profile.bio,
                'two_factor_enabled': profile.two_factor_enabled,
                'theme_preference': profile.theme_preference,
                'language': profile.language,
            }
        except UserProfile.DoesNotExist:
            return None
    



@extend_schema(
    tags=["Autenticación"],
    responses={200: LogoutResponseSerializer},
    examples=[
        OpenApiExample(
            "Ejemplo de logout exitoso",
            value={"detail": "Logout exitoso", "logout_time": "2024-01-01T12:00:00Z"}
        )
    ],
    description="Invalida el token del usuario autenticado y cierra la sesión."
)
class LogoutView(APIView):
    """
    Vista de logout mejorada con logging y limpieza de tokens
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Maneja la solicitud POST para cerrar sesión
        """
        try:
            user = request.user
            client_ip = self._get_client_ip(request)
            
            # No logging por seguridad
            
            # Invalidar token actual
            if hasattr(request, 'auth') and request.auth:
                token = request.auth
                token.is_active = False
                token.save(update_fields=['is_active'])
                
                # También invalidar token de refresco asociado
                RefreshToken.objects.filter(
                    user=user,
                    created__gte=token.created
                ).update(is_active=False)
            
            # Logout exitoso
            return Response({
                "detail": "Logout exitoso",
                "logout_time": timezone.now()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            # No logging por seguridad
            return Response({
                "error": "Error durante el logout"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_client_ip(self, request):
        """
        Obtiene la IP real del cliente
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


@extend_schema(
    tags=["Autenticación"],
    request=RefreshTokenRequestSerializer,
    responses={200: RefreshTokenResponseSerializer},
    description="Renueva el token de acceso usando un token de refresco válido."
)
@method_decorator(ratelimit(key='ip', rate='10/m', method='POST'), name='post')
class RefreshTokenView(APIView):
    """
    Vista para renovar tokens de acceso usando tokens de refresco
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Renueva el token de acceso
        """
        try:
            serializer = RefreshTokenRequestSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            refresh_token_value = serializer.validated_data['refresh_token']
            
            # Obtener el token de refresco
            refresh_token = RefreshToken.objects.get(
                token=refresh_token_value,
                is_active=True
            )
            
            user = refresh_token.user
            
            # Verificar que el usuario esté activo
            if not user.is_active:
                return Response({
                    'error': 'Usuario inactivo'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Crear nuevo token de acceso
            new_access_token = AuthToken.create_token(
                user=user,
                name='Renovado',
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                ip_address=self._get_client_ip(request),
                days_valid=30
            )
            
            # No logging por seguridad
            
            return Response({
                'access_token': new_access_token.key,
                'refresh_token': refresh_token_value,  # Mantener el mismo refresh token
                'expires_in': int((new_access_token.expires_at - timezone.now()).total_seconds()),
                'token_type': 'Bearer'
            }, status=status.HTTP_200_OK)
            
        except RefreshToken.DoesNotExist:
            return Response({
                'error': 'Token de refresco inválido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            # No logging por seguridad
            return Response({
                'error': 'Error interno del servidor'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_client_ip(self, request):
        """
        Obtiene la IP real del cliente
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


@extend_schema(
    tags=["Autenticación"],
    request=ChangePasswordSerializer,
    responses={200: "Contraseña cambiada exitosamente"},
    description="Permite al usuario cambiar su contraseña."
)
class ChangePasswordView(APIView):
    """
    Vista para cambiar contraseña
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Cambia la contraseña del usuario
        """
        try:
            serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            
            user = request.user
            new_password = serializer.validated_data['new_password']
            
            # Cambiar contraseña
            user.set_password(new_password)
            user.password_changed_at = timezone.now()
            user.require_password_change = False
            user.save(update_fields=['password', 'password_changed_at', 'require_password_change'])
            
            # Invalidar todos los tokens existentes
            AuthToken.objects.filter(user=user).update(is_active=False)
            RefreshToken.objects.filter(user=user).update(is_active=False)
            
            # No logging por seguridad
            
            return Response({
                'message': 'Contraseña cambiada exitosamente',
                'password_changed_at': user.password_changed_at
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            # No logging por seguridad
            return Response({
                'error': 'Error al cambiar la contraseña'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    tags=["Autenticación"],
    responses={200: UserProfileSerializer},
    description="Obtiene y actualiza el perfil del usuario autenticado."
)
class UserProfileView(APIView):
    """
    Vista para gestionar el perfil del usuario
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Obtiene el perfil del usuario
        """
        try:
            profile = request.user.profile
            serializer = UserProfileSerializer(profile)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except UserProfile.DoesNotExist:
            return Response({
                'error': 'Perfil no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)

    def put(self, request):
        """
        Actualiza el perfil del usuario
        """
        try:
            profile = request.user.profile
            serializer = UserProfileSerializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            
            return Response(serializer.data, status=status.HTTP_200_OK)
        except UserProfile.DoesNotExist:
            return Response({
                'error': 'Perfil no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)


@extend_schema(
    tags=["Autenticación"],
    responses={200: SessionInfoSerializer},
    description="Obtiene información sobre la sesión actual y dispositivos activos."
)
class SessionInfoView(APIView):
    """
    Vista para obtener información de la sesión
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Obtiene información de la sesión actual
        """
        try:
            serializer = SessionInfoSerializer(request.user, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            # No logging por seguridad
            return Response({
                'error': 'Error al obtener información de la sesión'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    tags=["Autenticación"],
    request=UserRegistrationSerializer,
    responses={201: "Usuario registrado exitosamente"},
    description="Registra un nuevo usuario en el sistema."
)
@method_decorator(ratelimit(key='ip', rate='3/h', method='POST'), name='post')
class UserRegistrationView(APIView):
    """
    Vista para registro de usuarios
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Registra un nuevo usuario
        """
        try:
            serializer = UserRegistrationSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            with transaction.atomic():
                user = serializer.save()
                
                            # No logging por seguridad
                
                return Response({
                    'message': 'Usuario registrado exitosamente',
                    'user_id': user.pk,
                    'username': user.username,
                    'email': user.email
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            # No logging por seguridad
            return Response({
                'error': 'Error al registrar el usuario'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    tags=["Autenticación"],
    responses={200: "Sesión cerrada en todos los dispositivos"},
    description="Cierra la sesión del usuario en todos los dispositivos."
)
class LogoutAllDevicesView(APIView):
    """
    Vista para cerrar sesión en todos los dispositivos
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Cierra sesión en todos los dispositivos
        """
        try:
            user = request.user
            
            # Invalidar todos los tokens del usuario
            AuthToken.objects.filter(user=user).update(is_active=False)
            RefreshToken.objects.filter(user=user).update(is_active=False)
            
            # Log del logout masivo
            # No logging por seguridad
            
            return Response({
                'message': 'Sesión cerrada en todos los dispositivos',
                'logout_time': timezone.now()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            # No logging por seguridad
            return Response({
                'error': 'Error al cerrar sesión en todos los dispositivos'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)