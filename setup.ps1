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

  ╔══════════════════════════════════════╗
  ║   ENSANA — Server Setup             ║
  ╚══════════════════════════════════════╝

"@ -ForegroundColor Magenta

# =============================================================
# KROK 1 — Kontrola prerekvizit
# =============================================================
Write-Step "Kontroluji prerekvizity..."

# Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Fail "Node.js není nainstalován. Stáhni z https://nodejs.org a nainstaluj, pak spusť setup.ps1 znovu."
}
$nodeVersion = node --version
Write-Ok "Node.js $nodeVersion"

# Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Fail "Docker není nainstalován. Stáhni Docker Desktop z https://docker.com a nainstaluj."
}
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) { throw }
} catch {
    Write-Fail "Docker Desktop není spuštěný. Spusť Docker Desktop a zkus znovu."
}
Write-Ok "Docker běží"

# PM2
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Step "Instaluji PM2..."
    npm install -g pm2
    npm install -g pm2-windows-startup
    Write-Ok "PM2 nainstalován"
} else {
    Write-Ok "PM2 $(pm2 --version)"
}

# Caddy
if (-not (Get-Command caddy -ErrorAction SilentlyContinue)) {
    Write-Warn "Caddy není nainstalován nebo není v PATH."
    Write-Warn "Stáhni caddy.exe z https://caddyserver.com/download a přidej do PATH."
    Write-Warn "Caddy je potřeba pro přístup na portu 80. Aplikace bude dostupná na portu 3000."
} else {
    Write-Ok "Caddy $(caddy version)"
}

# =============================================================
# KROK 2 — Kontrola .env souborů
# =============================================================
Write-Step "Kontroluji konfigurační soubory..."

$supabaseEnvPath = Join-Path $ProjectRoot "docker\supabase\.env"
$appEnvPath      = Join-Path $ProjectRoot ".env"
$needsConfig     = $false

if (-not (Test-Path $supabaseEnvPath)) {
    Copy-Item (Join-Path $ProjectRoot "docker\supabase\.env.supabase.example") $supabaseEnvPath
    Write-Warn "Vytvořen docker/supabase/.env z příkladu — MUSÍŠ ho vyplnit!"
    $needsConfig = $true
} else {
    Write-Ok "docker/supabase/.env existuje"
}

if (-not (Test-Path $appEnvPath)) {
    Copy-Item (Join-Path $ProjectRoot ".env.example") $appEnvPath
    Write-Warn "Vytvořen .env z příkladu — MUSÍŠ ho vyplnit!"
    $needsConfig = $true
} else {
    Write-Ok ".env existuje"
}

if ($needsConfig) {
    Write-Host @"

  ════════════════════════════════════════════════════
  ZASTAV SE A VYPLŇ KONFIGURACI:

  1. Otevři: docker\supabase\.env
     - Nastav POSTGRES_PASSWORD (silné heslo)
     - Nastav JWT_SECRET (náhodný 64-znakový řetězec)
     - Nastav SERVER_IP (IP tohoto počítače v síti)
     - Nastav SMTP údaje pro odesílání emailů

  2. Vygeneruj ANON_KEY a SERVICE_ROLE_KEY:
       node scripts\generate-keys.mjs <tvuj JWT_SECRET>
     Zkopíruj výstup do docker\supabase\.env i do .env

  3. Otevři: .env
     - Nastav DATABASE_URL (stejné heslo jako POSTGRES_PASSWORD)
     - Nastav NEXT_PUBLIC_SUPABASE_URL (http://SERVER_IP:8000)
     - Nastav klíče z kroku 2

  4. Spusť setup.ps1 znovu

  ════════════════════════════════════════════════════

"@ -ForegroundColor Yellow
    exit 0
}

# Validace že .env nemá nevyplněné placeholdery
$envContent = Get-Content $appEnvPath -Raw
if ($envContent -match "<<<") {
    Write-Fail ".env obsahuje nevyplněné hodnoty (<<<). Vyplň všechny hodnoty označené <<<."
}

$supabaseEnvContent = Get-Content $supabaseEnvPath -Raw
if ($supabaseEnvContent -match "<<<") {
    Write-Fail "docker/supabase/.env obsahuje nevyplněné hodnoty (<<<). Vyplň všechny hodnoty označené <<<."
}

Write-Ok "Konfigurace vypadá v pořádku"

# =============================================================
# KROK 3 — Vygenerování kong.yml z template
# =============================================================
Write-Step "Generuji Kong konfiguraci..."

# Načti hodnoty z supabase .env
$supabaseEnv = @{}
Get-Content $supabaseEnvPath | Where-Object { $_ -match "^[^#].*=.*" } | ForEach-Object {
    $parts = $_ -split "=", 2
    $supabaseEnv[$parts[0].Trim()] = $parts[1].Trim()
}

$anonKey       = $supabaseEnv["ANON_KEY"]
$serviceRoleKey = $supabaseEnv["SERVICE_ROLE_KEY"]

if (-not $anonKey -or -not $serviceRoleKey) {
    Write-Fail "ANON_KEY nebo SERVICE_ROLE_KEY chybí v docker/supabase/.env`nVygeneruj je pomocí: node scripts\generate-keys.mjs <JWT_SECRET>"
}

$kongTemplatePath = Join-Path $ProjectRoot "docker\supabase\volumes\api\kong.yml.template"
$kongOutputPath   = Join-Path $ProjectRoot "docker\supabase\volumes\api\kong.yml"

$kongContent = Get-Content $kongTemplatePath -Raw
$kongContent = $kongContent.Replace("__ANON_KEY__", $anonKey)
$kongContent = $kongContent.Replace("__SERVICE_ROLE_KEY__", $serviceRoleKey)
Set-Content -Path $kongOutputPath -Value $kongContent -Encoding UTF8

Write-Ok "docker/supabase/volumes/api/kong.yml vygenerován"

# =============================================================
# KROK 4 — Spuštění Supabase (Docker)
# =============================================================
Write-Step "Spouštím Supabase (Docker Compose)..."

Set-Location (Join-Path $ProjectRoot "docker\supabase")

docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Docker Compose selhal. Zkontroluj chyby výše."
}

Write-Ok "Docker Compose spuštěn, čekám na zdravé služby..."

# Čekání na PostgreSQL
Write-Host "    Čekám na PostgreSQL..." -NoNewline
$attempts = 0
do {
    Start-Sleep -Seconds 3
    $attempts++
    Write-Host "." -NoNewline
    $health = docker inspect --format="{{.State.Health.Status}}" supabase-db 2>$null
} while ($health -ne "healthy" -and $attempts -lt 30)

if ($health -ne "healthy") {
    Write-Fail "`nPostgreSQL nenastartoval včas. Zkontroluj: docker logs supabase-db"
}
Write-Host " OK" -ForegroundColor Green

# Čekání na Auth
Write-Host "    Čekám na Supabase Auth..." -NoNewline
$attempts = 0
do {
    Start-Sleep -Seconds 3
    $attempts++
    Write-Host "." -NoNewline
    $health = docker inspect --format="{{.State.Health.Status}}" supabase-auth 2>$null
} while ($health -ne "healthy" -and $attempts -lt 30)

if ($health -ne "healthy") {
    Write-Fail "`nSupabase Auth nenastartoval včas. Zkontroluj: docker logs supabase-auth"
}
Write-Host " OK" -ForegroundColor Green

Set-Location $ProjectRoot

# =============================================================
# KROK 5 — Instalace závislostí
# =============================================================
Write-Step "Instaluji npm závislosti..."

Set-Location $ProjectRoot
npm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { Write-Fail "npm install selhal." }
Write-Ok "Závislosti nainstalovány"

# =============================================================
# KROK 6 — Databázové migrace (Prisma)
# =============================================================
Write-Step "Aplikuji databázové schéma (Prisma)..."

npm run db:push
if ($LASTEXITCODE -ne 0) { Write-Fail "Prisma db:push selhal. Zkontroluj DATABASE_URL v .env." }
Write-Ok "Databázové schéma aplikováno"

# =============================================================
# KROK 7 — Build aplikace
# =============================================================
Write-Step "Builduji aplikaci (Next.js)..."

npm run build
if ($LASTEXITCODE -ne 0) { Write-Fail "Build selhal. Zkontroluj chyby výše." }
Write-Ok "Build dokončen"

# =============================================================
# KROK 8 — Spuštění aplikace přes PM2
# =============================================================
Write-Step "Spouštím aplikaci přes PM2..."

# Vytvoř složku pro logy
New-Item -ItemType Directory -Force -Path (Join-Path $ProjectRoot "logs") | Out-Null

# Zastav stávající instanci pokud běží
pm2 delete ensana 2>$null

pm2 start ecosystem.config.js
if ($LASTEXITCODE -ne 0) { Write-Fail "PM2 start selhal." }

# Nastav PM2 aby se spouštěl po restartu Windows
pm2 save
pm2-startup install 2>$null

Write-Ok "Aplikace spuštěna přes PM2"

# =============================================================
# KROK 9 — Spuštění Caddy (reverse proxy)
# =============================================================
Write-Step "Spouštím Caddy reverse proxy..."

if (Get-Command caddy -ErrorAction SilentlyContinue) {
    Start-Process -FilePath "caddy" -ArgumentList "start --config `"$ProjectRoot\Caddyfile`"" -NoNewWindow
    Write-Ok "Caddy spuštěn"
} else {
    Write-Warn "Caddy není dostupný — aplikace běží jen na portu 3000"
    Write-Warn "Stáhni caddy.exe z https://caddyserver.com/download a spusť:"
    Write-Warn "  caddy start --config Caddyfile"
}

# =============================================================
# HOTOVO
# =============================================================

# Zjisti IP serveru
$serverIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch "^127\." -and $_.IPAddress -notmatch "^169\." } | Select-Object -First 1).IPAddress

Write-Host @"

  ╔══════════════════════════════════════════════════╗
  ║   SETUP DOKONČEN!                               ║
  ╠══════════════════════════════════════════════════╣
  ║                                                  ║
  ║   Aplikace:      http://$serverIP             ║
  ║   Aplikace (přímý): http://$serverIP`:3000    ║
  ║   Supabase Studio:  http://$serverIP`:54323   ║
  ║   Supabase API:     http://$serverIP`:8000    ║
  ║                                                  ║
  ║   PM2 status:    pm2 status                      ║
  ║   PM2 logy:      pm2 logs ensana                 ║
  ║   Docker status: docker ps                       ║
  ║                                                  ║
  ╚══════════════════════════════════════════════════╝

"@ -ForegroundColor Green
