# Guía de Despliegue - MTE Lumen App

## Requisitos Previos

### En la máquina de destino:
- **Docker Desktop** (Windows/Mac) o **Docker Engine** (Linux)
- **Docker Compose** (incluido con Docker Desktop)
- **Git** (opcional, para clonar el repositorio)

## Pasos para Desplegar

### 1. Transferir Archivos

Copia estos archivos y carpetas a la nueva máquina:

```
MteLumen_App/
├── docker-compose.yml
├── docker-compose.local.yml
├── docker-compose.prod.yml
├── Dockerfile.backend
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/ (toda la carpeta)
├── nginx/
├── requirements/
├── requirements.txt
├── env.example
├── scripts/
└── core/ (toda la carpeta)
```

### 2. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp env.example .env

# Editar las variables necesarias
nano .env  # Linux/Mac
notepad .env  # Windows
```

**Variables importantes a configurar:**
- `SECRET_KEY`: Genera una nueva clave secreta
- `password_user_postgres`: Contraseña segura para PostgreSQL
- `REDIS_PASSWORD`: Contraseña segura para Redis
- `SCADA_BASE_URL`: URL del servidor SCADA
- `SCADA_USERNAME`: Usuario SCADA
- `SCADA_PASSWORD`: Contraseña SCADA

### 3. Ejecutar Despliegue

#### En Linux/Mac:
```bash
chmod +x scripts/deploy_to_new_machine.sh
./scripts/deploy_to_new_machine.sh
```

#### En Windows (PowerShell):
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\scripts\deploy_to_new_machine.ps1
```

#### Despliegue Manual:
```bash
# Construir imágenes
docker-compose -f docker-compose.local.yml build

# Iniciar servicios
docker-compose -f docker-compose.local.yml up -d

# Esperar 30 segundos
sleep 30

# Ejecutar migraciones
docker exec mte_backend_local python manage.py migrate

# Crear superusuario
docker exec -it mte_backend_local python manage.py createsuperuser

# Recopilar archivos estáticos
docker exec mte_backend_local python manage.py collectstatic --noinput
```

## Verificación del Despliegue

### URLs de Acceso:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin
- **Swagger API**: http://localhost:8000/api/schema/swagger-ui/

### Comandos de Verificación:
```bash
# Ver estado de contenedores
docker-compose -f docker-compose.local.yml ps

# Ver logs
docker-compose -f docker-compose.local.yml logs -f

# Verificar salud del backend
curl http://localhost:8000/health/
```

## Comandos Útiles

### Gestión de Servicios:
```bash
# Detener servicios
docker-compose -f docker-compose.local.yml down

# Reiniciar servicios
docker-compose -f docker-compose.local.yml restart

# Ver logs en tiempo real
docker-compose -f docker-compose.local.yml logs -f

# Reconstruir imágenes
docker-compose -f docker-compose.local.yml build --no-cache
```

### Gestión de Base de Datos:
```bash
# Ejecutar migraciones
docker exec mte_backend_local python manage.py migrate

# Crear superusuario
docker exec -it mte_backend_local python manage.py createsuperuser

# Acceder a la base de datos
docker exec -it mte_postgres_local psql -U tu_usuario_postgres -d sivet_db
```

### Gestión de Celery:
```bash
# Ver logs de Celery
docker logs mte_celery_worker_local --tail 50

# Reiniciar worker de Celery
docker-compose -f docker-compose.local.yml restart celery_worker
```

## Solución de Problemas

### Error: Puerto en uso
```bash
# Verificar puertos en uso
netstat -tulpn | grep :8000
netstat -tulpn | grep :3000

# Cambiar puertos en docker-compose.local.yml si es necesario
```

### Error: Permisos de archivos
```bash
# En Linux/Mac, dar permisos de ejecución
chmod +x scripts/*.sh
```

### Error: Variables de entorno
```bash
# Verificar variables de entorno
docker exec mte_backend_local env | grep -E "(POSTGRES|REDIS|SCADA)"
```

## Configuración de Producción

Para producción, usa `docker-compose.prod.yml`:

```bash
# Despliegue en producción
docker-compose -f docker-compose.prod.yml up -d
```

**Nota**: Asegúrate de configurar las variables de entorno apropiadas para producción en el archivo `.env`.
