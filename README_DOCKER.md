# 🐳 Dockerización de MteLumen_App

Este documento describe cómo dockerizar y ejecutar la aplicación MteLumen_App usando Docker y Docker Compose.

## 📋 Prerrequisitos

- Docker (versión 20.10 o superior)
- Docker Compose (versión 2.0 o superior)
- Git (para clonar el repositorio)

## 🚀 Inicio Rápido

### 1. Configuración Inicial

```bash
# Clonar el repositorio (si no lo has hecho)
git clone <tu-repositorio>
cd MteLumen_App

# Copiar el archivo de configuración de ejemplo
cp env.example .env

# Editar las variables de entorno
nano .env
```

### 2. Configurar Variables de Entorno

Edita el archivo `.env` con tus configuraciones:

```env
# Configuración de Django
DEBUG=True
SECRET_KEY=tu_clave_secreta_aqui_cambiar_en_produccion
ALLOWED_HOSTS=localhost,127.0.0.1

# Configuración de Base de Datos PostgreSQL
name_db=mte_lumen_db
user_postgres=mte_user
password_user_postgres=tu_password_seguro_aqui
port_postgres=5432

# Configuración de Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# Credenciales SCADA
SCADA_USERNAME=tu_usuario_scada
SCADA_PASSWORD=tu_password_scada
```

### 3. Ejecutar la Aplicación

```bash
# Dar permisos de ejecución a los scripts
chmod +x scripts/*.sh

# Iniciar la aplicación
./scripts/start.sh

# O usar Docker Compose directamente
docker-compose up -d
```

## 🏗️ Arquitectura de la Aplicación

La aplicación está compuesta por los siguientes servicios:

### Servicios Principales

- **Frontend (React)**: Interfaz de usuario en el puerto 3000
- **Backend (Django)**: API REST en el puerto 8000
- **PostgreSQL**: Base de datos principal
- **Redis**: Broker para Celery y caché
- **Celery Worker**: Procesamiento de tareas asíncronas
- **Celery Beat**: Programador de tareas periódicas

### Redes y Volúmenes

- **Red**: `mte_network` - Conecta todos los servicios
- **Volúmenes**:
  - `postgres_data`: Datos de PostgreSQL
  - `redis_data`: Datos de Redis
  - `./media`: Archivos multimedia de la aplicación

## 📁 Estructura de Archivos Docker

```
MteLumen_App/
├── Dockerfile.backend          # Dockerfile para Django
├── frontend/Dockerfile         # Dockerfile para React
├── docker-compose.yml          # Configuración de desarrollo
├── docker-compose.prod.yml     # Configuración de producción
├── .dockerignore              # Archivos a ignorar en Docker
├── env.example                # Variables de entorno de ejemplo
├── init-db.sql               # Script de inicialización de BD
├── nginx.conf                # Configuración de Nginx
└── scripts/                  # Scripts de utilidad
    ├── start.sh              # Iniciar aplicación
    ├── stop.sh               # Detener aplicación
    ├── restart.sh            # Reiniciar aplicación
    ├── logs.sh               # Ver logs
    └── backup.sh             # Crear backup
```

## 🛠️ Comandos Útiles

### Gestión de la Aplicación

```bash
# Iniciar todos los servicios
docker-compose up -d

# Detener todos los servicios
docker-compose down

# Reiniciar la aplicación
docker-compose restart

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f celery_worker
```

### Gestión de la Base de Datos

```bash
# Ejecutar migraciones
docker-compose exec backend python manage.py migrate

# Crear superusuario
docker-compose exec backend python manage.py createsuperuser

# Acceder a la base de datos
docker-compose exec db psql -U mte_user -d mte_lumen_db

# Hacer backup de la base de datos
docker-compose exec db pg_dump -U mte_user mte_lumen_db > backup.sql
```

### Gestión de Celery

```bash
# Ver estado de Celery
docker-compose exec celery_worker celery -A core status

# Ejecutar tarea específica
docker-compose exec celery_worker celery -A core call scada_proxy.tasks.sync_scada_metadata

# Ver tareas en cola
docker-compose exec redis redis-cli llen celery
```

## 🔧 Desarrollo

### Modo Desarrollo

```bash
# Iniciar en modo desarrollo
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f

# Reconstruir después de cambios
docker-compose up --build -d
```

### Debugging

```bash
# Acceder al contenedor del backend
docker-compose exec backend bash

# Acceder al contenedor del frontend
docker-compose exec frontend sh

# Ver logs de un servicio específico
docker-compose logs -f backend
```

## 🚀 Producción

### Configuración de Producción

1. **Configurar variables de entorno**:
   ```bash
   cp env.example .env
   # Editar .env con configuraciones de producción
   ```

2. **Usar docker-compose.prod.yml**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Configurar Nginx** (opcional):
   - Editar `nginx.conf` con tu dominio
   - Configurar certificados SSL
   - Descomentar configuración HTTPS

### Optimizaciones de Producción

- Usar Gunicorn en lugar del servidor de desarrollo de Django
- Configurar Nginx como proxy reverso
- Usar volúmenes persistentes para datos
- Configurar logs centralizados
- Implementar monitoreo y alertas

## 🔒 Seguridad

### Buenas Prácticas

1. **Variables de entorno**:
   - Nunca commitees archivos `.env`
   - Usa claves secretas fuertes
   - Rota las claves regularmente

2. **Redes**:
   - Los servicios de base de datos no exponen puertos en producción
   - Usa redes internas para comunicación entre servicios

3. **Volúmenes**:
   - Usa volúmenes nombrados para datos persistentes
   - Configura permisos apropiados

## 🐛 Solución de Problemas

### Problemas Comunes

1. **Error de conexión a la base de datos**:
   ```bash
   # Verificar que PostgreSQL esté ejecutándose
   docker-compose ps
   
   # Ver logs de la base de datos
   docker-compose logs db
   ```

2. **Error de permisos**:
   ```bash
   # Dar permisos a los scripts
   chmod +x scripts/*.sh
   ```

3. **Puerto ya en uso**:
   ```bash
   # Verificar qué proceso usa el puerto
   lsof -i :3000
   lsof -i :8000
   
   # Detener la aplicación
   docker-compose down
   ```

4. **Problemas de memoria**:
   ```bash
   # Limpiar recursos de Docker
   docker system prune -a
   ```

### Logs y Debugging

```bash
# Ver todos los logs
docker-compose logs

# Ver logs de un servicio específico
docker-compose logs backend

# Seguir logs en tiempo real
docker-compose logs -f

# Ver logs con timestamps
docker-compose logs -t
```

## 📊 Monitoreo

### Verificar Estado de los Servicios

```bash
# Estado de todos los contenedores
docker-compose ps

# Uso de recursos
docker stats

# Espacio en disco
docker system df
```

### Métricas de la Aplicación

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Admin Django**: http://localhost:8000/admin
- **Documentación API**: http://localhost:8000/api/schema/swagger-ui/

## 🔄 Backup y Restauración

### Crear Backup

```bash
# Usar el script de backup
./scripts/backup.sh

# O manualmente
docker-compose exec db pg_dump -U mte_user mte_lumen_db > backup.sql
```

### Restaurar Backup

```bash
# Restaurar base de datos
docker-compose exec -T db psql -U mte_user -d mte_lumen_db < backup.sql
```

## 📚 Recursos Adicionales

- [Documentación de Docker](https://docs.docker.com/)
- [Documentación de Docker Compose](https://docs.docker.com/compose/)
- [Documentación de Django](https://docs.djangoproject.com/)
- [Documentación de React](https://reactjs.org/docs/)
- [Documentación de Celery](https://docs.celeryproject.org/)

## 🤝 Contribución

Para contribuir al proyecto:

1. Fork el repositorio
2. Crea una rama para tu feature
3. Haz commit de tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia [MIT](LICENSE).
