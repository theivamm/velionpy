$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$BackupsDir = Join-Path $Root "backups"

$File = $env:RESTORE_FILE

if (-not $File) {
    $backups = Get-ChildItem -Path $BackupsDir -Filter "*.tar" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    if (-not $backups) {
        Write-Host "No hay backups en $BackupsDir" -ForegroundColor Red
        exit 1
    }
    Write-Host "Backups disponibles:" -ForegroundColor Cyan
    for ($i = 0; $i -lt $backups.Count; $i++) {
        $size = [math]::Round($backups[$i].Length / 1MB, 2)
        Write-Host "  [$($i+1)] $($backups[$i].Name) ($size MB)" -ForegroundColor White
    }
    $choice = Read-Host "Selecciona numero"
    $File = $backups[[int]$choice - 1].FullName
}

if (-not (Test-Path $File)) {
    Write-Host "No se encontro: $File" -ForegroundColor Red
    exit 1
}

Write-Host "Restaurando desde: $File" -ForegroundColor Cyan
Push-Location $Root
tar -xf $File
Pop-Location

Write-Host "Restore completado." -ForegroundColor Green
Write-Host "Ejecuta 'pnpm install' para restaurar dependencias." -ForegroundColor Yellow
