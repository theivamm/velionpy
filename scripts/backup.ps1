$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$BackupsDir = Join-Path $Root "backups"

if (-not (Test-Path $BackupsDir)) {
    New-Item -ItemType Directory -Path $BackupsDir -Force | Out-Null
}

$Name = $env:BACKUP_NAME
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupName = if ($Name) { "$timestamp-$Name" } else { $timestamp }
$backupFile = Join-Path $BackupsDir "$backupName.tar"

Push-Location $Root

$items = @("apps", "packages", "scripts", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "turbo.json", ".gitignore", "supabase-schema.sql", "README.md")
if (Test-Path ".env.local") { $items += ".env.local" }

tar -cf $backupFile --exclude="node_modules" --exclude=".next" --exclude=".turbo" --exclude="out" --exclude="build" --exclude=".git" --exclude="backups" --exclude="coverage" @items
Pop-Location

$size = [math]::Round((Get-Item $backupFile).Length / 1MB, 2)
Write-Host "Backup creado: $backupFile ($size MB)" -ForegroundColor Green
