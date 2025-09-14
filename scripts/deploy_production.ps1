# ================================
# MTE SIVE - Production Deployment Script (Windows PowerShell)
# ================================

param(
    [Parameter(Position=0)]
    [ValidateSet("deploy", "health", "rollback", "backup", "ssl", "help")]
    [string]$Command = "help"
)

# Configuration
$PROJECT_NAME = "mte-sive"
$ENV_FILE = ".env"
$BACKUP_DIR = ".\backups"
$LOG_DIR = ".\logs"
$DEPLOYMENT_LOG = "$LOG_DIR\deployment_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

# Get server IP from .env or use default
$SERVER_IP = ""
if (Test-Path $ENV_FILE) {
    $envContent = Get-Content $ENV_FILE
    $domainLine = $envContent | Where-Object { $_ -match "^DOMAIN_NAME=" }
    if ($domainLine) {
        $SERVER_IP = ($domainLine -split "=")[1].Trim()
    }
}

if (-not $SERVER_IP) {
    Write-LogError "DOMAIN_NAME not found in .env file. Please set DOMAIN_NAME in your .env file."
    exit 1
}

# Functions
function Write-LogInfo {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [INFO] $Message"
    Write-Host $logMessage -ForegroundColor Blue
    Add-Content -Path $DEPLOYMENT_LOG -Value $logMessage
}

function Write-LogSuccess {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [SUCCESS] $Message"
    Write-Host $logMessage -ForegroundColor Green
    Add-Content -Path $DEPLOYMENT_LOG -Value $logMessage
}

function Write-LogWarning {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [WARNING] $Message"
    Write-Host $logMessage -ForegroundColor Yellow
    Add-Content -Path $DEPLOYMENT_LOG -Value $logMessage
}

function Write-LogError {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [ERROR] $Message"
    Write-Host $logMessage -ForegroundColor Red
    Add-Content -Path $DEPLOYMENT_LOG -Value $logMessage
}

# Pre-deployment checks
function Test-PreDeploymentChecks {
    Write-LogInfo "Running pre-deployment checks..."
    
    # Check if .env file exists
    if (-not (Test-Path $ENV_FILE)) {
        Write-LogError ".env file not found. Please create it from env.example"
        exit 1
    }
    
    # Check if Docker is running
    try {
        docker info | Out-Null
    }
    catch {
        Write-LogError "Docker is not running. Please start Docker first."
        exit 1
    }
    
    # Check if docker-compose is available
    try {
        docker-compose --version | Out-Null
    }
    catch {
        Write-LogError "docker-compose is not installed or not in PATH"
        exit 1
    }
    
    # Check SSL certificates for production
    if (-not (Test-Path ".\ssl") -or -not (Test-Path ".\ssl\cert.pem") -or -not (Test-Path ".\ssl\key.pem")) {
        Write-LogWarning "SSL certificates not found. Creating self-signed certificates..."
        New-SSLCertificates
    }
    
    # Check disk space (at least 5GB free for production)
    $drive = (Get-Location).Drive
    $freeSpace = (Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='$($drive.Name)'").FreeSpace
    $freeSpaceGB = [math]::Round($freeSpace / 1GB, 2)
    
    if ($freeSpaceGB -lt 5) {
        Write-LogWarning "Low disk space. At least 5GB recommended for production deployment. Available: $freeSpaceGB GB"
    }
    
    Write-LogSuccess "Pre-deployment checks passed"
    Write-LogInfo "Using server IP: $SERVER_IP"
}

# Create SSL certificates
function New-SSLCertificates {
    Write-LogInfo "Creating SSL certificates for $SERVER_IP..."
    
    # Create ssl directory
    if (-not (Test-Path ".\ssl")) {
        New-Item -ItemType Directory -Path ".\ssl" | Out-Null
    }
    
    # Check if OpenSSL is available
    try {
        openssl version | Out-Null
    }
    catch {
        Write-LogError "OpenSSL is not installed or not in PATH. Please install OpenSSL first."
        Write-LogInfo "You can download OpenSSL from: https://slproweb.com/products/Win32OpenSSL.html"
        exit 1
    }
    
    # Generate self-signed certificate with server IP
    $opensslCmd = "openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl\key.pem -out ssl\cert.pem -subj `/`"C=CO/ST=Bogota/L=Bogota/O=MTE/OU=IT/CN=$SERVER_IP`/`""
    
    try {
        Invoke-Expression $opensslCmd
        Write-LogSuccess "SSL certificates created for $SERVER_IP"
    }
    catch {
        Write-LogError "Failed to create SSL certificates: $_"
        exit 1
    }
}

# Create backup before deployment
function New-Backup {
    Write-LogInfo "Creating backup before deployment..."
    
    # Create backup directory
    if (-not (Test-Path $BACKUP_DIR)) {
        New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
    }
    
    # Backup database
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "$BACKUP_DIR\pre_deploy_backup_$timestamp.sql"
    
    # Get database credentials from .env
    $envContent = Get-Content $ENV_FILE
    $userPostgres = ($envContent | Where-Object { $_ -match "^user_postgres=" } | ForEach-Object { ($_ -split "=")[1].Trim() }) -join ""
    $nameDb = ($envContent | Where-Object { $_ -match "^name_db=" } | ForEach-Object { ($_ -split "=")[1].Trim() }) -join ""
    
    if ([string]::IsNullOrEmpty($userPostgres)) { $userPostgres = "BuraHub" }
    if ([string]::IsNullOrEmpty($nameDb)) { $nameDb = "sive_db" }
    
    try {
        docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U $userPostgres $nameDb | Out-File -FilePath $backupFile -Encoding UTF8
        Write-LogSuccess "Database backup created: $backupFile"
    }
    catch {
        Write-LogWarning "Could not create database backup (database might not be running): $_"
    }
    
    # Backup media files
    if (Test-Path ".\media") {
        $mediaBackup = "$BACKUP_DIR\media_backup_$timestamp.zip"
        Compress-Archive -Path ".\media\*" -DestinationPath $mediaBackup -Force
        Write-LogSuccess "Media files backup created: $mediaBackup"
    }
}

# Pull latest images
function Invoke-PullImages {
    Write-LogInfo "Checking for latest Docker images..."
    try {
        # Pull only external images (postgres, redis) silently, ignore local build warnings
        docker-compose -f docker-compose.prod.yml pull --quiet 2>$null
        Write-LogSuccess "External images updated successfully"
    }
    catch {
        Write-LogInfo "Some images will be built locally (this is normal for custom images)"
    }
}

# Build new images
function Invoke-BuildImages {
    Write-LogInfo "Building new Docker images..."
    try {
        docker-compose -f docker-compose.prod.yml build --no-cache
        Write-LogSuccess "Images built successfully"
    }
    catch {
        Write-LogError "Failed to build images: $_"
        exit 1
    }
}

# Run database migrations
function Invoke-RunMigrations {
    Write-LogInfo "Running database migrations..."
    try {
        docker-compose -f docker-compose.prod.yml exec -T backend python manage.py migrate
        Write-LogSuccess "Migrations completed successfully"
    }
    catch {
        Write-LogError "Failed to run migrations: $_"
        exit 1
    }
}

# Collect static files
function Invoke-CollectStatic {
    Write-LogInfo "Collecting static files..."
    try {
        docker-compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput
        Write-LogSuccess "Static files collected successfully"
    }
    catch {
        Write-LogError "Failed to collect static files: $_"
        exit 1
    }
}

# Deploy services
function Invoke-DeployServices {
    Write-LogInfo "Deploying services..."
    
    try {
        # Stop existing services
        docker-compose -f docker-compose.prod.yml down
        
        # Start new services
        docker-compose -f docker-compose.prod.yml up -d
        
        # Wait for services to be healthy
        Write-LogInfo "Waiting for services to be healthy..."
        Start-Sleep -Seconds 45
        
        # Check health
        if (Test-HealthCheck) {
            Write-LogSuccess "Services deployed successfully"
        }
        else {
            Write-LogError "Some services are not healthy after deployment"
            Invoke-Rollback
            exit 1
        }
    }
    catch {
        Write-LogError "Failed to deploy services: $_"
        Invoke-Rollback
        exit 1
    }
}

# Health check
function Test-HealthCheck {
    Write-LogInfo "Performing health checks..."
    
    # Check if all containers are running
    $containers = docker-compose -f docker-compose.prod.yml ps -q
    $allHealthy = $true
    
    foreach ($container in $containers) {
        $name = docker inspect --format='{{.Name}}' $container | ForEach-Object { $_.TrimStart('/') }
        $status = docker inspect --format='{{.State.Status}}' $container
        
        if ($status -ne "running") {
            Write-LogError "$name is not running"
            $allHealthy = $false
        }
        else {
            Write-LogSuccess "$name is running"
        }
    }
    
    # Check direct ports (Nginx eliminado)
    try {
        $frontendPort = if ($env:FRONTEND_PORT) { $env:FRONTEND_PORT } else { "3503" }
        $domainName = if ($env:DOMAIN_NAME) { $env:DOMAIN_NAME } else { $SERVER_IP }
        $response = Invoke-WebRequest -Uri "http://$domainName`:$frontendPort" -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-LogSuccess "Frontend direct port ($frontendPort) is working"
        }
    }
    catch {
        Write-LogError "Frontend not accessible on port $frontendPort"
        $allHealthy = $false
    }
    
    try {
        $backendPort = if ($env:BACKEND_PORT) { $env:BACKEND_PORT } else { "3504" }
        $domainName = if ($env:DOMAIN_NAME) { $env:DOMAIN_NAME } else { $SERVER_IP }
        $response = Invoke-WebRequest -Uri "http://$domainName`:$backendPort/health/" -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-LogSuccess "Backend direct port ($backendPort) is working"
        }
    }
    catch {
        Write-LogError "Backend not accessible on port $backendPort"
        $allHealthy = $false
    }
    
    return $allHealthy
}

# Rollback function
function Invoke-Rollback {
    Write-LogWarning "Rolling back deployment..."
    
    try {
        # Stop current services
        docker-compose -f docker-compose.prod.yml down
        
        # Restore from backup if available
        $latestBackup = Get-ChildItem -Path "$BACKUP_DIR\pre_deploy_backup_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        
        if ($latestBackup) {
            Write-LogInfo "Restoring database from backup: $($latestBackup.Name)"
            
            # Get database credentials from .env
            $envContent = Get-Content $ENV_FILE
            $userPostgres = ($envContent | Where-Object { $_ -match "^user_postgres=" } | ForEach-Object { ($_ -split "=")[1].Trim() }) -join ""
            $nameDb = ($envContent | Where-Object { $_ -match "^name_db=" } | ForEach-Object { ($_ -split "=")[1].Trim() }) -join ""
            
            if ([string]::IsNullOrEmpty($userPostgres)) { $userPostgres = "BuraHub" }
            if ([string]::IsNullOrEmpty($nameDb)) { $nameDb = "sive_db" }
            
            docker-compose -f docker-compose.prod.yml up -d db
            Start-Sleep -Seconds 10
            Get-Content $latestBackup.FullName | docker-compose -f docker-compose.prod.yml exec -T db psql -U $userPostgres -d $nameDb
        }
        
        # Start previous version
        docker-compose -f docker-compose.prod.yml up -d
        
        Write-LogWarning "Rollback completed"
    }
    catch {
        Write-LogError "Rollback failed: $_"
    }
}

# Post-deployment tasks
function Invoke-PostDeployment {
    Write-LogInfo "Running post-deployment tasks..."
    
    try {
        # Clear cache
        docker-compose -f docker-compose.prod.yml exec -T backend python manage.py clear_cache 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-LogWarning "Cache clear command not available"
        }
        
        # Restart Celery workers
        docker-compose -f docker-compose.prod.yml restart celery_worker celery_beat
        
        Write-LogSuccess "Post-deployment tasks completed"
    }
    catch {
        Write-LogWarning "Some post-deployment tasks failed: $_"
    }
}

# Cleanup old images
function Invoke-Cleanup {
    Write-LogInfo "Cleaning up old Docker images..."
    try {
        docker image prune -f
        Write-LogSuccess "Cleanup completed"
    }
    catch {
        Write-LogWarning "Cleanup failed: $_"
    }
}

# Main deployment function
function Invoke-Deploy {
    Write-LogInfo "Starting production deployment process..."
    Write-LogInfo "Deployment log: $DEPLOYMENT_LOG"
    Write-LogInfo "Target server: $SERVER_IP"
    
    # Create log directory
    if (-not (Test-Path $LOG_DIR)) {
        New-Item -ItemType Directory -Path $LOG_DIR | Out-Null
    }
    
    # Run deployment steps
    Test-PreDeploymentChecks
    New-Backup
    Invoke-PullImages
    Invoke-BuildImages
    Invoke-DeployServices
    Invoke-RunMigrations
    Invoke-CollectStatic
    Invoke-PostDeployment
    Invoke-Cleanup
    
    Write-LogSuccess "Production deployment completed successfully!"
    Write-LogInfo "Application is available at:"
    $frontendPort = if ($env:FRONTEND_PORT) { $env:FRONTEND_PORT } else { "3503" }
    $backendPort = if ($env:BACKEND_PORT) { $env:BACKEND_PORT } else { "3504" }
    $domainName = if ($env:DOMAIN_NAME) { $env:DOMAIN_NAME } else { $SERVER_IP }
    Write-LogInfo "  Frontend: http://$domainName`:$frontendPort"
    Write-LogInfo "  Backend:  http://$domainName`:$backendPort"
    Write-LogInfo ""
    Write-LogInfo "Admin panel: http://$domainName`:$backendPort/admin"
    Write-LogInfo "API docs: http://$domainName`:$backendPort/docs/"
}

# Show help
function Show-Help {
    Write-Host "MTE SIVE Production Deployment Script (Windows PowerShell)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\deploy_production.ps1 [COMMAND]" -ForegroundColor White
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Yellow
    Write-Host "  deploy          Full production deployment process" -ForegroundColor White
    Write-Host "  health          Check service health" -ForegroundColor White
    Write-Host "  rollback        Rollback to previous version" -ForegroundColor White
    Write-Host "  backup          Create backup only" -ForegroundColor White
    Write-Host "  ssl             Create SSL certificates" -ForegroundColor White
    Write-Host "  help            Show this help message" -ForegroundColor White
    Write-Host ""
    Write-Host "Environment variables:" -ForegroundColor Yellow
    Write-Host "  DOMAIN_NAME     Domain name for the application (default: localhost)" -ForegroundColor White
    Write-Host "  FRONTEND_PORT   Frontend port (default: 3503)" -ForegroundColor White
    Write-Host "  BACKEND_PORT    Backend port (default: 3504)" -ForegroundColor White
    Write-Host "  user_postgres   PostgreSQL username (default: BuraHub)" -ForegroundColor White
    Write-Host "  name_db         Database name (default: sive_db)" -ForegroundColor White
    Write-Host ""
    Write-Host "Current server IP: $SERVER_IP" -ForegroundColor Green
}

# Main script logic
switch ($Command) {
    "deploy" {
        Invoke-Deploy
    }
    "health" {
        Test-HealthCheck
    }
    "rollback" {
        Invoke-Rollback
    }
    "backup" {
        New-Backup
    }
    "ssl" {
        New-SSLCertificates
    }
    "help" {
        Show-Help
    }
    default {
        Show-Help
    }
}