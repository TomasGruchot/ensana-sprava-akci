# =============================================================
# ENSANA — ONE-CLICK SETUP SKRIPT
# Spusť jako administrátor v PowerShell:
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
#   .\setup.ps1
# =============================================================

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

function Write-Step { param($msg) Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-Ok   { param($msg) Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "    CHYBA: $msg" -ForegroundColor Red; exit 1 }
function Write-Warn { param($msg) Write-Host "    UPOZORNENI: $msg" -ForegroundColor Yellow }

Write-Host @"

  ============================================
     ENSANA - Server Setup
  ============================================

"@ -ForegroundColor Magenta

# =============================================================
# KROK 1 - Kontrola prerekvizit
# =============================================================
Write-Step "Kontroluji prerekvizity..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Fail "Node.js neni nainstalovan. Stahni z https://nodejs.org (LTS, .msi) a spust setup.ps1 znovu."
}
Write-Ok "Node.js $(node --version)"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Fail "Docker neni nainstalovan. Stahni Docker Desktop z https://docker.com."
}
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) { throw }
} catch {
    Write-Fail "Docker Desktop nebezi. Spust Docker Desktop a zkus znovu."
}
Write-Ok "Docker bezi"

if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Step "Instaluji PM2..."
    npm install -g pm2
    npm install -g pm2-windows-startup
    Write-Ok "PM2 nainstalovan"
} else {
    Write-Ok "PM2 $(pm2 --version)"
}

if (-not (Get-Command caddy -ErrorAction SilentlyContinue)) {
    Write-Warn "Caddy neni v PATH. Aplikace pobezi na portu 3000."
    Write-Warn "Pro pristup na portu 80 stahni caddy.exe z https://caddyserver.com/download."
} else {
    Write-Ok "Caddy $(caddy version)"
}

# =============================================================
# KROK 2 - Kontrola .env souboru
# =============================================================
Write-Step "Kontroluji konfiguracni soubory..."

$dbEnvPath  = Join-Path $ProjectRoot "docker\postgres\.env"
$appEnvPath = Join-Path $ProjectRoot ".env"
$needsConfig = $false

if (-not (Test-Path $dbEnvPath)) {
    Copy-Item (Join-Path $ProjectRoot "docker\postgres\.env.example") $dbEnvPath
    Write-Warn "Vytvoren docker/postgres/.env - MUSIS vyplnit POSTGRES_PASSWORD!"
    $needsConfig = $true
} else {
    Write-Ok "docker/postgres/.env existuje"
}

if (-not (Test-Path $appEnvPath)) {
    Copy-Item (Join-Path $ProjectRoot ".env.example") $appEnvPath
    Write-Warn "Vytvoren .env - MUSIS ho vyplnit!"
    $needsConfig = $true
} else {
    Write-Ok ".env existuje"
}

if ($needsConfig) {
    Write-Host @"

  ====================================================
  ZASTAV SE A VYPLN KONFIGURACI:

  1. docker\postgres\.env
     - POSTGRES_PASSWORD (silne heslo databaze)

  2. .env
     - DATABASE_URL a DIRECT_URL (stejne heslo jako vyse)
     - ADMIN_EMAIL a ADMIN_PASSWORD (prvni prihlaseni)
     - UPLOADS_DIR (kam ukladat soubory)
     - NEXT_PUBLIC_APP_URL (http://IP-serveru)

  3. Spust setup.ps1 znovu
  ====================================================

"@ -ForegroundColor Yellow
    exit 0
}

if ((Get-Content $appEnvPath -Raw) -match "<<<") {
    Write-Fail ".env obsahuje nevyplnene hodnoty (<<<). Vypln je."
}
if ((Get-Content $dbEnvPath -Raw) -match "<<<") {
    Write-Fail "docker/postgres/.env obsahuje nevyplnene hodnoty (<<<). Vypln je."
}
Write-Ok "Konfigurace vypada v poradku"

# =============================================================
# KROK 3 - Spusteni PostgreSQL (Docker)
# =============================================================
Write-Step "Spoustim PostgreSQL (Docker Compose)..."

Set-Location (Join-Path $ProjectRoot "docker\postgres")
docker compose up -d
if ($LASTEXITCODE -ne 0) { Write-Fail "Docker Compose selhal." }

Write-Host "    Cekam na PostgreSQL..." -NoNewline
$attempts = 0
do {
    Start-Sleep -Seconds 2
    $attempts++
    Write-Host "." -NoNewline
    $health = docker inspect --format="{{.State.Health.Status}}" ensana-db 2>$null
} while ($health -ne "healthy" -and $attempts -lt 30)
if ($health -ne "healthy") {
    Write-Fail "`nPostgreSQL nenastartoval vcas. Zkontroluj: docker logs ensana-db"
}
Write-Host " OK" -ForegroundColor Green

Set-Location $ProjectRoot

# =============================================================
# KROK 4 - Instalace zavislosti
# =============================================================
Write-Step "Instaluji npm zavislosti..."
npm install
if ($LASTEXITCODE -ne 0) { Write-Fail "npm install selhal." }
Write-Ok "Zavislosti nainstalovany"

# =============================================================
# KROK 5 - Databazove schema + prvni admin
# =============================================================
Write-Step "Aplikuji databazove schema (Prisma)..."
npm run db:push
if ($LASTEXITCODE -ne 0) { Write-Fail "Prisma db:push selhal. Zkontroluj DATABASE_URL v .env." }
Write-Ok "Schema aplikovano"

Write-Step "Vytvarim prvniho IT admina a vychozi hotely (seed)..."
npm run db:seed
if ($LASTEXITCODE -ne 0) { Write-Warn "Seed skoncil s chybou - zkontroluj vystup vyse." } else { Write-Ok "Seed hotovy" }

# =============================================================
# KROK 6 - Build aplikace
# =============================================================
Write-Step "Builduji aplikaci (Next.js)..."
npm run build
if ($LASTEXITCODE -ne 0) { Write-Fail "Build selhal. Zkontroluj chyby vyse." }
Write-Ok "Build dokoncen"

# =============================================================
# KROK 7 - Spusteni pres PM2
# =============================================================
Write-Step "Spoustim aplikaci pres PM2..."
New-Item -ItemType Directory -Force -Path (Join-Path $ProjectRoot "logs") | Out-Null
pm2 delete ensana 2>$null
pm2 start ecosystem.config.js
if ($LASTEXITCODE -ne 0) { Write-Fail "PM2 start selhal." }
pm2 save
pm2-startup install 2>$null
Write-Ok "Aplikace bezi pres PM2"

# =============================================================
# KROK 8 - Caddy (reverse proxy)
# =============================================================
Write-Step "Spoustim Caddy reverse proxy..."
if (Get-Command caddy -ErrorAction SilentlyContinue) {
    Start-Process -FilePath "caddy" -ArgumentList "start --config `"$ProjectRoot\Caddyfile`"" -NoNewWindow
    Write-Ok "Caddy spusten"
} else {
    Write-Warn "Caddy neni dostupny - aplikace bezi jen na portu 3000"
}

# =============================================================
# HOTOVO
# =============================================================
$serverIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch "^127\." -and $_.IPAddress -notmatch "^169\." } | Select-Object -First 1).IPAddress

Write-Host @"

  ====================================================
     SETUP DOKONCEN!

     Aplikace:        http://$serverIP
     Aplikace (3000): http://$serverIP`:3000

     Prihlaseni: ADMIN_EMAIL / ADMIN_PASSWORD z .env

     PM2 status:   pm2 status
     PM2 logy:     pm2 logs ensana
     DB status:    docker ps
  ====================================================

"@ -ForegroundColor Green
