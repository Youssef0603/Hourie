[CmdletBinding()]
param(
    [string]$BaseUrl = "https://assets.hourie.com",
    [string]$ApplicationRoot = "C:\inetpub\hourie",
    [string]$PhpExecutable = "C:\Program Files\PHP\php.exe",
    [int]$MaximumUptimeMinutes = 30,
    [int]$RecoveryWaitSeconds = 90
)

$ErrorActionPreference = "Stop"
$uptime = (Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime

if ($uptime.TotalMinutes -gt $MaximumUptimeMinutes) {
    throw "The VM has been running for $([math]::Round($uptime.TotalMinutes, 1)) minutes. Restart it before running this recovery check."
}

$verificationScript = Join-Path $ApplicationRoot "deploy\windows\verify-deployment.ps1"
if (-not (Test-Path $verificationScript)) {
    throw "Deployment verification script was not found at $verificationScript."
}

Write-Host "VM boot detected $([math]::Round($uptime.TotalMinutes, 1)) minutes ago. Waiting for services to recover."
Start-Sleep -Seconds $RecoveryWaitSeconds

& $verificationScript `
    -BaseUrl $BaseUrl `
    -ApplicationRoot $ApplicationRoot `
    -PhpExecutable $PhpExecutable `
    -HeartbeatWaitSeconds 30

if ($LASTEXITCODE -ne 0) {
    throw "Hourie did not recover successfully after the VM restart."
}

Write-Host "Hourie restart recovery verification passed."
