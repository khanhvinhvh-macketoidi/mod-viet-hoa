#requires -Version 5.1
[CmdletBinding()]
param(
  [string]$ProjectPath = "E:\Mod QCBH\Website\mod-library-phase1",
  [string]$BackupRoot = "C:\MODThuVien\Backups",
  [int]$RetentionDays = 14
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectPath = [IO.Path]::GetFullPath($ProjectPath)
$BackupRoot = [IO.Path]::GetFullPath($BackupRoot)

if (-not (Test-Path -LiteralPath $ProjectPath)) {
  throw "Không tìm thấy project: $ProjectPath"
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$stagingRoot = Join-Path $env:TEMP "MODThuVien_Backup_$timestamp"
$archivePath = Join-Path $BackupRoot "MODThuVien_$timestamp.zip"

New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null

try {
  $sources = @(
    @{ Source = "data"; Destination = "data" },
    @{ Source = "storage\uploads"; Destination = "storage\uploads" },
    @{ Source = "public\uploads"; Destination = "public\uploads" }
  )

  foreach ($item in $sources) {
    $sourcePath = Join-Path $ProjectPath $item.Source

    if (Test-Path -LiteralPath $sourcePath) {
      $destinationPath = Join-Path $stagingRoot $item.Destination
      New-Item -ItemType Directory -Path (Split-Path -Parent $destinationPath) -Force | Out-Null
      Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Recurse -Force
    }
  }

  $manifest = [ordered]@{
    createdAt = (Get-Date).ToString("o")
    projectPath = $ProjectPath
    computerName = $env:COMPUTERNAME
    retentionDays = $RetentionDays
  }

  $manifest |
    ConvertTo-Json -Depth 4 |
    Set-Content -LiteralPath (Join-Path $stagingRoot "backup-manifest.json") -Encoding UTF8

  Compress-Archive -Path (Join-Path $stagingRoot "*") -DestinationPath $archivePath -CompressionLevel Optimal -Force

  $hash = Get-FileHash -LiteralPath $archivePath -Algorithm SHA256
  "$($hash.Hash)  $([IO.Path]::GetFileName($archivePath))" |
    Set-Content -LiteralPath "$archivePath.sha256" -Encoding ASCII

  $cutoff = (Get-Date).AddDays(-$RetentionDays)

  Get-ChildItem -LiteralPath $BackupRoot -File |
    Where-Object {
      $_.LastWriteTime -lt $cutoff -and
      ($_.Name -like "MODThuVien_*.zip" -or $_.Name -like "MODThuVien_*.zip.sha256")
    } |
    Remove-Item -Force

  Write-Host "Backup hoàn tất: $archivePath" -ForegroundColor Green
}
finally {
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force -ErrorAction SilentlyContinue
}
