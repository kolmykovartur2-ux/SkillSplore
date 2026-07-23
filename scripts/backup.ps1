# Windows backup helper. Dumps the database in DATABASE_URL using pg_dump.
# Usage:  $env:DATABASE_URL="postgres://..."; ./scripts/backup.ps1
param([string]$BackupDir = "backups")

if (-not $env:DATABASE_URL) { Write-Error "Set DATABASE_URL first."; exit 1 }

# Find pg_dump (PATH, then the default PostgreSQL install location).
$pgDump = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source
if (-not $pgDump) {
  $candidate = Join-Path $env:ProgramFiles "PostgreSQL\17\bin\pg_dump.exe"
  if (Test-Path $candidate) { $pgDump = $candidate }
}
if (-not $pgDump) { Write-Error "pg_dump not found. Install PostgreSQL client tools."; exit 1 }

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$out = Join-Path $BackupDir "skillsplore-$ts.dump"

Write-Output "Dumping database -> $out"
& $pgDump --format=custom --no-owner --no-privileges $env:DATABASE_URL | Set-Content -Path $out -Encoding Byte
Write-Output "Backup complete: $out"

if (Test-Path "storage-data") {
  $store = Join-Path $BackupDir "storage-$ts.zip"
  Compress-Archive -Path "storage-data" -DestinationPath $store -Force
  Write-Output "Archived object storage -> $store"
}
