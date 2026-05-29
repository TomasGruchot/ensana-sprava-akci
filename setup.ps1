# =============================================================
# ENSANA — SETUP / UPDATE
# Spusť jako správce:  .\setup.ps1
# Aktualizace kódu:    git pull  pak znovu  .\setup.ps1
# =============================================================

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

function Step  { param($m) Write-Host "`n>>> $m" -ForegroundColor Cyan }
function Ok    { param($m) Write-Host "    OK: $m" -ForegroundColor Green }
function Fail  { param($m) Write-Host "`n    CHYBA: $m`n" -ForegroundColor Red; exit 1 }
function Warn  { param($m) Write-Host "    ! $m" -ForegroundColor Yellow }
function Ask   { param($m) Write-Host "`n    $m" -ForegroundColor Yellow }

function Encode-DbPassword([string]$pwd) {
    [uri]::EscapeDataString($pwd)
}

function Escape-SqlLiteral([string]$value) {
    $value -replace "'", "''"
}

function Sync-DatabaseUrl([string]$envPath, [string]$password) {
    $encoded = Encode-DbPassword $password
    $url = "postgresql://ensana:${encoded}@localhost:5432/ensana"
    $lines = Get-Content $envPath
    $found = $false
    $out = foreach ($line in $lines) {
        if ($line -match "^\s*DATABASE_URL\s*=") {
            $found = $true
            "DATABASE_URL=$url"
        } else {
            $line
        }
    }
    if (-not $found) { $out += "DATABASE_URL=$url" }
    Set-Content -Path $envPath -Value $out -Encoding UTF8
    return $url
}

Write-Host "`n  === ENSANA SETUP ===" -ForegroundColor Magenta

# ── 1. Node.js ────────────────────────────────────────────────
Step "Node.js"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail "Node.js neni nainstalovan.`n    Stahni LTS z https://nodejs.org (soubor .msi), nainstaluj a spust setup.ps1 znovu."
}
Ok "Node $(node --version)"

# ── 2. PostgreSQL ─────────────────────────────────────────────
Step "PostgreSQL"
$pgSvc = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue |
         Where-Object { $_.Status -eq "Running" } |
         Select-Object -First 1

if (-not $pgSvc) {
    Fail "PostgreSQL sluzba nebezi (nebo neni nainstalovana).`n    Stahni z https://www.postgresql.org/download/windows/`n    Nainstaluj, pak spust setup.ps1 znovu."
}
Ok "Sluzba bezi: $($pgSvc.Name)"

# Najdi psql.exe (bin/, ne pgAdmin runtime)
$binPsql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
if (Test-Path $binPsql) {
    $psqlPath = $binPsql
} else {
    $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
    $psqlPath = if ($psqlCmd) { $psqlCmd.Source } else { $null }
    if (-not $psqlPath) {
        $candidates = Get-ChildItem "C:\Program Files\PostgreSQL" -Filter psql.exe -Recurse -ErrorAction SilentlyContinue |
                      Where-Object { $_.FullName -match "\\bin\\psql\.exe$" } |
                      Sort-Object -Property FullName -Descending |
                      Select-Object -First 1
        if ($candidates) { $psqlPath = $candidates.FullName }
    }
}
if (-not $psqlPath) {
    Fail "psql.exe nenalezen. Zkontroluj instalaci PostgreSQL."
}
Ok "psql: $psqlPath"

# ── 3. .env ───────────────────────────────────────────────────
Step ".env konfigurace"
$envPath = Join-Path $ProjectRoot ".env"

if (-not (Test-Path $envPath)) {
    Copy-Item (Join-Path $ProjectRoot ".env.example") $envPath
    Ask @"
Soubor .env byl vytvoren. Otevri ho a vyplň VSECHNA mista oznacena <<<:

  notepad "$envPath"

Pak spust setup.ps1 znovu.
"@
    exit 0
}

if ((Get-Content $envPath -Raw) -match "<<<") {
    Ask @"
.env obsahuje nevyplnene hodnoty (<<<). Otevri a doplň:

  notepad "$envPath"

Pak spust setup.ps1 znovu.
"@
    exit 0
}

# Načti .env do proměnných
$envVars = @{}
Get-Content $envPath | Where-Object { $_ -match "^\s*[^#].+=." } | ForEach-Object {
    $parts = $_ -split "=", 2
    $envVars[$parts[0].Trim()] = $parts[1].Trim()
}

$pgAdminPwd  = $envVars["POSTGRES_ADMIN_PASSWORD"]
$pgAppPwd    = $envVars["POSTGRES_PASSWORD"]

if (-not $pgAdminPwd) { Fail "POSTGRES_ADMIN_PASSWORD neni v .env." }
if (-not $pgAppPwd)   { Fail "POSTGRES_PASSWORD neni v .env." }

Ok ".env vyplnen"

$dbUrl = Sync-DatabaseUrl $envPath $pgAppPwd
Ok "DATABASE_URL nastaveno (heslo v URL je zakodovane, napr. ! -> %21)"

# ── 4. Vytvoř DB uživatele a databázi (pokud neexistují) ──────
Step "Databaze (uzivatel ensana + databaze ensana)"

$env:PGPASSWORD = $pgAdminPwd
$pgAppPwdSql = Escape-SqlLiteral $pgAppPwd

$adminTest = & $psqlPath -U postgres -h localhost -tAc "SELECT 1;" 2>&1
if ($LASTEXITCODE -ne 0) {
    $env:PGPASSWORD = "postgres"
    $retry = & $psqlPath -U postgres -h localhost -tAc "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        & $psqlPath -U postgres -h localhost -c "ALTER USER postgres WITH PASSWORD '$((Escape-SqlLiteral $pgAdminPwd))';" 2>&1 | Out-Null
        $env:PGPASSWORD = $pgAdminPwd
        Ok "Postgres superuser mel vychozi heslo 'postgres' - nastaveno z .env"
    } else {
        $env:PGPASSWORD = ""
        Fail "POSTGRES_ADMIN_PASSWORD je spatne - postgres superuser se neprihlasil.`n    Zkontroluj heslo z instalace PostgreSQL v .env."
    }
}

function Get-PsqlScalar([string]$query) {
    $raw = & $psqlPath -U postgres -h localhost -tAc $query 2>$null
    if ($null -eq $raw) { return "" }
    return ($raw | Out-String).Trim()
}

$checkUser = Get-PsqlScalar "SELECT 1 FROM pg_roles WHERE rolname='ensana';"
if ($checkUser -ne "1") {
    $createUser = & $psqlPath -U postgres -h localhost -c "CREATE USER ensana WITH PASSWORD '$pgAppPwdSql';" 2>&1
    if ($LASTEXITCODE -ne 0) { Fail "Nepodarilo se vytvorit uzivatele ensana: $createUser" }
    Ok "Uzivatel ensana vytvoren"
} else {
    $alterUser = & $psqlPath -U postgres -h localhost -c "ALTER USER ensana WITH PASSWORD '$pgAppPwdSql';" 2>&1
    if ($LASTEXITCODE -ne 0) { Fail "Nepodarilo se nastavit heslo uzivatele ensana: $alterUser" }
    Ok "Uzivatel ensana - heslo synchronizovano"
}

$checkDb = Get-PsqlScalar "SELECT 1 FROM pg_database WHERE datname='ensana';"
if ($checkDb -ne "1") {
    & $psqlPath -U postgres -h localhost -c "CREATE DATABASE ensana OWNER ensana;" 2>&1 | Out-Null
    & $psqlPath -U postgres -h localhost -c "GRANT ALL PRIVILEGES ON DATABASE ensana TO ensana;" 2>&1 | Out-Null
    Ok "Databaze ensana vytvorena"
} else {
    Ok "Databaze ensana existuje"
}

$env:PGPASSWORD = $pgAppPwd
$appTest = & $psqlPath -U ensana -h localhost -d ensana -tAc "SELECT 1;" 2>&1
$env:PGPASSWORD = ""
if ($LASTEXITCODE -ne 0) {
    Fail "Uzivatel ensana se neprihlasil k databazi.`n    Spust znovu setup.ps1 nebo zkontroluj POSTGRES_PASSWORD."
}
Ok "Pripojeni ensana@ensana funguje"

# ── 5. PM2 ────────────────────────────────────────────────────
Step "PM2"
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    npm install -g pm2
    npm install -g pm2-windows-startup
    Ok "PM2 nainstalovan"
} else {
    Ok "PM2 $(pm2 --version)"
}

# Caddy (volitelne — jen info)
if (-not (Get-Command caddy -ErrorAction SilentlyContinue)) {
    Warn "Caddy neni - aplikace pojede na portu 3000 (OK pro interni sit)"
} else {
    Ok "Caddy $(caddy version)"
}

# ── 6. Zavislosti + schema + seed ─────────────────────────────
Step "npm install"
Set-Location $ProjectRoot
npm install
if ($LASTEXITCODE -ne 0) { Fail "npm install selhal." }
Ok "Hotovo"

Step "Databazove schema (Prisma db:push)"
npm run db:push
if ($LASTEXITCODE -ne 0) { Fail "db:push selhal - zkontroluj DATABASE_URL v .env." }
Ok "Schema OK"

Step "Seed (hotely + IT admin)"
npm run db:seed
if ($LASTEXITCODE -ne 0) { Warn "Seed skoncil s chybou (prvni admin uz mozna existuje - to je OK)" }
else { Ok "Seed hotov" }

# ── 7. Build ──────────────────────────────────────────────────
Step "Build (Next.js)"
npm run build
if ($LASTEXITCODE -ne 0) { Fail "Build selhal." }
Ok "Build hotov"

# ── 8. Spusteni / restart pres PM2 ────────────────────────────
Step "PM2 - spoustim / restartuji aplikaci"
New-Item -ItemType Directory -Force -Path (Join-Path $ProjectRoot "logs") | Out-Null
$running = pm2 list 2>$null | Select-String "ensana"
if ($running) {
    pm2 restart ensana
} else {
    pm2 start ecosystem.config.js
}
pm2 save
pm2-startup install 2>$null
Ok "Aplikace bezi"

# ── 9. Caddy ──────────────────────────────────────────────────
if (Get-Command caddy -ErrorAction SilentlyContinue) {
    Step "Caddy (port 80)"
    Start-Process -FilePath "caddy" -ArgumentList "start --config `"$ProjectRoot\Caddyfile`"" -NoNewWindow
    Ok "Caddy spusten"
}

# ── Hotovo ────────────────────────────────────────────────────
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notmatch "^127\." -and $_.IPAddress -notmatch "^169\."
} | Select-Object -First 1).IPAddress

Write-Host @"

  ==========================================
   HOTOVO

   http://$ip        (s Caddy)
   http://$ip`:3000  (bez Caddy)

   Prihlaseni:  ADMIN_EMAIL / ADMIN_PASSWORD

   pm2 status       - stav aplikace
   pm2 logs ensana  - logy
  ==========================================

"@ -ForegroundColor Green
