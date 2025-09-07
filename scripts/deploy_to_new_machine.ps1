# Script para desplegar MTE Lumen App en una nueva máquina (Windows)
# Uso: .\deploy_to_new_machine.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "DESPLIEGUE DE MTE LUMEN APP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Verificar que Docker esté instalado
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker instalado: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker no está instalado. Por favor instala Docker Desktop primero." -ForegroundColor Red
    exit 1
}

try {
    $composeVersion = docker-compose --version
    Write-Host "✅ Docker Compose instalado: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose no está instalado. Por favor instala Docker Compose primero." -ForegroundColor Red
    exit 1
}

# Verificar que existe el archivo .env
if (-not (Test-Path ".env")) {
    Write-Host "❌ Archivo .env no encontrado" -ForegroundColor Red
    Write-Host "📝 Por favor crea el archivo .env basándote en env.example:" -ForegroundColor Yellow
    Write-Host "   Copy-Item env.example .env" -ForegroundColor Yellow
    Write-Host "   notepad .env  # Edita las variables necesarias" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Archivo .env encontrado" -ForegroundColor Green

# Crear directorios necesarios
Write-Host "📁 Creando directorios necesarios..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "logs" | Out-Null
New-Item -ItemType Directory -Force -Path "media\avatars" | Out-Null
New-Item -ItemType Directory -Force -Path "static" | Out-Null
New-Item -ItemType Directory -Force -Path "reports" | Out-Null

# Construir las imágenes
Write-Host "🔨 Construyendo imágenes Docker..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al construir las imágenes Docker" -ForegroundColor Red
    exit 1
}

# Iniciar los servicios
Write-Host "🚀 Iniciando servicios..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al iniciar los servicios" -ForegroundColor Red
    exit 1
}

# Esperar a que la base de datos esté lista
Write-Host "⏳ Esperando a que la base de datos esté lista..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Ejecutar migraciones
Write-Host "📊 Ejecutando migraciones..." -ForegroundColor Yellow
docker exec mte_backend_local python manage.py migrate

# Crear superusuario
Write-Host "👤 Creando superusuario..." -ForegroundColor Yellow
Write-Host "Por favor ingresa los datos del superusuario:" -ForegroundColor Cyan
docker exec -it mte_backend_local python manage.py createsuperuser

# Recopilar archivos estáticos
Write-Host "📦 Recopilando archivos estáticos..." -ForegroundColor Yellow
docker exec mte_backend_local python manage.py collectstatic --noinput

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ DESPLIEGUE COMPLETADO" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "🔧 Backend API: http://localhost:8000" -ForegroundColor Green
Write-Host "📚 Admin Panel: http://localhost:8000/admin" -ForegroundColor Green
Write-Host "📖 Swagger API: http://localhost:8000/api/schema/swagger-ui/" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Comandos útiles:" -ForegroundColor Yellow
Write-Host "   Ver logs: docker-compose -f docker-compose.local.yml logs -f" -ForegroundColor White
Write-Host "   Detener: docker-compose -f docker-compose.local.yml down" -ForegroundColor White
Write-Host "   Reiniciar: docker-compose -f docker-compose.local.yml restart" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
