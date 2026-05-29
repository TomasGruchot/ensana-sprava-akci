# =============================================================
# ENSANA — RYCHLA AKTUALIZACE (po git pull)
# =============================================================

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host "`n  === ENSANA UPDATE ===" -ForegroundColor Magenta

Set-Location $ProjectRoot

Write-Host "`n>>> npm install" -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "CHYBA: npm install" -ForegroundColor Red; exit 1 }

Write-Host "`n>>> db:push (schema)" -ForegroundColor Cyan
npm run db:push
if ($LASTEXITCODE -ne 0) { Write-Host "CHYBA: db:push" -ForegroundColor Red; exit 1 }

Write-Host "`n>>> build" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "CHYBA: build" -ForegroundColor Red; exit 1 }

Write-Host "`n>>> pm2 restart" -ForegroundColor Cyan
pm2 restart ensana
if ($LASTEXITCODE -ne 0) { Write-Host "CHYBA: pm2 restart" -ForegroundColor Red; exit 1 }

Write-Host "`n  Aktualizace hotova!`n" -ForegroundColor Green
