# =============================================================
# ENSANA — JEDEN SKRIPT NA VSE
# Pravym tlacitkem -> Spustit v PowerShellu (nebo v terminalu: .\go.ps1)
# =============================================================

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "`n  ENSANA — kompletni setup`n" -ForegroundColor Magenta

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "CHYBA: Nainstaluj Node.js z https://nodejs.org (LTS .msi) a spust go.ps1 znovu." -ForegroundColor Red
    pause
    exit 1
}

$pg = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Running" }
if (-not $pg) {
    Write-Host "PostgreSQL neni - instaluji automaticky..." -ForegroundColor Cyan
    & "$PSScriptRoot\scripts\install-postgres.ps1"
}

& "$PSScriptRoot\setup.ps1"
