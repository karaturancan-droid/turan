param(
  [string]$DataPath = 'C:\ZirveflowData',
  [string]$BackupPath = 'C:\ZirveflowBackups',
  [string]$ProjectPath = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$compose = Join-Path $ProjectPath 'docker-compose.local.yml'
if (-not (Test-Path $compose)) { throw "docker-compose.local.yml bulunamadı: $compose" }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker Desktop kurulu veya PATH üzerinde değil.' }
$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop çalışmıyor. Docker Desktop uygulamasını başlatın.' }

New-Item -ItemType Directory -Force -Path $DataPath, $BackupPath | Out-Null
icacls $DataPath /inheritance:r /grant:r 'SYSTEM:(OI)(CI)F' 'Administrators:(OI)(CI)F' | Out-Null
icacls $BackupPath /inheritance:r /grant:r 'SYSTEM:(OI)(CI)F' 'Administrators:(OI)(CI)F' | Out-Null

$envFile = Join-Path $ProjectPath '.env.local-server'
if (-not (Test-Path $envFile)) {
  $dbPassword = [Convert]::ToBase64String((1..24 | ForEach-Object { Get-Random -Maximum 256 }))
  $authSecret = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
  @("DATA_PATH=$($DataPath -replace '\\','/')", "POSTGRES_PASSWORD=$dbPassword", "BETTER_AUTH_SECRET=$authSecret", 'POSTGRES_DB=zirveflow', 'POSTGRES_USER=zirveflow', 'HTTP_PORT=8080') | Set-Content -Path $envFile -Encoding utf8
  icacls $envFile /inheritance:r /grant:r 'SYSTEM:F' 'Administrators:F' | Out-Null
}

Push-Location $ProjectPath
try {
  docker compose --env-file $envFile -f $compose up -d
  docker compose --env-file $envFile -f $compose ps
} finally { Pop-Location }

Write-Host 'Zirveflow yerel sunucusu hazır.'
Write-Host 'LAN adresi: http://<BU-BILGISAYAR-IP>:8080'
Write-Host "Veri klasörü: $DataPath"
Write-Host "Yedek klasörü: $BackupPath"
Write-Host 'Mevcut volume ve veriler korunur. Kaldırma için docker compose down kullanın; volume silmeyin.'
