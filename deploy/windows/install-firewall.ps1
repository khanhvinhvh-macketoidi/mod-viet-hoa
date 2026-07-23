$ErrorActionPreference = 'Stop'
foreach ($port in 80,443) {
  $name = "MOD Viet Hoa HTTP $port"
  if (-not (Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $name -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow | Out-Null
  }
}
Write-Host 'Windows Firewall opened TCP 80 and 443.'
