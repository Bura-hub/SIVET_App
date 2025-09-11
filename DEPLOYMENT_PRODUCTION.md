# Guía de Despliegue en Producción - MTE SIVE App

## 🚀 Aplicar Cambios y Desplegar en Producción

### 1. **Preparación del Servidor**

#### Requisitos del Servidor:
- **Sistema Operativo**: Linux (Ubuntu 20.04+ recomendado) o Windows Server
- **RAM**: Mínimo 4GB, recomendado 8GB
- **Almacenamiento**: Mínimo 20GB libres
- **Docker**: Docker Engine 20.10+ y Docker Compose 2.0+
- **Puertos**: 80 (HTTP), 443 (HTTPS), 3503 (Frontend), 3504 (Backend)

#### Instalar Docker en Linux:
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. **Transferir Archivos al Servidor**

#### Opción A: Clonar desde Git
```bash
git clone <tu-repositorio> /opt/mte-sive
cd /opt/mte-sive
```

#### Opción B: Transferir archivos manualmente
```bash
# Crear directorio en el servidor
sudo mkdir -p /opt/mte-sive
sudo chown $USER:$USER /opt/mte-sive

# Transferir archivos (desde tu máquina local)
scp -r . usuario@servidor:/opt/mte-sive/
```

### 3. **Configurar Variables de Entorno**

```bash
# Copiar archivo de ejemplo
cp env.example .env

# Editar variables de entorno
nano .env
```

#### Variables importantes para producción:
```bash
# Configuración de Django
DEBUG=False
SECRET_KEY=tu_clave_secreta_muy_segura_aqui
ALLOWED_HOSTS=tu-dominio.com,www.tu-dominio.com,IP_DEL_SERVIDOR

# Base de datos
name_db=mte_sive_prod
user_postgres=mte_user
password_user_postgres=password_muy_seguro_para_postgres

# Redis
REDIS_PASSWORD=password_muy_seguro_para_redis

# SCADA
SCADA_BASE_URL=http://192.68.185.76:3700
SCADA_USERNAME=tu_usuario_scada
SCADA_PASSWORD=tu_password_scada

# Dominio (opcional)
DOMAIN_NAME=tu-dominio.com
```

### 4. **Desplegar en Producción**

#### En Linux:
```bash
# Hacer ejecutable el script
chmod +x scripts/deploy_production.sh

# Ejecutar despliegue completo
./scripts/deploy_production.sh deploy

# O ejecutar paso a paso:
./scripts/deploy_production.sh ssl      # Crear certificados SSL
./scripts/deploy_production.sh backup   # Crear backup
./scripts/deploy_production.sh deploy   # Desplegar
```

#### En Windows:
```powershell
# Ejecutar script de PowerShell
.\scripts\deploy_production.ps1
```

#### Despliegue Manual:
```bash
# 1. Crear certificados SSL (si no existen)
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem \
  -subj "/C=CO/ST=Bogota/L=Bogota/O=MTE/OU=IT/CN=tu-dominio.com"

# 2. Construir e iniciar servicios
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 3. Esperar que los servicios estén listos
sleep 45

# 4. Ejecutar migraciones
docker exec mte_backend_prod python manage.py migrate

# 5. Crear superusuario
docker exec -it mte_backend_prod python manage.py createsuperuser

# 6. Recopilar archivos estáticos
docker exec mte_backend_prod python manage.py collectstatic --noinput
```

### 5. **Verificar el Despliegue**

#### URLs de Acceso:
- **Frontend**: http://tu-dominio.com:3503 o http://IP_DEL_SERVIDOR:3503
- **Backend**: http://tu-dominio.com:3504 o http://IP_DEL_SERVIDOR:3504
- **Admin**: http://tu-dominio.com:3504/admin o http://IP_DEL_SERVIDOR:3504/admin
- **API**: http://tu-dominio.com:3504/api/schema/swagger-ui/ o http://IP_DEL_SERVIDOR:3504/api/schema/swagger-ui/

#### Comandos de Verificación:
```bash
# Ver estado de contenedores
docker-compose -f docker-compose.prod.yml ps

# Ver logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f

# Verificar salud de servicios
./scripts/deploy_production.sh health

# Verificar endpoints
curl -f http://localhost:3503/health
curl -f http://localhost:3504/health/
```

### 6. **Configurar Dominio (Opcional)**

#### Si tienes un dominio:
1. **Configurar DNS**: Apuntar tu dominio al IP del servidor
2. **Actualizar .env**: Cambiar `DOMAIN_NAME=tu-dominio.com`
3. **Certificados SSL reales**: Usar Let's Encrypt o certificados comerciales

#### Usando Let's Encrypt:
```bash
# Instalar Certbot
sudo apt install certbot

# Obtener certificado
sudo certbot certonly --standalone -d tu-dominio.com

# Copiar certificados
sudo cp /etc/letsencrypt/live/tu-dominio.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/tu-dominio.com/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*.pem

# Reiniciar servicios
docker-compose -f docker-compose.prod.yml restart frontend backend
```

### 7. **Comandos de Mantenimiento**

#### Gestión de Servicios:
```bash
# Detener servicios
docker-compose -f docker-compose.prod.yml down

# Reiniciar servicios
docker-compose -f docker-compose.prod.yml restart

# Ver logs específicos
docker logs mte_backend_prod --tail 50
docker logs mte_frontend_prod --tail 50

# Actualizar aplicación
git pull
./scripts/deploy_production.sh deploy
```

#### Gestión de Base de Datos:
```bash
# Crear backup manual
./scripts/deploy_production.sh backup

# Acceder a la base de datos
docker exec -it mte_postgres_prod psql -U mte_user -d mte_sive_prod

# Restaurar desde backup
docker exec -i mte_postgres_prod psql -U mte_user -d mte_sive_prod < backup.sql
```

#### Gestión de Celery:
```bash
# Ver logs de Celery
docker logs mte_celery_worker_prod --tail 50

# Reiniciar workers
docker-compose -f docker-compose.prod.yml restart celery_worker celery_beat

# Monitorear tareas
docker exec mte_backend_prod celery -A core inspect active
```

### 8. **Monitoreo y Logs**

#### Configurar logs centralizados:
```bash
# Ver logs de todos los servicios
docker-compose -f docker-compose.prod.yml logs -f

# Ver logs de un servicio específico
docker-compose -f docker-compose.prod.yml logs -f backend

# Ver logs con timestamps
docker-compose -f docker-compose.prod.yml logs -f -t
```

#### Monitoreo de recursos:
```bash
# Ver uso de recursos
docker stats

# Ver espacio en disco
df -h

# Ver memoria
free -h
```

### 9. **Solución de Problemas**

#### Error: Puerto en uso
```bash
# Verificar puertos en uso
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# Detener servicios que usen los puertos
sudo systemctl stop apache2  # Si Apache está corriendo
sudo systemctl stop nginx    # Si Nginx está corriendo
```

#### Error: Permisos de archivos
```bash
# Dar permisos correctos
sudo chown -R $USER:$USER /opt/mte-sive
chmod +x scripts/*.sh
```

#### Error: Certificados SSL
```bash
# Verificar certificados
openssl x509 -in ssl/cert.pem -text -noout

# Regenerar certificados
rm ssl/*.pem
./scripts/deploy_production.sh ssl
```

#### Error: Base de datos
```bash
# Verificar conexión a la base de datos
docker exec mte_backend_prod python manage.py dbshell

# Verificar migraciones
docker exec mte_backend_prod python manage.py showmigrations
```

### 10. **Seguridad en Producción**

#### Configuraciones de seguridad:
1. **Firewall**: Configurar UFW o iptables
2. **SSH**: Usar claves SSH, deshabilitar root login
3. **Docker**: Ejecutar como usuario no-root
4. **Base de datos**: Usar contraseñas seguras
5. **SSL**: Usar certificados válidos, no autofirmados

#### Comandos de seguridad:
```bash
# Configurar firewall
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# Verificar puertos abiertos
sudo ufw status
```

### 11. **Backup y Recuperación**

#### Backup automático:
```bash
# Crear backup completo
./scripts/deploy_production.sh backup

# Backup manual de base de datos
docker exec mte_postgres_prod pg_dump -U mte_user mte_sive_prod > backup_$(date +%Y%m%d).sql

# Backup de archivos media
tar -czf media_backup_$(date +%Y%m%d).tar.gz media/
```

#### Recuperación:
```bash
# Restaurar base de datos
docker exec -i mte_postgres_prod psql -U mte_user -d mte_sive_prod < backup.sql

# Restaurar archivos media
tar -xzf media_backup.tar.gz
```

---

## 🎯 Resumen de Pasos Rápidos

1. **Preparar servidor** → Instalar Docker
2. **Transferir archivos** → Clonar repo o SCP
3. **Configurar .env** → Variables de producción
4. **Ejecutar despliegue** → `./scripts/deploy_production.sh deploy`
5. **Verificar funcionamiento** → Probar URLs
6. **Configurar dominio** → DNS y SSL real
7. **Monitorear** → Logs y recursos

¡Tu aplicación estará funcionando en producción! 🚀
