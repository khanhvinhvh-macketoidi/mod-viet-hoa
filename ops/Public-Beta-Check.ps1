#requires -Version 5.1
[CmdletBinding()]
param(
  [string]$BaseUrl = "https://modviethoa.vn",
  [switch]$SkipCertificateRevocationCheck
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$paths = @(
  "/",
  "/mods",
  "/login",
  "/register",
  "/terms",
  "/privacy",
  "/community-guidelines",
  "/copyright",
  "/contact",
  "/public-beta",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/opengraph-image",
  "/twitter-image",
  "/api/health"
)

$results = foreach ($path in $paths) {
  $url = "$($BaseUrl.TrimEnd('/'))$path"
  $curlArgs = @(
    "--silent",
    "--show-error",
    "--output", "NUL",
    "--write-out", "%{http_code}|%{time_total}|%{content_type}",
    "--location",
    "--max-time", "30"
  )

  if ($SkipCertificateRevocationCheck) {
    $curlArgs += "--ssl-no-revoke"
  }

  $curlArgs += $url
  $raw = & curl.exe @curlArgs 2>&1
  $exitCode = $LASTEXITCODE

  if ($exitCode -eq 0 -and $raw -match '^(\d{3})\|([^|]+)\|(.*)$') {
    [pscustomobject]@{
      Path = $path
      Status = [int]$Matches[1]
      Seconds = [math]::Round([double]$Matches[2], 3)
      ContentType = $Matches[3]
      Passed = [int]$Matches[1] -ge 200 -and [int]$Matches[1] -lt 400
    }
  }
  else {
    [pscustomobject]@{
      Path = $path
      Status = 0
      Seconds = 0
      ContentType = [string]$raw
      Passed = $false
    }
  }
}

$results | Format-Table -AutoSize

$failed = @($results | Where-Object { -not $_.Passed })

Write-Host ""
if ($failed.Count -eq 0) {
  Write-Host "PUBLIC BETA CHECK: PASS" -ForegroundColor Green
  exit 0
}

Write-Host "PUBLIC BETA CHECK: $($failed.Count) URL FAILED" -ForegroundColor Red
exit 1
