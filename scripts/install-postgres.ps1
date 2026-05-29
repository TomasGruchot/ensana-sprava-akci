# Nainstaluje PostgreSQL 17 bez GUI (heslo: Ensana2026!)
$ErrorActionPreference = "Stop"
$pwd = "Ensana2026!"
$port = 5432
$installer = Join-Path $env:TEMP "postgresql-17-installer.exe"
$url = "https://get.enterprisedb.com/postgresql/postgresql-17.10-1-windows-x64.exe"

$svc = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Running" }
if ($svc) {
    Write-Host "PostgreSQL uz bezi: $($svc.Name)" -ForegroundColor Green
    exit 0
}

if (-not (Test-Path $installer)) {
    Write-Host "Stahuji PostgreSQL (356 MB, chvili to trva)..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $url -OutFile $installer -UseBasicParsing
}

Write-Host "Instaluji PostgreSQL (tichy rezim)..." -ForegroundColor Cyan
$args = @(
    "--mode", "unattended",
    "--unattendedmodeui", "none",
    "--superpassword", $pwd,
    "--servicename", "postgresql-x64-17",
    "--servicepassword", $pwd,
    "--serverport", "$port"
)
Write-Host "Potrebna opravneni spravce (UAC) - potvrd dialog." -ForegroundColor Yellow
Start-Process -FilePath $installer -ArgumentList $args -Wait -Verb RunAs

Start-Sleep -Seconds 5
$svc = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Running" }
if ($svc) {
    Write-Host "PostgreSQL nainstalovan a bezi." -ForegroundColor Green
} else {
    Write-Host "PostgreSQL nainstalovan, spoustim sluzbu..." -ForegroundColor Yellow
    Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Start-Service
}
