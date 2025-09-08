# Script para desplegar MTE Lumen App en Producción (Windows)
# Uso: .\deploy_production_fixed.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "DESPLIEGUE DE PRODUCCIÓN - MTE LUMEN APP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Verificar Docker
Write-Host "🔍 Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker instalado: $dockerVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker no está instalado. Por favor instala Docker Desktop primero." -ForegroundColor Red
    exit 1
}

# Verificar Docker Compose
try {
    $composeVersion = docker-compose --version
    Write-Host "✅ Docker Compose instalado: $composeVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker Compose no está instalado." -ForegroundColor Red
    exit 1
}

# Verificar archivo .env
if (-not (Test-Path ".env")) {
    Write-Host "❌ Archivo .env no encontrado" -ForegroundColor Red
    Write-Host "📝 Creando archivo .env desde env.example..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "✅ Archivo .env creado. Por favor edítalo con tus configuraciones." -ForegroundColor Green
    Write-Host "   notepad .env" -ForegroundColor Cyan
    exit 1
}
Write-Host "✅ Archivo .env encontrado" -ForegroundColor Green

# Crear directorios necesarios
Write-Host "📁 Creando directorios necesarios..." -ForegroundColor Yellow
$directories = @("logs", "media\avatars", "static", "reports", "backups", "ssl")
foreach ($dir in $directories) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}
Write-Host "✅ Directorios creados" -ForegroundColor Green

# Crear certificados SSL si no existen
if (-not (Test-Path "ssl\cert.pem") -or -not (Test-Path "ssl\key.pem")) {
    Write-Host "🔐 Creando certificados SSL autofirmados..." -ForegroundColor Yellow
    
    # Verificar OpenSSL
    $opensslAvailable = $false
    try {
        $null = openssl version
        $opensslAvailable = $true
    }
    catch {
        Write-Host "⚠️  OpenSSL no está disponible. Continuando sin SSL..." -ForegroundColor Yellow
    }
    
    if ($opensslAvailable) {
        try {
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl\key.pem -out ssl\cert.pem -subj "/C=CO/ST=Bogota/L=Bogota/O=MTE/OU=IT/CN=localhost"
            Write-Host "✅ Certificados SSL creados con OpenSSL" -ForegroundColor Green
        }
        catch {
            Write-Host "⚠️  Error creando certificados con OpenSSL. Continuando sin SSL..." -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "⚠️  OpenSSL no disponible. La aplicación funcionará solo con HTTP." -ForegroundColor Yellow
        Write-Host "   Para HTTPS, instala OpenSSL o proporciona certificados manualmente." -ForegroundColor Cyan
    }
}
else {
    Write-Host "✅ Certificados SSL encontrados" -ForegroundColor Green
}

# Construir imágenes
Write-Host "🔨 Construyendo imágenes Docker..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al construir las imágenes Docker" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Imágenes construidas correctamente" -ForegroundColor Green

# Detener servicios existentes
Write-Host "🛑 Deteniendo servicios existentes..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down

# Iniciar servicios
Write-Host "🚀 Iniciando servicios de producción..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al iniciar los servicios" -ForegroundColor Red
    exit 1
}

# Esperar que los servicios estén listos
Write-Host "⏳ Esperando que los servicios estén listos..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Ejecutar migraciones
Write-Host "📊 Ejecutando migraciones de base de datos..." -ForegroundColor Yellow
docker exec mte_backend_prod python manage.py migrate

# Recopilar archivos estáticos
Write-Host "📦 Recopilando archivos estáticos..." -ForegroundColor Yellow
docker exec mte_backend_prod python manage.py collectstatic --noinput

# Verificar estado de servicios
Write-Host "🔍 Verificando estado de servicios..." -ForegroundColor Yellow
$containers = docker-compose -f docker-compose.prod.yml ps -q
$allHealthy = $true

foreach ($container in $containers) {
    $name = docker inspect --format='{{.Name}}' $container | ForEach-Object { $_ -replace '/', '' }
    $status = docker inspect --format='{{.State.Status}}' $container
    
    if ($status -eq "running") {
        Write-Host "✅ $name está ejecutándose" -ForegroundColor Green
    }
    else {
        Write-Host "❌ $name no está ejecutándose (Estado: $status)" -ForegroundColor Red
        $allHealthy = $false
    }
}

# Limpiar imágenes antiguas
Write-Host "🧹 Limpiando imágenes Docker antiguas..." -ForegroundColor Yellow
docker image prune -f

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ DESPLIEGUE COMPLETADO" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

if ($allHealthy) {
    Write-Host "🎉 Todos los servicios están funcionando!" -ForegroundColor Green
}
else {
    Write-Host "⚠️  Algunos servicios pueden tener problemas. Revisa los logs." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🌐 URLs de acceso:" -ForegroundColor Cyan
Write-Host "   HTTP:  http://localhost" -ForegroundColor White
Write-Host "   HTTPS: https://localhost (si SSL está configurado)" -ForegroundColor White
Write-Host "   Admin: http://localhost/admin" -ForegroundColor White
Write-Host "   API:   http://localhost/api/schema/swagger-ui/" -ForegroundColor White
Write-Host ""
Write-Host "📋 Comandos útiles:" -ForegroundColor Yellow
Write-Host "   Ver logs: docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor White
Write-Host "   Detener: docker-compose -f docker-compose.prod.yml down" -ForegroundColor White
Write-Host "   Estado: docker-compose -f docker-compose.prod.yml ps" -ForegroundColor White
Write-Host "   Crear superusuario: docker exec -it mte_backend_prod python manage.py createsuperuser" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
