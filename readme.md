# SIVET: Sistema de Visualización Energética Transaccional

## Descripción General del Proyecto

\`SIVET\` es una aplicación web integral diseñada para la visualización de datos históricos e indicadores clave relacionados con el consumo y la generación de energía eléctrica, así como variables climáticas relevantes. Construida con una arquitectura desacoplada utilizando **Django (Python)** para el backend y **React (JavaScript)** para el frontend, la plataforma se integra de forma segura con una API SCADA externa para la ingesta y el procesamiento de datos.

El objetivo principal es transformar datos complejos en información accionable, proporcionando a analistas y ejecutivos una visión clara y dinámica del comportamiento de los sistemas energéticos y climáticos.

## Características Principales

* **Autenticación Segura:** Sistema de inicio de sesión robusto con gestión de usuarios y roles (Administrador, Usuario Aliado).
* **Dashboard Interactivo:** Panel de control principal que presenta un resumen de indicadores clave de rendimiento (KPIs) con visualizaciones claras y dinámicas.
* **Módulos de Detalles Específicos:**
    * **Detalles Eléctricos:** Información detallada sobre el consumo eléctrico.
    * **Detalles de Inversores:** Métricas y tendencias de la generación de energía solar.
    * **Detalles del Clima:** Datos meteorológicos relevantes para el análisis energético.
* **Visualizaciones de Datos:** Gráficos interactivos (líneas y barras) impulsados por Chart.js para mostrar tendencias históricas.
* **Cálculo y Persistencia de KPIs:** El backend calcula y almacena KPIs mensuales para consumo, generación, balance energético, potencia instantánea promedio, temperatura promedio, humedad relativa y velocidad del viento.
* **Integración con API SCADA:** Conexión segura y dinámica a una API SCADA externa a través de un proxy Django para obtener datos en tiempo real y históricos.
* **Exportación de Reportes:** Funcionalidad para generar y descargar reportes de datos en formato CSV para análisis externos.
* **Experiencia de Usuario (UI/UX) Optimizada:** Interfaz intuitiva, responsiva y visualmente coherente, con animaciones fluidas y persistencia del estado de la interfaz (ej., estado de la barra lateral, pestañas activas).
* **Fondo de Login Personalizado:** La página de inicio de sesión cuenta con una imagen de fondo (\`bg.png\`) para mejorar la estética visual.

## Arquitectura del Proyecto

La aplicación sigue una arquitectura desacoplada para garantizar escalabilidad, mantenibilidad y seguridad.

### Backend (Django)

* **Framework:** Django 5.x
* **API:** Django REST Framework (DRF) para construir los endpoints RESTful.
* **Autenticación:** Basada en tokens para una comunicación segura entre el frontend y el backend.
* **Proxy SCADA:** Una capa de proxy en Django (\`scada_proxy\`) gestiona la autenticación y el consumo de datos de la API SCADA externa, centralizando las llamadas y protegiendo las credenciales.
* **Cálculo de KPIs:** Tareas asíncronas con **Celery** que calculan y persisten los indicadores clave de rendimiento (KPIs) en la base de datos local (\`indicators\` app).
* **Base de Datos:** Utiliza la base de datos configurada en Django (por defecto SQLite para desarrollo, pero adaptable a PostgreSQL, MySQL, etc. para producción).

### Frontend (React)

* **Framework:** React 18+
* **Estilizado:** Tailwind CSS para un desarrollo rápido y responsivo de la interfaz de usuario.
* **Visualización de Datos:** Chart.js para la creación de gráficos interactivos.
* **Manejo de Estado:** \`useState\` y \`useEffect\` de React para la gestión de estado local y la interacción con la API.
* **Persistencia de UI:** Utiliza \`localStorage\` para recordar el estado de la barra lateral y las pestañas activas entre sesiones.

## Indicadores Clave de Rendimiento (KPIs) Implementados

La aplicación calcula y muestra los siguientes KPIs, proporcionando una visión integral del rendimiento energético y ambiental:

* **Consumo Total:** Consumo total acumulado de energía eléctrica (kWh) del mes actual y anterior.
* **Generación Total:** Generación total acumulada de energía (Wh) por los inversores del mes actual y anterior.
* **Equilibrio Energético:** Diferencia neta entre la Generación Total y el Consumo Total (kWh), indicando superávit o déficit.
* **Potencia Instantánea Promedio:** Promedio de la potencia activa (Watts) de los inversores del mes actual y anterior.
* **Temperatura Promedio Diaria:** Temperatura promedio (°C) del mes actual y anterior, basada en datos de estaciones meteorológicas.
* **Humedad Relativa:** Humedad relativa promedio (%RH) del mes actual y anterior, con categorización de estado (Óptimo, Alta, Baja).
* **Velocidad del Viento:** Velocidad promedio del viento (km/h) del mes actual y anterior, con categorización de estado (Bajo, Moderado, Alto).
* **Inversores Activos:** Conteo en tiempo real de inversores operativos.

## Requisitos del Sistema

Para ejecutar este proyecto, necesitarás:

* Python 3.9+
* Node.js (LTS recomendado) y npm/yarn
* pip (gestor de paquetes de Python)
* Una instancia de Redis (para Celery y Celery Beat)
* Acceso a una API SCADA (o simulación de la misma si es para desarrollo local sin datos reales).

## Configuración e Instalación

Sigue estos pasos para configurar y ejecutar el proyecto en tu entorno local.

### 1. Clonar el Repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd MteLumen_App # Asegúrate de estar en el directorio raíz del proyecto
```

### 2. Configuración del Backend (Django)

```bash
# Crear y activar un entorno virtual
python -m venv env_lumen
.\env_lumen\Scripts\activate # En Windows
# source env_lumen/bin/activate # En macOS/Linux

# Instalar dependencias de Python
pip install -r requirements.txt # Asegúrate de tener un requirements.txt con todas las dependencias
# (django, djangorestframework, celery, redis, requests, etc.)

# Configurar variables de entorno
# Crea un archivo .env en la raíz de tu proyecto (junto a manage.py)
# y añade tus credenciales y configuraciones de SCADA y Redis:
# SECRET_KEY='tu_clave_secreta_django'
# DEBUG=True
# ALLOWED_HOSTS='localhost,127.0.0.1'
# SCADA_API_BASE_URL='http://localhost:3000/api/v1' # O la URL de tu API SCADA
# SCADA_API_USERNAME='tu_usuario_scada'
# SCADA_API_PASSWORD='tu_password_scada'
# REDIS_HOST='localhost'
# REDIS_PORT=6379
# REDIS_DB=0

# Aplicar migraciones de la base de datos
python manage.py makemigrations
python manage.py migrate
python manage.py makemigrations indicators # Asegúrate de que las migraciones para indicators se generen
python manage.py migrate indicators

# Crear un superusuario (opcional, para acceder al admin de Django)
python manage.py createsuperuser

# Crear un usuario de prueba para el script de verificación
python manage.py shell
from django.contrib.auth.models import User
User.objects.create_user(username='testuser', password='testpassword')
exit()
```

### 3. Configuración del Frontend (React)

```bash
cd frontend # Navega al directorio del frontend
npm install # O yarn install
```

### 4. Iniciar Servicios

Asegúrate de que tu instancia de Redis esté ejecutándose.

#### a. Iniciar Celery Worker

Abre una nueva terminal y ejecuta:

```bash
# Asegúrate de que tu entorno virtual esté activado
celery -A MteLumen_App worker -l info # Reemplaza MteLumen_App con el nombre de tu proyecto
```

#### b. Iniciar Celery Beat (Scheduler)

Abre otra nueva terminal y ejecuta:

```bash
# Asegúrate de que tu entorno virtual esté activado
celery -A MteLumen_App beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

#### c. Iniciar el Servidor de Desarrollo Django

Abre otra terminal y ejecuta:

```bash
# Asegúrate de que tu entorno virtual esté activado
python manage.py runserver
```

#### d. Iniciar el Servidor de Desarrollo React

Abre una última terminal y ejecuta:

```bash
cd frontend
npm start # O yarn start
```

La aplicación frontend se abrirá automáticamente en tu navegador (normalmente en \`http://localhost:3000\`).

## Uso de la Aplicación

1.  **Inicio de Sesión:** Accede a la aplicación a través de la página de inicio de sesión. Utiliza las credenciales del superusuario o del usuario de prueba que creaste.
2.  **Navegación:** Explora los diferentes módulos (Dashboard, Detalles Eléctricos, Detalles de Inversores, Detalles del Clima) usando la barra lateral.
3.  **Visualización de KPIs y Gráficos:** Observa los indicadores clave y las tendencias de datos en los gráficos interactivos.
4.  **Exportación de Reportes:** Utiliza el módulo "Exportar Reportes" para descargar datos filtrados.

## Estructura del Proyecto

```
MteLumen_App/
├── core/           # Directorio principal del proyecto Django
│   ├── settings.py         # Configuración de Django
│   ├── urls.py             # URLs principales del proyecto
│   ├── celery.py
│   └── wsgi.py
├── authentication/         # Aplicación Django para autenticación
│   ├── views.py
│   ├── serializers.py
│   ├── urls.py
│   └── ...
├── indicators/             # Aplicación Django para cálculo y gestión de KPIs
│   ├── models.py           # Modelos para KPIs (MonthlyConsumptionKPI)
│   ├── tasks.py            # Tareas Celery para el cálculo de KPIs
│   ├── views.py            # Vista de la API para los KPIs
│   └── urls.py
├── scada_proxy/            # Aplicación Django para el proxy de la API SCADA
│   ├── models.py           # Modelos para Device, Measurement, DeviceCategory
│   ├── scada_client.py     # Lógica para interactuar con la API SCADA externa
│   ├── serializers.py
│   ├── tasks.py
│   ├── urls_local.py
│   ├── urls_scada.py
│   ├── urls_task.py
│   └── views.py
├── frontend/               # Directorio del proyecto React
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── App.js          # Componente principal de React
│   │   ├── index.css       # Estilos globales (incluye clases para login-card, input-field, etc.)
│   │   ├── index.js
│   │   ├── components/
│   │   │   ├── bg.png         # Imagen de fondo para el login
│   │   │   ├── LoginPage.js   # Componente de la página de login
│   │   │   ├── ElectricalDetails.js   # Componente de medidores
│   │   │   ├── ExportReports.js   # Componente de generación de reportes
│   │   │   ├── InverterDetails.js   # Componente de inversores
│   │   │   ├── Dashboard.js   # Componente del dashboard
│   │   │   ├── WeatherDetails # Componente de las estaciones meteorologicas
│   │   │   ├── Sidebar.js     # Componente de la barra de herramientas
│   │   │   ├── sivet-logo.svg # Logo de la app
│   │   │   ├── KPI/           # Componentes para tarjetas KPI y gráficos
│   │   │   │   ├── KpiCard.js
│   │   │   │   └── ChartCard.js
│   │   │   └── ... 
│   │   ├── logo.svg
│   │   └── logo.png  # Logo de la aplicación
│   ├── tailwind.config.js
│   └── package.json
├── manage.py               # Utilidad de línea de comandos de Django
├── requirements.txt        # Dependencias de Python
├── .env.example            # Ejemplo de archivo de variables de entorno
└── README.md               # Este archivo
```

## Próximos Pasos

El proyecto tiene un 88% de avance y los siguientes pasos clave se centrarán en:

* **Refinamiento de la Experiencia de Usuario:** Optimización de la interactividad y fluidez, y pruebas de usabilidad.
* **Implementación de Filtros Avanzados:** Desarrollo de funcionalidades de filtrado más complejas (por ID de dispositivo, estado, región, etc.).
* **Integración de Datos Reales:** Conexión a las fuentes de datos SCADA reales (XM, UPME, ASIC) y ajuste de la lógica de mapeo.
* **Desarrollo del Módulo de Pronósticos:** Implementación de la visualización de proyecciones de demanda basadas en modelos.
* **Optimización de Rendimiento con Datos Reales:** Pruebas de carga y optimizaciones para grandes volúmenes de datos.
* **Documentación Exhaustiva:** Completar la documentación técnica y guías de usuario.

## Contribución

Las contribuciones son bienvenidas. Por favor, abre un *issue* o envía un *pull request*.

## Licencia

Este proyecto está bajo la licencia MIT.
