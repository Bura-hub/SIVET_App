from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.utils import timezone
from .models import AuthToken
from django.contrib.auth.models import User


class CustomTokenAuthentication(TokenAuthentication):
    """
    Clase de autenticación personalizada que utiliza el modelo AuthToken
    con validación de expiración y metadatos del dispositivo
    """
    model = AuthToken
    
    def authenticate_credentials(self, key):
        """
        Autentica las credenciales del token
        """
        try:
            # Buscar el token en la base de datos
            token = self.model.objects.select_related('user').get(
                key=key,
                is_active=True
            )
            
            # Verificar si el token ha expirado
            if token.is_expired():
                # Marcar el token como inactivo
                token.is_active = False
                token.save(update_fields=['is_active'])
                raise AuthenticationFailed('Token expirado')
            
            # Verificar que el usuario esté activo
            if not token.user.is_active:
                raise AuthenticationFailed('Usuario inactivo')
            
            # Verificar si la cuenta está bloqueada
            try:
                from .models import UserProfile
                profile, created = UserProfile.objects.get_or_create(user=token.user)
                if profile.is_locked():
                    raise AuthenticationFailed('Cuenta bloqueada temporalmente')
            except Exception as e:
                # Si no se puede verificar el bloqueo, continuar
                pass
            
            # Actualizar timestamp de último uso
            token.last_used = timezone.now()
            token.save(update_fields=['last_used'])
            
            # Actualizar actividad del usuario
            try:
                profile.last_activity = timezone.now()
                profile.save(update_fields=['last_activity'])
            except Exception as e:
                # Si no se puede actualizar la actividad, continuar
                pass
            
            return (token.user, token)
            
        except self.model.DoesNotExist:
            raise AuthenticationFailed('Token inválido')
        except Exception as e:
            raise AuthenticationFailed(f'Error de autenticación: {str(e)}')
    
    def authenticate_header(self, request):
        """
        Retorna el header de autenticación para el esquema OpenAPI
        """
        return 'Token realm="api"'
