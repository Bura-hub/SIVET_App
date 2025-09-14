# 🌟 MTE SIVE - Sistema de Visualización Energético

[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Django](https://img.shields.io/badge/Django-5.2.4-green.svg)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19.1.0-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 Descripción General

**MTE SIVE** es una aplicación web integral para la visualización de datos históricos e indicadores clave relacionados con el consumo y generación de energía eléctrica, así como variables climáticas relevantes. Construida con una arquitectura desacoplada utilizando **Django (Python)** para el backend y **React (JavaScript)** para el frontend.

### 🎯 Objetivo Principal
Transformar datos complejos en información accionable, proporcionando a analistas y ejecutivos una visión clara y dinámica del comportamiento de los sistemas energéticos y climáticos.

**Estado del Proyecto: 95% de avance** - Fase de maduración y refinamiento completada.

## 🚀 Características Principales

### 🔐 Autenticación y Seguridad
- **Sistema de Autenticación Robusto**: Login seguro con gestión de usuarios y roles
- **Gestión de Perfiles Avanzada**: Configuración de información personal, avatares y preferencias
- **Gestión de Sesiones**: Control de dispositivos conectados con capacidad de cerrar sesiones
- **Seguridad Mejorada**: Rate limiting, bloqueo temporal por intentos fallidos
- **Tokens de Acceso**: Sistema de autenticación basado en tokens con expiración automática

### 📊 Dashboard y Visualizaciones
- **Dashboard Interactivo**: Panel de control principal con resumen de indicadores clave (KPIs)
- **Visualizaciones Dinámicas**: Gráficos interactivos (líneas y barras) impulsados por Chart.js
- **KPIs en Tiempo Real**: Métricas actualizadas automáticamente para consumo, generación y balance energético
- **Persistencia de Estado**: Recuerda el estado de la barra lateral y pestañas activas

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

## 🏗️ Arquitectura del Proyecto

### Backend (Django 5.2.4)
- **Django 5.2.4**: Framework web principal
- **Django REST Framework**: Construcción de APIs RESTful
- **PostgreSQL 17**: Base de datos principal
- **Redis**: Broker para Celery y caché
- **Celery**: Procesamiento asíncrono de tareas
- **Celery Beat**: Programación de tareas periódicas

### Frontend (React 19.1.0)
- **React 19.1.0**: Biblioteca de interfaz de usuario
- **Chart.js 4.5.0**: Visualización de datos y gráficos
- **Tailwind CSS 3.4.17**: Framework de CSS utilitario
- **React Router**: Navegación entre componentes

### Infraestructura
- **Docker**: Containerización completa de la aplicación
- **PostgreSQL**: Base de datos con persistencia
- **Redis**: Cache y broker de mensajes
- **Acceso Directo**: Sin proxy reverso - acceso directo a puertos

## 🛠️ Requisitos del Sistema

### Software Requerido
- **Docker**: Versión 20.10 o superior
- **Docker Compose**: Versión 2.0 o superior
- **Git**: Para control de versiones

### Hardware Recomendado
- **RAM**: 4GB mínimo, 8GB recomendado
- **Almacenamiento**: 20GB mínimo para desarrollo, 50GB+ para producción
- **CPU**: Procesador de 2+ núcleos para desarrollo, 4+ núcleos para producción

## ⚙️ Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone <URL_DEL_REPOSITORIO>
cd MteSive_App
```

### 2. Configurar Variables de Entorno
```bash
# Copiar archivo de ejemplo
cp env.example .env

# Editar variables de entorno
notepad .env  # Windows
nano .env     # Linux/Mac
```

### 3. Desplegar con Docker

#### Para Desarrollo (Windows):
```powershell
.\scripts\deploy_to_new_machine.ps1
```

#### Para Producción (Windows):
```powershell
.\scripts\deploy_production.ps1 deploy
```

#### Para Producción (Linux/Mac):
```bash
chmod +x scripts/deploy_production.sh
./scripts/deploy_production.sh deploy
```

### 4. Configurar Aplicación
```bash
# Crear superusuario
docker exec -it mte_backend_prod python manage.py createsuperuser

# Verificar servicios
docker-compose -f docker-compose.prod.yml ps
```

## 🌐 URLs de Acceso

### Desarrollo:
- **Frontend**: http://localhost:${FRONTEND_PORT:-3503}
- **Backend**: http://localhost:${BACKEND_PORT:-3504}
- **Admin**: http://localhost:${BACKEND_PORT:-3504}/admin

### Producción:
- **Frontend**: http://TU_IP:${FRONTEND_PORT:-3503}
- **Backend**: http://TU_IP:${BACKEND_PORT:-3504}
- **Admin**: http://TU_IP:${BACKEND_PORT:-3504}/admin
- **API**: http://TU_IP:${BACKEND_PORT:-3504}/api/schema/swagger-ui/

**Nota**: Reemplaza `TU_IP` con la IP específica de tu servidor (ej: 192.168.1.100)

## 📊 Indicadores Clave de Rendimiento (KPIs)

### 🔋 Consumo y Generación
- **Consumo Total**: Consumo acumulado de energía eléctrica (kWh)
- **Generación Total**: Generación acumulada de energía (kWh) por inversores
- **Equilibrio Energético**: Diferencia neta entre generación y consumo
- **Potencia Instantánea Promedio**: Promedio de potencia activa (Watts)

### 🌡️ Variables Climáticas
- **Temperatura Promedio Diaria**: Temperatura promedio (°C)
- **Humedad Relativa**: Humedad relativa promedio (%RH)
- **Velocidad del Viento**: Velocidad promedio del viento (km/h)
- **Irradiancia Solar**: Radiación solar promedio (W/m²)

### 📊 Métricas Operativas
- **Inversores Activos**: Conteo en tiempo real de inversores operativos
- **Eficiencia del Sistema**: Relación entre generación y capacidad instalada
- **Factor de Capacidad**: Utilización efectiva de la capacidad de generación
- **Autoconsumo**: Porcentaje de energía generada consumida localmente

## 🔄 Tareas Programadas (Celery Beat)

El sistema ejecuta automáticamente:
- **Metadatos SCADA**: Sincronización diaria a las 2:00 AM
- **KPIs Mensuales**: Cálculo diario a las 3:30 AM
- **Datos Diarios**: Procesamiento a las 3:45 AM
- **Mediciones Históricas**: Obtención cada hora

## 📚 Documentación

### Guías Principales
- **[Despliegue en Producción](DEPLOYMENT_PRODUCTION.md)**: Guía completa de despliegue
- **[Scripts de Gestión](scripts/README.md)**: Documentación de scripts de automatización
- **[Frontend](frontend/README.md)**: Documentación del frontend React
- **[Indicadores](indicators/indicators.md)**: Metodología de cálculo de KPIs

### Módulos Especializados
- **[Datos Externos de Energía](external_energy/README.md)**: Integración con APIs externas
- **[Inicio Rápido - Datos Externos](external_energy/quick_start.md)**: Configuración rápida

### Índice de Documentación
- **[DOCS_INDEX.md](DOCS_INDEX.md)**: Índice completo de toda la documentación

## 🛠️ Comandos de Gestión Útiles

### Desarrollo y Pruebas
```bash
# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Ver estado de servicios
docker-compose -f docker-compose.prod.yml ps

# Reiniciar servicios
docker-compose -f docker-compose.prod.yml restart

# Crear backup
./scripts/deploy_production.sh backup  # Linux/Mac
```

### Mantenimiento
```bash
# Verificar salud
./scripts/deploy_production.sh health  # Linux/Mac

# Rollback
./scripts/deploy_production.sh rollback  # Linux/Mac

# Limpiar recursos
docker system prune -f
```

## 🚨 Solución de Problemas

### Error: Puerto en uso
```bash
# Verificar puertos
netstat -an | findstr :80    # Windows
netstat -tulpn | grep :80    # Linux/Mac
```

### Error: Docker no responde
```bash
# Windows
Restart-Service -Name "com.docker.service"

# Linux/Mac
sudo systemctl restart docker
```

### Error: Base de datos no conecta
```bash
# Verificar logs
docker logs mte_postgres_prod

# Reiniciar base de datos
docker-compose -f docker-compose.prod.yml restart db
```

## 📈 Estado de Desarrollo

### ✅ Funcionalidades Completadas (95%)
- Sistema de autenticación y gestión de usuarios
- Dashboard principal con KPIs en tiempo real
- Módulos de detalles eléctricos, inversores y clima
- Integración con API SCADA y sincronización automática
- Cálculo automático de indicadores energéticos
- Sistema de reportes y exportación de datos
- Módulo de datos externos de energía
- Interfaz de usuario responsiva y moderna

### 🔄 En Desarrollo (5%)
- Optimización de rendimiento con datos reales
- Pruebas de carga y estabilidad
- Refinamiento de algoritmos de cálculo

### 🎯 Próximos Pasos
- **Integración con Datos Reales**: Conexión a fuentes SCADA reales
- **Módulo de Pronósticos**: Implementación de modelos predictivos
- **Alertas Inteligentes**: Sistema de notificaciones automáticas
- **Móvil**: Aplicación móvil nativa o PWA

## 🤝 Contribución

Las contribuciones son bienvenidas:

1. **Fork** del repositorio
2. **Crear** una rama para tu funcionalidad
3. **Commit** tus cambios
4. **Push** a la rama
5. **Crear** un Pull Request

### Guías de Contribución
- Sigue las convenciones de código del proyecto
- Incluye pruebas para nuevas funcionalidades
- Actualiza la documentación según sea necesario

## 📞 Soporte y Contacto

### Canales de Soporte
- **Issues del Proyecto**: Reportar bugs y solicitar funcionalidades
- **Documentación**: Guías de usuario y técnica
- **Sistema de Ayuda**: Integrado en la aplicación

### Información del Proyecto
- **Código BPIN**: 2021000100499
- **Tipo**: Sistema de Visualización Energético
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

**Última Actualización**: Enero 2025  
