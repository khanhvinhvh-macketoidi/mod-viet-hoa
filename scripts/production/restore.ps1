param(
  [Parameter(Mandatory=$true)][string]$BackupPath,
  [string]$ProjectPath = (Get-Location).Path
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $BackupPath)) { throw "Backup not found: $BackupPath" }
$confirmation = Read-Host "Restore will overwrite data and uploads. Type RESTORE to continue"
if ($confirmation -ne 'RESTORE') { Write-Host 'Cancelled.'; exit 1 }
foreach ($relative in @('data', 'public\uploads')) {
  $source = Join-Path $BackupPath $relative
  $destination = Join-Path $ProjectPath $relative
  if (Test-Path $source) {
    if (Test-Path $destination) { Remove-Item $destination -Recurse -Force }
    New-Item -ItemType Directory -Force -Path (Split-Path $destination) | Out-Null
    Copy-Item $source $destination -Recurse -Force
  }
}
Write-Host 'Restore completed.' -ForegroundColor Green
