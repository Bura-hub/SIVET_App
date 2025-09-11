# 📁 Scripts de Despliegue - MTE SIVE App

## 🎯 **Scripts Disponibles**

### **Windows (PowerShell)**

#### 1. **`deploy_production.ps1`** ⭐ **Script Principal**
```powershell
.\scripts\deploy_production.ps1 [comando]
```
**Comandos disponibles:**
- `deploy` - Despliegue completo en producción
- `health` - Verificar salud de servicios
- `backup` - Crear backup de la base de datos
- `ssl` - Crear certificados SSL
- `rollback` - Rollback a versión anterior
- `help` - Mostrar ayuda

**Características:**
- ✅ Manejo robusto de errores
- ✅ Logging detallado con timestamps
- ✅ Backup automático antes del despliegue
- ✅ Health checks completos
- ✅ Rollback automático en caso de error
- ✅ Creación automática de directorios
- ✅ Mensajes claros y coloridos

#### 2. **`run_deployment.ps1`** - Script de Ayuda
```powershell
.\scripts\run_deployment.ps1 [comando]
```
**Uso:** Script simplificado que ejecuta el script principal
- ✅ Interfaz más simple
- ✅ Redirige comandos al script principal
- ✅ Ideal para usuarios que prefieren comandos cortos

#### 3. **`deploy_to_new_machine.ps1`** - Desarrollo
```powershell
.\scripts\deploy_to_new_machine.ps1
```
**Uso:** Despliegue en desarrollo/local
- ✅ Configuración para desarrollo
- ✅ Usa `docker-compose.local.yml`
- ✅ Ideal para nuevas máquinas de desarrollo

#### 4. **`test_windows_deployment.ps1`** - Verificación
```powershell
.\scripts\test_windows_deployment.ps1
```
**Uso:** Verificar requisitos del sistema
- ✅ Verifica PowerShell, Docker, OpenSSL
- ✅ Valida archivos de configuración
- ✅ Comprueba puertos disponibles
- ✅ Verifica espacio en disco

### **Linux/Mac (Bash)**

#### 5. **`deploy_production.sh`**
```bash
chmod +x scripts/deploy_production.sh
./scripts/deploy_production.sh [comando]
```
**Comandos disponibles:**
- `deploy` - Despliegue completo en producción
- `health` - Verificar salud de servicios
- `backup` - Crear backup de la base de datos
- `rollback` - Rollback a versión anterior

**Características:**
- ✅ Script completo con todas las funcionalidades
- ✅ Backup automático
- ✅ Health checks
- ✅ Rollback automático
- ✅ Logging detallado

## 🚀 **Guía de Uso Rápido**

### **Para Desarrollo (Windows):**
```powershell
# Verificar requisitos
.\scripts\test_windows_deployment.ps1

# Desplegar en desarrollo
.\scripts\deploy_to_new_machine.ps1
```

### **Para Producción (Windows):**
```powershell
# Verificar requisitos
.\scripts\test_windows_deployment.ps1

# Desplegar en producción
.\scripts\deploy_production.ps1 deploy

# O usar el script de ayuda
.\scripts\run_deployment.ps1 deploy
```

### **Para Producción (Linux/Mac):**
```bash
# Hacer ejecutable
chmod +x scripts/deploy_production.sh

# Desplegar
./scripts/deploy_production.sh deploy
```

## 📋 **Comandos de Mantenimiento**

### **Ver estado de servicios:**
```powershell
# Windows
.\scripts\deploy_production.ps1 health
# o
docker-compose -f docker-compose.prod.yml ps

# Linux/Mac
./scripts/deploy_production.sh health
```

### **Ver logs:**
```powershell
# Todos los servicios
docker-compose -f docker-compose.prod.yml logs -f

# Servicio específico
docker logs mte_backend_prod --tail 50

# Logs de despliegue (Windows)
Get-Content .\logs\deployment_*.log -Tail 20
```

### **Crear backup:**
```powershell
# Windows
.\scripts\deploy_production.ps1 backup

# Linux/Mac
./scripts/deploy_production.sh backup

# Manual
docker exec mte_postgres_prod pg_dump -U mte_user mte_sive_prod > backup.sql
```

### **Rollback:**
```powershell
# Windows
.\scripts\deploy_production.ps1 rollback

# Linux/Mac
./scripts/deploy_production.sh rollback
```

## 🔧 **Configuración Previa**

### **1. Requisitos del Sistema**

#### **Windows:**
- **Docker Desktop**: Versión 20.10 o superior
- **Docker Compose**: Incluido con Docker Desktop
- **OpenSSL**: Para certificados SSL (descargar desde https://slproweb.com/products/Win32OpenSSL.html)
- **PowerShell**: 5.1 o superior
- **RAM**: 4GB mínimo, 8GB recomendado
- **Almacenamiento**: 20GB mínimo

#### **Linux/Mac:**
- **Docker**: Versión 20.10 o superior
- **Docker Compose**: Versión 2.0 o superior
- **OpenSSL**: Para certificados SSL
- **RAM**: 4GB mínimo, 8GB recomendado
- **Almacenamiento**: 20GB mínimo

### **2. Variables de Entorno:**
```bash
# Copiar archivo de ejemplo
cp env.example .env

# Editar configuraciones
notepad .env  # Windows
nano .env     # Linux/Mac
```

### **3. Variables Importantes:**
```bash
# Configuración de Django
DEBUG=False
SECRET_KEY=tu_clave_secreta_muy_segura
ALLOWED_HOSTS=tu-dominio.com,IP_DEL_SERVIDOR

# Base de datos
name_db=mte_sive_prod
user_postgres=mte_user
password_user_postgres=password_seguro

# Redis
REDIS_PASSWORD=password_seguro_redis

# SCADA
SCADA_BASE_URL=http://192.68.185.76:3700
SCADA_USERNAME=tu_usuario
SCADA_PASSWORD=tu_password

# Puertos personalizados
FRONTEND_PORT=3503
BACKEND_PORT=3504

# URLs para el frontend
REACT_APP_API_URL=http://tu-dominio.com:3504
REACT_APP_FRONTEND_URL=http://tu-dominio.com:3503

# Configuración de CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3503,http://127.0.0.1:3503
```

### **4. Política de Ejecución de PowerShell (Windows):**
```powershell
# Verificar política actual
Get-ExecutionPolicy

# Cambiar política temporalmente (solo para esta sesión)
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# O cambiar permanentemente (requiere admin)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 🌐 **URLs de Acceso**

### **Desarrollo:**
- **Frontend**: http://localhost:3503
- **Backend**: http://localhost:3504
- **Admin**: http://localhost:3504/admin

### **Producción:**
- **HTTP**: http://tu-dominio.com
- **HTTPS**: https://tu-dominio.com (si SSL está configurado)
- **Frontend directo**: http://tu-dominio.com:3503
- **Backend directo**: http://tu-dominio.com:3504
- **Admin**: http://tu-dominio.com/admin
- **API**: http://tu-dominio.com/api/schema/swagger-ui/

## 🛠️ **Solución de Problemas**

### **Error: "Docker is not running"**
```powershell
# Windows - Iniciar Docker Desktop
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Linux/Mac
sudo systemctl restart docker
```

### **Error: "OpenSSL not found"**
1. Instalar OpenSSL desde el enlace proporcionado
2. Agregar al PATH del sistema
3. Reiniciar PowerShell/Terminal

### **Error: "Execution Policy" (Windows)**
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

### **Error: Puerto en uso**
```powershell
# Verificar puertos
netstat -an | findstr :3503    # Windows
netstat -an | findstr :3504    # Windows
netstat -tulpn | grep :3503    # Linux/Mac
netstat -tulpn | grep :3504    # Linux/Mac

# Detener servicios
Stop-Service -Name "W3SVC" -Force  # Windows (IIS)
sudo systemctl stop apache2        # Linux (Apache)
docker-compose -f docker-compose.prod.yml down
```

### **Error: Permisos**
```bash
# Linux/Mac
chmod +x scripts/*.sh
sudo chown -R $USER:$USER .

# Windows
# Ejecutar PowerShell como Administrador
```

### **Verificar Logs**
```powershell
# Windows - Logs de despliegue
Get-ChildItem .\logs\ | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | Get-Content -Tail 50

# Logs de Docker
docker-compose -f docker-compose.prod.yml logs
docker-compose -f docker-compose.prod.yml logs backend
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

# Ver contenedores
docker ps
docker-compose -f docker-compose.prod.yml ps
```

### **Backup y Restore:**
```powershell
# Crear backup manual
.\scripts\deploy_production.ps1 backup  # Windows
./scripts/deploy_production.sh backup   # Linux/Mac

# Ver backups disponibles
Get-ChildItem .\backups\  # Windows
ls -la backups/           # Linux/Mac

# Rollback manual
.\scripts\deploy_production.ps1 rollback  # Windows
./scripts/deploy_production.sh rollback   # Linux/Mac
```

## 🔄 **Actualización de la Aplicación**

### **Proceso de actualización:**
```bash
# 1. Hacer backup
.\scripts\deploy_production.ps1 backup  # Windows
./scripts/deploy_production.sh backup   # Linux/Mac

# 2. Actualizar código
git pull

# 3. Redesplegar
.\scripts\deploy_production.ps1 deploy  # Windows
./scripts/deploy_production.sh deploy   # Linux/Mac
```

## 📝 **Notas Importantes**

1. **Puertos**: Asegúrate de que los puertos 3503 y 3504 estén disponibles
2. **Firewall**: Configura el firewall para permitir estos puertos
3. **SSL**: Los certificados son auto-firmados, el navegador mostrará advertencias
4. **Logs**: Los logs se guardan en `.\logs\` con timestamp
5. **Backups**: Los backups se guardan en `.\backups\` con timestamp
6. **Requisitos**: Usa `test_windows_deployment.ps1` para verificar el sistema

## 📞 **Soporte**

Si tienes problemas con los scripts:

1. **Verifica los requisitos:** Ejecuta `test_windows_deployment.ps1` (Windows)
2. **Revisa los logs:** `docker-compose -f docker-compose.prod.yml logs -f`
3. **Verifica Docker:** `docker --version` y `docker-compose --version`
4. **Revisa variables:** Asegúrate de que `.env` esté configurado correctamente
5. **Verifica puertos:** Asegúrate de que los puertos estén disponibles

¡Los scripts están listos para usar! 🚀