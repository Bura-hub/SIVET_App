# 🐳 MTE Lumen - Docker Deployment Guide

## 📋 Tabla de Contenidos

- [Requisitos Previos](#requisitos-previos)
- [Configuración Inicial](#configuración-inicial)
- [Desarrollo](#desarrollo)
- [Producción](#producción)
- [Scripts de Gestión](#scripts-de-gestión)
- [Monitoreo](#monitoreo)
- [Troubleshooting](#troubleshooting)
- [Estructura del Proyecto](#estructura-del-proyecto)

## 🔧 Requisitos Previos

### Software Necesario
- **Docker**: Versión 20.10 o superior
- **Docker Compose**: Versión 2.0 o superior
- **Git**: Para clonar el repositorio
- **OpenSSL**: Para generar certificados SSL (producción)

### Verificar Instalación
```bash
docker --version
docker-compose --version
```

## ⚙️ Configuración Inicial

### 1. Clonar el Repositorio
```bash
git clone <repository-url>
cd MteLumen_App
```

### 2. Configurar Variables de Entorno
```bash
# Copiar archivo de ejemplo
cp env.example .env

# Editar variables de entorno
nano .env
```

### Variables de Entorno Requeridas
```env
# Configuración de Django
DEBUG=True
SECRET_KEY=tu_clave_secreta_muy_segura_aqui
ALLOWED_HOSTS=localhost,127.0.0.1

# Base de Datos PostgreSQL
name_db=mte_lumen_db
user_postgres=mte_user
password_user_postgres=tu_password_seguro_aqui
port_postgres=5432

# Redis
REDIS_PASSWORD=tu_password_redis_seguro

# Credenciales SCADA
SCADA_USERNAME=tu_usuario_scada
SCADA_PASSWORD=tu_password_scada

# Producción
DOMAIN_NAME=tu-dominio.com
```

## 🚀 Desarrollo

### Opciones de Desarrollo

#### 1. Desarrollo con Docker (Base de datos y Redis en contenedores)
```bash
# Usar el script de gestión
./scripts/docker-manager.sh dev-up

# O manualmente
docker-compose up -d
```

#### 2. Desarrollo Local (Todo en Docker - PostgreSQL 17 + Redis + Celery)
```bash
# Usar el script de gestión
./scripts/docker-manager.sh local-up

# O manualmente
docker-compose -f docker-compose.local.yml up -d
```

### Servicios Disponibles

#### Desarrollo con Docker (todo en contenedores):
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Nginx**: http://localhost:80
- **PostgreSQL**: localhost:5432 (contenedor)
- **Redis**: localhost:6379 (contenedor)

#### Desarrollo Local (Todo en Docker):
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Nginx**: http://localhost:80
- **PostgreSQL 17**: localhost:5432 (Docker)
- **Redis**: localhost:6379 (Docker)
- **Celery Worker**: Docker
- **Celery Beat**: Docker

### Comandos Útiles
```bash
# Ver logs
./scripts/docker-manager.sh logs dev
./scripts/docker-manager.sh logs local

# Ver logs de un servicio específico
./scripts/docker-manager.sh logs dev backend
./scripts/docker-manager.sh logs local backend

# Reiniciar servicios
./scripts/docker-manager.sh restart dev
./scripts/docker-manager.sh restart local

# Ver estado de servicios
./scripts/docker-manager.sh status dev
./scripts/docker-manager.sh status local

# Verificar salud de servicios
./scripts/docker-manager.sh health dev
./scripts/docker-manager.sh health local
```

## 🏭 Producción

### 1. Configurar SSL (Opcional)
```bash
# Crear directorio para certificados
mkdir -p ssl

# Generar certificados autofirmados (solo para testing)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/key.pem \
    -out ssl/cert.pem

# Para producción real, usar Let's Encrypt o certificados comerciales
```

### 2. Configurar Variables de Producción
```env
# En .env
DEBUG=False
ALLOWED_HOSTS=tu-dominio.com,www.tu-dominio.com
DOMAIN_NAME=tu-dominio.com
```

### 3. Desplegar a Producción
```bash
# Despliegue completo
./scripts/deploy.sh deploy

# O manualmente
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Verificar Despliegue
```bash
# Verificar salud
./scripts/monitor.sh report prod

# Ver logs
./scripts/docker-manager.sh logs prod
```

## 🛠️ Scripts de Gestión

### Docker Manager (`scripts/docker-manager.sh`)
```bash
# Desarrollo
./scripts/docker-manager.sh dev-up          # Iniciar desarrollo (todo en Docker)
./scripts/docker-manager.sh local-up        # Iniciar desarrollo local (PostgreSQL 17 + Docker)
./scripts/docker-manager.sh stop            # Detener servicios
./scripts/docker-manager.sh restart dev     # Reiniciar desarrollo
./scripts/docker-manager.sh restart local   # Reiniciar desarrollo local

# Producción
./scripts/docker-manager.sh prod-up         # Iniciar producción
./scripts/docker-manager.sh restart prod    # Reiniciar producción

# Utilidades
./scripts/docker-manager.sh backup-db       # Backup de base de datos (PostgreSQL Docker)
./scripts/docker-manager.sh health local    # Verificar salud (PostgreSQL 17 + Docker)
./scripts/docker-manager.sh health prod     # Verificar salud (producción)
./scripts/docker-manager.sh cleanup         # Limpiar recursos Docker
```

### Deployment Script (`scripts/deploy.sh`)
```bash
# Despliegue completo
./scripts/deploy.sh deploy

# Verificar salud
./scripts/deploy.sh health

# Rollback
./scripts/deploy.sh rollback

# Solo backup
./scripts/deploy.sh backup
```

### Monitoring Script (`scripts/monitor.sh`)
```bash
# Reporte completo
./scripts/monitor.sh report local
./scripts/monitor.sh report prod

# Monitoreo continuo
./scripts/monitor.sh monitor local
./scripts/monitor.sh monitor prod

# Verificar componentes específicos
./scripts/monitor.sh status local
./scripts/monitor.sh resources local
./scripts/monitor.sh database local
./scripts/monitor.sh redis local
```

## 📊 Monitoreo

### Health Checks
Todos los servicios incluyen health checks automáticos:

- **Backend**: `http://localhost:8000/health/`
- **Frontend**: `http://localhost:3000/health`
- **Nginx**: `http://localhost/health`

### Logs
```bash
# Ver logs en tiempo real
docker-compose logs -f

# Logs de un servicio específico
docker-compose logs -f backend

# Logs con timestamps
docker-compose logs -f -t
```

### Métricas de Recursos
```bash
# Uso de recursos
docker stats

# Información del sistema
docker system df
```

## 🔧 Troubleshooting

### Problemas Comunes

#### 1. Puerto ya en uso
```bash
# Verificar qué proceso usa el puerto
netstat -tulpn | grep :80

# Cambiar puerto en docker-compose.yml
ports:
  - "8080:80"  # Cambiar 80 por 8080
```

#### 2. Error de permisos
```bash
# En Linux/Mac, cambiar permisos
sudo chown -R $USER:$USER .

# En Windows, ejecutar como administrador
```

#### 3. Base de datos no conecta
```bash
# Verificar que PostgreSQL esté corriendo
docker-compose ps db

# Ver logs de la base de datos
docker-compose logs db

# Reiniciar base de datos
docker-compose restart db
```

#### 4. Celery no procesa tareas
```bash
# Verificar workers
docker-compose logs celery_worker

# Reiniciar workers
docker-compose restart celery_worker celery_beat

# Verificar Redis
docker-compose exec redis redis-cli ping
```

### Comandos de Diagnóstico
```bash
# Verificar estado de todos los servicios
./scripts/monitor.sh status prod

# Verificar conectividad de red
docker network ls
docker network inspect mte_network_prod

# Verificar volúmenes
docker volume ls
docker volume inspect mte_postgres_data_prod
```

## 📁 Estructura del Proyecto

```
MteLumen_App/
├── 📁 authentication/          # App de autenticación
├── 📁 core/                    # Configuración principal
├── 📁 external_energy/         # App de energía externa
├── 📁 frontend/                # Aplicación React
│   ├── 📄 Dockerfile          # Dockerfile del frontend
│   └── 📄 nginx.conf          # Configuración Nginx del frontend
├── 📁 indicators/              # App de indicadores
├── 📁 nginx/                   # Configuración Nginx
│   ├── 📄 nginx.conf          # Nginx desarrollo
│   └── 📄 nginx.prod.conf     # Nginx producción
├── 📁 requirements/            # Dependencias Python
│   ├── 📄 base.txt            # Dependencias base
│   ├── 📄 development.txt     # Dependencias desarrollo
│   └── 📄 production.txt      # Dependencias producción
├── 📁 scada_proxy/             # App proxy SCADA
├── 📁 scripts/                 # Scripts de gestión
│   ├── 📄 docker-manager.sh   # Gestor principal
│   ├── 📄 deploy.sh           # Script de despliegue
│   └── 📄 monitor.sh          # Script de monitoreo
├── 📄 docker-compose.yml       # Compose desarrollo
├── 📄 docker-compose.prod.yml  # Compose producción
├── 📄 Dockerfile.backend       # Dockerfile backend
├── 📄 .env                     # Variables de entorno
├── 📄 env.example              # Ejemplo de variables
└── 📄 README_DOCKER.md         # Esta documentación
```

## 🔒 Seguridad

### Mejores Prácticas Implementadas

1. **Usuarios no-root**: Todos los contenedores ejecutan con usuarios no-privilegiados
2. **Health checks**: Monitoreo automático de salud de servicios
3. **Rate limiting**: Protección contra ataques DDoS
4. **Security headers**: Headers de seguridad en Nginx
5. **SSL/TLS**: Soporte para HTTPS en producción
6. **Variables de entorno**: Credenciales fuera del código
7. **Logs centralizados**: Gestión de logs para auditoría

### Configuración de Firewall
```bash
# Permitir solo puertos necesarios
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp  # SSH
ufw enable
```

## 📈 Escalabilidad

### Escalar Servicios
```bash
# Escalar workers de Celery
docker-compose -f docker-compose.prod.yml up -d --scale celery_worker=3

# Escalar backend
docker-compose -f docker-compose.prod.yml up -d --scale backend=2
```

### Load Balancing
El Nginx está configurado para balancear carga entre múltiples instancias del backend.

## 🆘 Soporte

### Logs de Error
```bash
# Ver logs de error
./scripts/monitor.sh logs prod

# Logs específicos de error
docker-compose logs | grep ERROR
```

### Contacto
Para soporte técnico, contactar al equipo de desarrollo.

---

**Última actualización**: $(date)
**Versión**: 2.0.0