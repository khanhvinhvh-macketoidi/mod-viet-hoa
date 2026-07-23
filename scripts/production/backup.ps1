param(
  [string]$Destination = "$PSScriptRoot\..\..\backups"
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path "$PSScriptRoot\..\..").Path
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$target = Join-Path $Destination "modviethoa-$stamp"
New-Item -ItemType Directory -Force -Path $target | Out-Null
foreach ($relative in @('data', 'public\uploads', 'storage\uploads')) {
  $source = Join-Path $root $relative
  if (Test-Path $source) {
    $dest = Join-Path $target $relative
    New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
    Copy-Item $source $dest -Recurse -Force
  }
}
Compress-Archive -Path "$target\*" -DestinationPath "$target.zip" -Force
Remove-Item $target -Recurse -Force
Write-Host "Backup created: $target.zip"
