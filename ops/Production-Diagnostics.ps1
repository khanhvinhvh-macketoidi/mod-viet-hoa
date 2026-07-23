#requires -Version 5.1
[CmdletBinding()]
param(
  [string]$ProjectPath = "E:\Mod QCBH\Website\mod-library-phase1",
  [string]$PublicUrl = "https://modviethoa.vn"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

Write-Host "=== MOD THU VIEN PRODUCTION DIAGNOSTICS ===" -ForegroundColor Cyan
Write-Host "Time: $(Get-Date -Format o)"
Write-Host "Project: $ProjectPath"
Write-Host ""

Write-Host "[PM2]" -ForegroundColor Yellow
& pm2.cmd show mod-thu-vien

Write-Host "`n[Local health]" -ForegroundColor Yellow
try {
  Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/health" -TimeoutSec 15 |
    ConvertTo-Json -Depth 8
}
catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n[Public health]" -ForegroundColor Yellow
try {
  Invoke-RestMethod -Uri "$PublicUrl/api/health" -TimeoutSec 20 |
    ConvertTo-Json -Depth 8
}
catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n[Storage]" -ForegroundColor Yellow
foreach ($relative in @("data", "storage\uploads", "public\uploads")) {
  $target = Join-Path $ProjectPath $relative

  if (Test-Path -LiteralPath $target) {
    $size = (
      Get-ChildItem -LiteralPath $target -File -Recurse -ErrorAction SilentlyContinue |
      Measure-Object -Property Length -Sum
    ).Sum

    Write-Host "$relative : $([math]::Round(($size / 1MB), 2)) MB"
  }
  else {
    Write-Host "$relative : missing" -ForegroundColor DarkYellow
  }
}

Write-Host "`n[Recent errors]" -ForegroundColor Yellow
& pm2.cmd logs mod-thu-vien --err --lines 30 --nostream
