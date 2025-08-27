# Importa la función `path` para definir rutas en Django
from django.urls import path

# Importa las vistas de autenticación desde el módulo local `views`
from .views import (
    LoginView, 
    LogoutView, 
    RefreshTokenView,
    ChangePasswordView,
    UserProfileView,
    SessionInfoView,
    UserRegistrationView,
    LogoutAllDevicesView,
    ProfileImageView
)

# ========================= Rutas de Autenticación =========================

urlpatterns = [
    # ========================= Autenticación Básica =========================
    
    # Ruta para iniciar sesión; utiliza la vista LoginView y se accede vía /login/
    path('login/', LoginView.as_view(), name='api_login'),
    
    # Ruta para cerrar sesión; utiliza la vista LogoutView y se accede vía /logout/
    path('logout/', LogoutView.as_view(), name='api_logout'),
    
    # Ruta para cerrar sesión en todos los dispositivos
    path('logout-all/', LogoutAllDevicesView.as_view(), name='api_logout_all'),
    
    # ========================= Gestión de Tokens =========================
    
    # Ruta para renovar tokens de acceso usando refresh tokens
    path('refresh/', RefreshTokenView.as_view(), name='api_refresh_token'),
    
    # ========================= Gestión de Usuario =========================
    
    # Ruta para registro de nuevos usuarios
    path('register/', UserRegistrationView.as_view(), name='api_register'),
    
    # Ruta para cambiar contraseña
    path('change-password/', ChangePasswordView.as_view(), name='api_change_password'),
    
    # Ruta para gestionar perfil de usuario
    path('profile/', UserProfileView.as_view(), name='api_user_profile'),
    
    # Ruta para gestionar imagen de perfil
    path('profile-image/', ProfileImageView.as_view(), name='api_profile_image'),
    
    # Ruta para obtener información de la sesión actual
    path('session/', SessionInfoView.as_view(), name='api_session_info'),
    
    # Ruta para gestionar sesiones activas
    path('sessions/', SessionInfoView.as_view(), name='api_sessions'),
    
    # ========================= Endpoints de Seguridad =========================
    
    # Ruta para verificar estado de la cuenta
    path('account-status/', UserProfileView.as_view(), name='api_account_status'),
]