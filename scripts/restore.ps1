# Windows restore helper. Restores a dump into DATABASE_URL using pg_restore.
# Usage:  $env:DATABASE_URL="postgres://..."; ./scripts/restore.ps1 backups/learnfolk-YYYYMMDD-HHMMSS.dump
param([Parameter(Mandatory = $true)][string]$File)

if (-not $env:DATABASE_URL) { Write-Error "Set DATABASE_URL first."; exit 1 }
if (-not (Test-Path $File)) { Write-Error "Dump file not found: $File"; exit 1 }

$pgRestore = (Get-Command pg_restore -ErrorAction SilentlyContinue).Source
if (-not $pgRestore) {
  $candidate = Join-Path $env:ProgramFiles "PostgreSQL\17\bin\pg_restore.exe"
  if (Test-Path $candidate) { $pgRestore = $candidate }
}
if (-not $pgRestore) { Write-Error "pg_restore not found."; exit 1 }

Write-Output "Restoring $File ..."
& $pgRestore --clean --if-exists --no-owner --no-privileges --dbname $env:DATABASE_URL $File
Write-Output "Restore complete."
