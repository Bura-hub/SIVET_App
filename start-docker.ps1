# Script de inicio rápido para Docker en Windows
# MTE Lumen App

param(
    [switch]$Build,
    [switch]$Help
)

if ($Help) {
    Write-Host "🐳 MTE Lumen App - Docker Setup para Windows" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Uso:" -ForegroundColor Yellow
    Write-Host "  .\start-docker.ps1              # Iniciar servicios"
    Write-Host "  .\start-docker.ps1 -Build       # Construir e iniciar servicios"
    Write-Host "  .\start-docker.ps1 -Help        # Mostrar esta ayuda"
    Write-Host ""
    Write-Host "Comandos útiles:" -ForegroundColor Yellow
    Write-Host "  docker-compose ps               # Ver estado de servicios"
    Write-Host "  docker-compose logs -f          # Ver logs en tiempo real"
    Write-Host "  docker-compose down             # Detener servicios"
    Write-Host "  docker-compose restart          # Reiniciar servicios"
    exit 0
}

Write-Host "🚀 Iniciando MTE Lumen App con Docker..." -ForegroundColor Green

# Función para imprimir mensajes
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Verificar que Docker esté ejecutándose
function Test-Docker {
    try {
        docker info | Out-Null
        Write-Success "Docker está ejecutándose"
        return $true
    }
    catch {
        Write-Error "Docker no está ejecutándose. Por favor, inicia Docker Desktop."
        return $false
    }
}

# Verificar que docker-compose esté disponible
function Test-DockerCompose {
    try {
        docker-compose --version | Out-Null
        Write-Success "docker-compose está disponible"
        return $true
    }
    catch {
        Write-Error "docker-compose no está instalado o no está en el PATH"
        return $false
    }
}

# Verificar archivo .env
function Test-EnvFile {
    if (Test-Path ".env") {
        Write-Success "Archivo .env encontrado"
        return $true
    }
    else {
        Write-Warning "Archivo .env no encontrado"
        if (Test-Path "env.example") {
            Write-Info "Copiando env.example a .env..."
            Copy-Item "env.example" ".env"
            Write-Warning "Por favor, edita el archivo .env con tus configuraciones antes de continuar"
            Write-Info "Presiona Enter cuando hayas configurado el archivo .env..."
            Read-Host
            return $true
        }
        else {
            Write-Error "No se encontró env.example. Por favor, crea un archivo .env manualmente"
            return $false
        }
    }
}

# Construir imágenes
function Build-Images {
    Write-Info "Construyendo imágenes Docker..."
    try {
        docker-compose build
        Write-Success "Imágenes construidas exitosamente"
        return $true
    }
    catch {
        Write-Error "Error al construir las imágenes"
        return $false
    }
}

# Iniciar servicios
function Start-Services {
    Write-Info "Iniciando servicios..."
    try {
        docker-compose up -d
        
        # Esperar a que los servicios estén listos
        Write-Info "Esperando a que los servicios estén listos..."
        Start-Sleep -Seconds 10
        
        # Verificar estado de los servicios
        Test-ServicesStatus
        return $true
    }
    catch {
        Write-Error "Error al iniciar los servicios"
        return $false
    }
}

# Verificar estado de los servicios
function Test-ServicesStatus {
    Write-Info "Verificando estado de los servicios..."
    
    # Verificar PostgreSQL
    if (docker-compose ps postgres | Select-String "Up") {
        Write-Success "PostgreSQL está ejecutándose"
    }
    else {
        Write-Error "PostgreSQL no está ejecutándose"
    }
    
    # Verificar Redis
    if (docker-compose ps redis | Select-String "Up") {
        Write-Success "Redis está ejecutándose"
    }
    else {
        Write-Error "Redis no está ejecutándose"
    }
    
    # Verificar Backend
    if (docker-compose ps backend | Select-String "Up") {
        Write-Success "Backend Django está ejecutándose"
    }
    else {
        Write-Error "Backend Django no está ejecutándose"
    }
    
    # Verificar Frontend
    if (docker-compose ps frontend | Select-String "Up") {
        Write-Success "Frontend React está ejecutándose"
    }
    else {
        Write-Error "Frontend React no está ejecutándose"
    }
    
    # Verificar Celery Worker
    if (docker-compose ps celery_worker | Select-String "Up") {
        Write-Success "Celery Worker está ejecutándose"
    }
    else {
        Write-Error "Celery Worker no está ejecutándose"
    }
    
    # Verificar Celery Beat
    if (docker-compose ps celery_beat | Select-String "Up") {
        Write-Success "Celery Beat está ejecutándose"
    }
    else {
        Write-Error "Celery Beat no está ejecutándose"
    }
}

# Mostrar información de acceso
function Show-AccessInfo {
    Write-Host ""
    Write-Success "🎉 MTE Lumen App está ejecutándose!"
    Write-Host ""
    Write-Host "📱 Acceso a la aplicación:" -ForegroundColor Cyan
    Write-Host "   Frontend:     http://localhost:3000" -ForegroundColor White
    Write-Host "   Backend API:  http://localhost:8000" -ForegroundColor White
    Write-Host "   Admin Django: http://localhost:8000/admin/" -ForegroundColor White
    Write-Host "   API Schema:   http://localhost:8000/api/schema/" -ForegroundColor White
    Write-Host ""
    Write-Host "🗄️  Base de datos:" -ForegroundColor Cyan
    Write-Host "   PostgreSQL:   localhost:5432" -ForegroundColor White
    Write-Host "   Redis:        localhost:6379" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 Comandos útiles:" -ForegroundColor Cyan
    Write-Host "   Ver logs:     docker-compose logs -f" -ForegroundColor White
    Write-Host "   Detener:      docker-compose down" -ForegroundColor White
    Write-Host "   Reiniciar:    docker-compose restart" -ForegroundColor White
    Write-Host "   Estado:       docker-compose ps" -ForegroundColor White
    Write-Host ""
}

# Función principal
function Main {
    Write-Host "🐳 MTE Lumen App - Docker Setup para Windows" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Verificar prerrequisitos
    if (-not (Test-Docker)) { exit 1 }
    if (-not (Test-DockerCompose)) { exit 1 }
    if (-not (Test-EnvFile)) { exit 1 }
    
    # Construir imágenes si se solicita
    if ($Build) {
        if (-not (Build-Images)) { exit 1 }
    }
    
    # Iniciar servicios
    if (-not (Start-Services)) { exit 1 }
    
    Show-AccessInfo
}

# Ejecutar función principal
Main
