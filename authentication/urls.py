# Importa la función `path` para definir rutas en Django
from django.urls import path

# Importa las vistas de login y logout desde el módulo local `views`
from .views import LoginView, LogoutView

# ========================= Rutas de Autenticación =========================

urlpatterns = [
    # Ruta para iniciar sesión; utiliza la vista LoginView y se accede vía /login/
    path('login/', LoginView.as_view(), name='api_login'),

    # Ruta para cerrar sesión; utiliza la vista LogoutView y se accede vía /logout/
    path('logout/', LogoutView.as_view(), name='api_logout'),
]