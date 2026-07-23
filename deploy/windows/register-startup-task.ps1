param([string]$TaskName = 'MOD Viet Hoa Web')
$ErrorActionPreference = 'Stop'
$script = (Resolve-Path "$PSScriptRoot\start-production.ps1").Path
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force
Write-Host "Registered startup task: $TaskName"
