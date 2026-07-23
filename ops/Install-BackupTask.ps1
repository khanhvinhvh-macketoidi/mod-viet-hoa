#requires -Version 5.1
[CmdletBinding()]
param(
  [string]$ProjectPath = "E:\Mod QCBH\Website\mod-library-phase1",
  [string]$BackupRoot = "C:\MODThuVien\Backups",
  [string]$DailyTime = "03:30"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$taskName = "MOD Thu Vien - Daily Backup"
$backupScript = Join-Path $PSScriptRoot "Backup-ModLibrary.ps1"

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoLogo -NoProfile -ExecutionPolicy Bypass -File `"$backupScript`" -ProjectPath `"$ProjectPath`" -BackupRoot `"$BackupRoot`""

$trigger = New-ScheduledTaskTrigger -Daily -At $DailyTime

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -RunLevel Highest `
  -Force | Out-Null

Write-Host "Đã tạo Scheduled Task: $taskName" -ForegroundColor Green
Write-Host "Backup mỗi ngày lúc $DailyTime vào $BackupRoot" -ForegroundColor Cyan
