# SIVET: Sistema de Visualización Energética Transaccional

## 📋 Descripción General del Proyecto

**SIVET** es una aplicación web integral diseñada para la visualización de datos históricos e indicadores clave relacionados con el consumo y la generación de energía eléctrica, así como variables climáticas relevantes. Construida con una arquitectura desacoplada utilizando **Django (Python)** para el backend y **React (JavaScript)** para el frontend, la plataforma se integra de forma segura con una API SCADA externa para la ingesta y el procesamiento de datos.

El objetivo principal es transformar datos complejos en información accionable, proporcionando a analistas y ejecutivos una visión clara y dinámica del comportamiento de los sistemas energéticos y climáticos.

**Estado del Proyecto: 95% de avance** - Fase de maduración y refinamiento completada.

## 🚀 Características Principales

### 🔐 Autenticación y Seguridad
- **Sistema de Autenticación Robusto**: Login seguro con gestión de usuarios y roles (Administrador, Usuario Aliado)
- **Gestión de Perfiles Avanzada**: Configuración de información personal, avatares y preferencias
- **Gestión de Sesiones**: Control de dispositivos conectados con capacidad de cerrar sesiones individuales o masivas
- **Seguridad Mejorada**: Rate limiting, bloqueo temporal por intentos fallidos y validaciones de contraseñas
- **Tokens de Acceso**: Sistema de autenticación basado en tokens con expiración automática

### 📊 Dashboard y Visualizaciones
- **Dashboard Interactivo**: Panel de control principal con resumen de indicadores clave de rendimiento (KPIs)
- **Visualizaciones Dinámicas**: Gráficos interactivos (líneas y barras) impulsados por Chart.js
- **KPIs en Tiempo Real**: Métricas actualizadas automáticamente para consumo, generación y balance energético
- **Persistencia de Estado**: Recuerda el estado de la barra lateral y pestañas activas entre sesiones

### 🔌 Módulos Especializados
- **Detalles Eléctricos**: Información detallada sobre el consumo eléctrico con filtros avanzados
- **Detalles de Inversores**: Métricas y tendencias de la generación de energía solar
- **Detalles del Clima**: Datos meteorológicos relevantes para el análisis energético
- **Datos Externos de Energía**: Análisis de precios, ahorros y mercado energético
- **Exportación de Reportes**: Generación y descarga de reportes en formato CSV

### ⚡ Integración SCADA y Procesamiento
- **Integración con API SCADA**: Conexión segura a través de proxy Django para datos en tiempo real
- **Cálculo Automático de KPIs**: Tareas asíncronas con Celery que calculan indicadores mensuales
- **Sincronización de Metadatos**: Actualización automática de dispositivos, categorías e instituciones
- **Procesamiento de Datos Históricos**: Almacenamiento y análisis de mediciones históricas

### 🎨 Experiencia de Usuario
- **Interfaz Responsiva**: Optimizada para diferentes tamaños de pantalla y dispositivos
- **Animaciones Fluidas**: Transiciones suaves y feedback visual contextual
- **Sistema de Notificaciones**: Mensajes de estado con iconografía y colores apropiados
- **Tema Personalizable**: Soporte para temas claro/oscuro y preferencias de idioma
- **Sistema de Ayuda**: Guía de usuario interactiva y soporte técnico integrado

## 🏗️ Arquitectura del Proyecto

La aplicación sigue una arquitectura desacoplada para garantizar escalabilidad, mantenibilidad y seguridad.

### Backend (Django 5.2.4)

#### Framework y Tecnologías
- **Django 5.2.4**: Framework web principal
- **Django REST Framework**: Construcción de APIs RESTful
- **PostgreSQL**: Base de datos principal (configurable)
- **Redis**: Broker para Celery y caché
- **Celery**: Procesamiento asíncrono de tareas
- **Celery Beat**: Programación de tareas periódicas

#### Aplicaciones Django
- **`core`**: Configuración principal del proyecto
- **`authentication`**: Sistema de autenticación y gestión de usuarios
- **`indicators`**: Cálculo y gestión de KPIs energéticos
- **`scada_proxy`**: Integración con sistemas SCADA externos
- **`external_energy`**: Análisis de datos energéticos externos

#### Características Técnicas
- **Autenticación por Tokens**: Sistema personalizado con expiración y metadatos
- **Validaciones Avanzadas**: Verificación robusta de datos de entrada
- **Rate Limiting**: Protección contra abuso del sistema
- **Logging Seguro**: Registro de eventos sin comprometer información sensible
- **Documentación API**: Generación automática con drf-spectacular

### Frontend (React 19.1.0)

#### Framework y Librerías
- **React 19.1.0**: Biblioteca de interfaz de usuario
- **Chart.js 4.5.0**: Visualización de datos y gráficos
- **Tailwind CSS 3.4.17**: Framework de CSS utilitario
- **React Router**: Navegación entre componentes

#### Componentes Principales
- **`Dashboard`**: Panel principal con KPIs y resumen
- **`ElectricalDetails`**: Detalles de medidores eléctricos
- **`InverterDetails`**: Información de inversores solares
- **`WeatherStationDetails`**: Datos meteorológicos
- **`ExternalEnergyData`**: Análisis de energía externa
- **`ExportReports`**: Generación de reportes
- **`ProfileSettings`**: Gestión de perfil de usuario
- **`HelpSupport`**: Sistema de ayuda y soporte

#### Características de UX
- **Estado Persistente**: Recuerda preferencias del usuario
- **Animaciones de Carga**: Indicadores de progreso personalizados
- **Transiciones Suaves**: Componente `TransitionOverlay` para navegación
- **Responsividad**: Adaptable a diferentes dispositivos
- **Tema Personalizable**: Soporte para preferencias visuales

## 📈 Indicadores Clave de Rendimiento (KPIs)

La aplicación calcula y muestra los siguientes KPIs, proporcionando una visión integral del rendimiento energético y ambiental:

### 🔋 Consumo y Generación
- **Consumo Total**: Consumo acumulado de energía eléctrica (kWh) del mes actual y anterior
- **Generación Total**: Generación acumulada de energía (kWh) por inversores del mes actual y anterior
- **Equilibrio Energético**: Diferencia neta entre generación y consumo, indicando superávit o déficit
- **Potencia Instantánea Promedio**: Promedio de potencia activa (Watts) de inversores

### 🌡️ Variables Climáticas
- **Temperatura Promedio Diaria**: Temperatura promedio (°C) del mes actual y anterior
- **Humedad Relativa**: Humedad relativa promedio (%RH) con categorización de estado
- **Velocidad del Viento**: Velocidad promedio del viento (km/h) con categorización
- **Irradiancia Solar**: Radiación solar promedio (W/m²) para análisis fotovoltaico

### 📊 Métricas Operativas
- **Inversores Activos**: Conteo en tiempo real de inversores operativos
- **Eficiencia del Sistema**: Relación entre generación y capacidad instalada
- **Factor de Capacidad**: Utilización efectiva de la capacidad de generación
- **Autoconsumo**: Porcentaje de energía generada consumida localmente

## 🛠️ Requisitos del Sistema

### Software Requerido
- **Python 3.9+** (recomendado 3.11+)
- **Node.js 18+** (LTS recomendado) y npm/yarn
- **PostgreSQL 12+** (o SQLite para desarrollo)
- **Redis 6+** (para Celery y caché)
- **Git** para control de versiones

### APIs Externas (Opcionales)
- **OpenWeatherMap**: Datos climáticos y solares (gratuito, 60 llamadas/minuto)
- **Electricity Maps**: Información de precios de energía (acceso limitado gratuito)
- **API SCADA**: Sistema de monitoreo y control de datos (requerido para funcionalidad completa)

### Hardware Recomendado
- **RAM**: 4GB mínimo, 8GB recomendado
- **Almacenamiento**: 10GB mínimo para desarrollo, 50GB+ para producción
- **CPU**: Procesador de 2+ núcleos para desarrollo, 4+ núcleos para producción

## ⚙️ Configuración e Instalación

### 1. Clonar el Repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd MteLumen_App
```

### 2. Configuración del Backend (Django)

#### Crear y Activar Entorno Virtual

```bash
# Crear entorno virtual
python -m venv env_lumen

# Activar en Windows
.\env_lumen\Scripts\activate

# Activar en macOS/Linux
source env_lumen/bin/activate
```

#### Instalar Dependencias

```bash
pip install -r requirements.txt
```

#### Configurar Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```bash
# Configuración Django
SECRET_KEY='tu_clave_secreta_django_aqui'
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Base de Datos PostgreSQL
name_db=nombre_de_tu_base_de_datos
user_postgres=usuario_postgres
password_user_postgres=contraseña_postgres
port_postgres=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Credenciales SCADA
SCADA_USERNAME=tu_usuario_scada
SCADA_PASSWORD=tu_password_scada

# APIs Externas (Opcionales)
OPENWEATHER_API_KEY=tu_api_key_openweather
ELECTRICITY_MAPS_API_KEY=tu_api_key_electricity_maps
```

#### Configurar Base de Datos

```bash
# Aplicar migraciones
python manage.py makemigrations
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Crear usuario de prueba
python manage.py shell
from django.contrib.auth.models import User
User.objects.create_user(username='testuser', password='testpassword')
exit()
```

### 3. Configuración del Frontend (React)

```bash
cd frontend
npm install
```

### 4. Iniciar Servicios

#### Iniciar Redis
```bash
# En Windows (con WSL o Docker)
redis-server

# En macOS
brew services start redis

# En Linux
sudo systemctl start redis
```

#### Iniciar Celery Worker
```bash
# Terminal 1 - Worker
celery -A core worker -l info
```

#### Iniciar Celery Beat (Scheduler)
```bash
# Terminal 2 - Scheduler
celery -A core beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

#### Iniciar Servidor Django
```bash
# Terminal 3 - Backend
python manage.py runserver
```

#### Iniciar Servidor React
```bash
# Terminal 4 - Frontend
cd frontend
npm start
```

La aplicación estará disponible en:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **Admin Django**: http://localhost:8000/admin
- **API Docs**: http://localhost:8000/docs

## 📚 Uso de la Aplicación

### 1. Inicio de Sesión
- Accede a la aplicación a través de la página de inicio de sesión
- Utiliza las credenciales del superusuario o usuario de prueba creado
- El sistema recordará tu sesión y preferencias

### 2. Navegación Principal
- **Dashboard**: Vista general con KPIs principales y resumen del sistema
- **Detalles Eléctricos**: Análisis detallado de consumo energético
- **Detalles de Inversores**: Monitoreo de generación solar
- **Detalles del Clima**: Información meteorológica y ambiental
- **Datos Externos**: Análisis de precios y mercado energético
- **Exportar Reportes**: Generación de reportes personalizados

### 3. Funcionalidades Avanzadas
- **Filtros Avanzados**: Por dispositivo, institución, fecha y categoría
- **Exportación de Datos**: Reportes en CSV con filtros personalizables
- **Gestión de Perfil**: Configuración de preferencias y avatar
- **Sistema de Ayuda**: Guía contextual y soporte técnico

## 🗂️ Estructura del Proyecto

```
MteLumen_App/
├── core/                           # Configuración principal Django
│   ├── settings.py                 # Configuración del proyecto
│   ├── urls.py                     # URLs principales
│   ├── celery.py                   # Configuración de Celery
│   └── wsgi.py                     # Configuración WSGI
├── authentication/                  # Sistema de autenticación
│   ├── models.py                   # Modelos de usuario y tokens
│   ├── views.py                    # Vistas de autenticación
│   ├── serializers.py              # Serializadores de la API
│   └── urls.py                     # URLs de autenticación
├── indicators/                      # Cálculo y gestión de KPIs
│   ├── models.py                   # Modelos de KPIs y datos
│   ├── tasks.py                    # Tareas Celery para cálculos
│   ├── views.py                    # Vistas de la API
│   └── urls.py                     # URLs de indicadores
├── scada_proxy/                     # Integración con SCADA
│   ├── models.py                   # Modelos de dispositivos y mediciones
│   ├── scada_client.py             # Cliente para API SCADA
│   ├── tasks.py                    # Tareas de sincronización
│   ├── urls_scada.py               # URLs para API SCADA
│   └── urls_local.py               # URLs para operaciones locales
├── external_energy/                 # Datos externos de energía
│   ├── models.py                   # Modelos de precios y ahorros
│   ├── services.py                 # Servicios de APIs externas
│   ├── views.py                    # Vistas de datos externos
│   └── README.md                   # Documentación específica
├── frontend/                        # Aplicación React
│   ├── public/                     # Archivos públicos
│   ├── src/                        # Código fuente
│   │   ├── components/             # Componentes React
│   │   │   ├── KPI/                # Componentes de KPIs y gráficos
│   │   │   ├── Dashboard.js        # Panel principal
│   │   │   ├── ElectricalDetails.js # Detalles eléctricos
│   │   │   ├── InverterDetails.js  # Detalles de inversores
│   │   │   ├── WeatherStationDetails.js # Estaciones meteorológicas
│   │   │   ├── ExternalEnergyData.js # Datos externos
│   │   │   ├── ExportReports.js    # Generación de reportes
│   │   │   ├── ProfileSettings.js  # Configuración de perfil
│   │   │   ├── HelpSupport.js      # Sistema de ayuda
│   │   │   └── Sidebar.js          # Barra lateral
│   │   ├── utils/                  # Utilidades y configuración
│   │   ├── App.js                  # Componente principal
│   │   └── index.js                # Punto de entrada
│   ├── tailwind.config.js          # Configuración de Tailwind CSS
│   └── package.json                # Dependencias de Node.js
├── manage.py                        # Utilidad de línea de comandos Django
├── requirements.txt                 # Dependencias de Python
├── celery.log                       # Logs de Celery
└── README.md                        # Este archivo
```

## 🔄 Tareas Programadas (Celery Beat)

El sistema ejecuta automáticamente las siguientes tareas:

### Sincronización de Datos
- **Metadatos SCADA**: Sincronización diaria a las 2:00 AM
- **Verificación de Dispositivos**: Cada hora para monitorear estado
- **Reparación de Relaciones**: Automática después de verificación de dispositivos

### Cálculo de KPIs
- **KPIs Mensuales**: Cálculo diario a las 3:30 AM
- **Datos Diarios**: Procesamiento a las 3:45 AM para gráficos
- **Mediciones Históricas**: Obtención cada hora de datos de las últimas 2 horas

### Datos Externos
- **Sincronización Climática**: Actualización cada 6 horas
- **Análisis de Mercado**: Procesamiento diario de precios y tendencias

## 🌐 APIs y Endpoints

### Autenticación
- `POST /auth/login/` - Inicio de sesión
- `POST /auth/logout/` - Cierre de sesión
- `POST /auth/refresh/` - Renovación de token
- `GET /auth/profile/` - Perfil del usuario

### Indicadores
- `GET /api/dashboard/summary/` - Resumen de KPIs
- `GET /api/dashboard/chart-data/` - Datos para gráficos
- `GET /api/electric-meters/` - Medidores eléctricos
- `GET /api/inverters/` - Inversores solares
- `GET /api/weather-stations/` - Estaciones meteorológicas

### SCADA
- `GET /scada/devices/` - Lista de dispositivos
- `GET /scada/measurements/` - Mediciones históricas
- `POST /tasks/fetch-historical/` - Obtención de datos históricos

### Datos Externos
- `GET /api/external-energy/prices/` - Precios de energía
- `GET /api/external-energy/savings/` - Cálculo de ahorros
- `GET /api/external-energy/market-overview/` - Vista del mercado

### Reportes
- `POST /api/reports/generate/` - Generación de reportes
- `GET /api/reports/status/` - Estado de generación
- `GET /api/reports/download/` - Descarga de reportes

## 🔧 Comandos de Gestión Útiles

### Desarrollo y Pruebas
```bash
# Poblar datos simulados
python manage.py populate_external_energy_data --days 90

# Verificar estado de dispositivos
python manage.py check_devices_status

# Sincronizar metadatos SCADA
python manage.py sync_scada_metadata

# Calcular KPIs manualmente
python manage.py calculate_monthly_kpis
```

### Mantenimiento
```bash
# Limpiar logs antiguos
python manage.py cleanup_logs

# Verificar integridad de datos
python manage.py validate_data_integrity

# Respaldar base de datos
python manage.py dumpdata > backup.json
```

### Monitoreo
```bash
# Ver estado de tareas Celery
celery -A core inspect active

# Ver tareas programadas
celery -A core inspect scheduled

# Ver logs en tiempo real
tail -f celery.log
```

## 🚨 Solución de Problemas Comunes

### Error de Conexión a Base de Datos
```bash
# Verificar que PostgreSQL esté ejecutándose
sudo systemctl status postgresql

# Verificar credenciales en .env
# Probar conexión manual
psql -h localhost -U usuario -d base_de_datos
```

### Celery No Ejecuta Tareas
```bash
# Verificar que Redis esté ejecutándose
redis-cli ping

# Reiniciar worker de Celery
celery -A core worker -l info --purge

# Verificar logs
tail -f celery.log
```

### Frontend No Se Conecta al Backend
```bash
# Verificar que Django esté ejecutándose en puerto 8000
# Verificar configuración de proxy en package.json
# Verificar CORS en settings.py
```

### Errores de Autenticación
```bash
# Limpiar tokens del localStorage
# Verificar que el token no haya expirado
# Regenerar token desde el admin de Django
```

## 📊 Estado de Desarrollo y Próximos Pasos

### ✅ Funcionalidades Completadas (95%)
- Sistema de autenticación y gestión de usuarios
- Dashboard principal con KPIs en tiempo real
- Módulos de detalles eléctricos, inversores y clima
- Integración con API SCADA y sincronización automática
- Cálculo automático de indicadores energéticos
- Sistema de reportes y exportación de datos
- Módulo de datos externos de energía
- Sistema de ayuda y soporte técnico
- Interfaz de usuario responsiva y moderna

### 🔄 En Desarrollo (5%)
- Optimización de rendimiento con datos reales
- Pruebas de carga y estabilidad
- Refinamiento de algoritmos de cálculo
- Documentación técnica completa

### 🎯 Próximos Pasos
- **Integración con Datos Reales**: Conexión a fuentes SCADA reales
- **Módulo de Pronósticos**: Implementación de modelos predictivos
- **Alertas Inteligentes**: Sistema de notificaciones automáticas
- **Móvil**: Aplicación móvil nativa o PWA
- **Analytics Avanzados**: Machine Learning para predicciones
- **Integración IoT**: Conexión directa con dispositivos inteligentes

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor, sigue estos pasos:

1. **Fork** del repositorio
2. **Crear** una rama para tu funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** tus cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. **Crear** un Pull Request

### Guías de Contribución
- Sigue las convenciones de código del proyecto
- Incluye pruebas para nuevas funcionalidades
- Actualiza la documentación según sea necesario
- Verifica que el código pase todas las pruebas

## 📞 Soporte y Contacto

### Canales de Soporte
- **Issues del Proyecto**: Reportar bugs y solicitar funcionalidades
- **Documentación**: Guías de usuario y técnica
- **Sistema de Ayuda**: Integrado en la aplicación

### Información del Proyecto
- **Código BPIN**: 2021000100499
- **Tipo**: Sistema de Visualización Energética Transaccional
- **Ubicación**: Departamento de Nariño, Colombia
- **Estado**: 95% de avance - Fase de maduración

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙏 Agradecimientos

- **Equipo de Desarrollo**: Por la implementación técnica robusta
- **Usuarios**: Por el feedback y pruebas continuas
- **Comunidad Open Source**: Por las librerías y herramientas utilizadas
- **Instituciones Colaboradoras**: Por el apoyo y recursos proporcionados

---

**Última Actualización**: Agosto 2025  
**Versión**: 2.0.0  
**Estado**: Producción - Fase de Maduración
