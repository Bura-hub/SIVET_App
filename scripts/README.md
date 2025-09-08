# 📁 Scripts de Despliegue - MTE Lumen App

## 🎯 **Scripts Disponibles**

### **Windows (PowerShell)**

#### 1. **`deploy_production_simple.ps1`** ⭐ **Recomendado**
```powershell
.\scripts\deploy_production_simple.ps1
```
**Uso:** Despliegue simplificado en producción
- ✅ Sin errores de sintaxis
- ✅ Manejo robusto de errores
- ✅ Funciona con o sin OpenSSL
- ✅ Creación automática de directorios
- ✅ Mensajes claros y coloridos

#### 2. **`deploy_production.ps1`**
```powershell
.\scripts\deploy_production.ps1
```
**Uso:** Despliegue completo en producción
- ✅ Más funcionalidades (backup, rollback, health checks)
- ✅ Manejo avanzado de SSL
- ✅ Logging detallado

#### 3. **`deploy_to_new_machine.ps1`**
```powershell
.\scripts\deploy_to_new_machine.ps1
```
**Uso:** Despliegue en desarrollo/local
- ✅ Configuración para desarrollo
- ✅ Usa `docker-compose.local.yml`
- ✅ Ideal para nuevas máquinas de desarrollo

### **Linux/Mac (Bash)**

#### 4. **`deploy_production.sh`**
```bash
chmod +x scripts/deploy_production.sh
./scripts/deploy_production.sh deploy
```
**Uso:** Despliegue completo en producción
- ✅ Script completo con todas las funcionalidades
- ✅ Backup automático
- ✅ Health checks
- ✅ Rollback automático
- ✅ Logging detallado

## 🚀 **Guía de Uso Rápido**

### **Para Desarrollo (Windows):**
```powershell
.\scripts\deploy_to_new_machine.ps1
```

### **Para Producción (Windows):**
```powershell
.\scripts\deploy_production_simple.ps1
```

### **Para Producción (Linux/Mac):**
```bash
chmod +x scripts/deploy_production.sh
./scripts/deploy_production.sh deploy
```

## 📋 **Comandos de Mantenimiento**

### **Ver estado de servicios:**
```bash
# Windows
docker-compose -f docker-compose.prod.yml ps

# Linux/Mac
./scripts/deploy_production.sh health
```

### **Ver logs:**
```bash
# Todos los servicios
docker-compose -f docker-compose.prod.yml logs -f

# Servicio específico
docker logs mte_backend_prod --tail 50
```

### **Crear backup:**
```bash
# Linux/Mac
./scripts/deploy_production.sh backup

# Windows (manual)
docker exec mte_postgres_prod pg_dump -U mte_user mte_lumen_prod > backup.sql
```

### **Rollback:**
```bash
# Linux/Mac
./scripts/deploy_production.sh rollback
```

## 🔧 **Configuración Previa**

### **1. Variables de Entorno:**
```bash
# Copiar archivo de ejemplo
cp env.example .env

# Editar configuraciones
notepad .env  # Windows
nano .env     # Linux/Mac
```

### **2. Variables Importantes:**
```bash
# Producción
DEBUG=False
SECRET_KEY=tu_clave_secreta_muy_segura
ALLOWED_HOSTS=tu-dominio.com,IP_DEL_SERVIDOR

# Base de datos
name_db=mte_lumen_prod
user_postgres=mte_user
password_user_postgres=password_seguro

# Redis
REDIS_PASSWORD=password_seguro_redis

# SCADA
SCADA_BASE_URL=http://192.68.185.76:3700
SCADA_USERNAME=tu_usuario
SCADA_PASSWORD=tu_password
```

## 🌐 **URLs de Acceso**

### **Desarrollo:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Admin: http://localhost:8000/admin

### **Producción:**
- HTTP: http://localhost
- HTTPS: https://localhost (si SSL está configurado)
- Admin: http://localhost/admin
- API: http://localhost/api/schema/swagger-ui/

## 🛠️ **Solución de Problemas**

### **Error: Puerto en uso**
```bash
# Verificar puertos
netstat -an | findstr :80    # Windows
netstat -tulpn | grep :80    # Linux/Mac

# Detener servicios
Stop-Service -Name "W3SVC" -Force  # Windows (IIS)
sudo systemctl stop apache2        # Linux (Apache)
```

### **Error: Docker no responde**
```bash
# Windows
Restart-Service -Name "com.docker.service"

# Linux/Mac
sudo systemctl restart docker
```

### **Error: Permisos**
```bash
# Linux/Mac
chmod +x scripts/*.sh
sudo chown -R $USER:$USER .

# Windows
# Ejecutar PowerShell como Administrador
```

## 📊 **Monitoreo**

### **Comandos útiles:**
```bash
# Ver recursos
docker stats

# Ver espacio en disco
df -h  # Linux/Mac
Get-WmiObject -Class Win32_LogicalDisk  # Windows

# Ver logs de errores
docker-compose -f docker-compose.prod.yml logs --tail=100 | grep -i error
```

## 🔄 **Actualización de la Aplicación**

### **Proceso de actualización:**
```bash
# 1. Hacer backup
./scripts/deploy_production.sh backup  # Linux/Mac

# 2. Actualizar código
git pull

# 3. Redesplegar
./scripts/deploy_production.sh deploy  # Linux/Mac
# o
.\scripts\deploy_production_simple.ps1  # Windows
```

---

## 📞 **Soporte**

Si tienes problemas con los scripts:

1. **Verifica la sintaxis:** Los scripts han sido probados y corregidos
2. **Revisa los logs:** `docker-compose -f docker-compose.prod.yml logs -f`
3. **Verifica Docker:** `docker --version` y `docker-compose --version`
4. **Revisa variables:** Asegúrate de que `.env` esté configurado correctamente

¡Los scripts están listos para usar! 🚀
