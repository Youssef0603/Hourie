[CmdletBinding()]
param(
    [string]$ApplicationRoot = "C:\inetpub\hourie",
    [string]$PhpExecutable = "C:\Program Files\PHP\php.exe"
)

$ErrorActionPreference = "Stop"
$apiRoot = Join-Path $ApplicationRoot "hourie-api"
$queueScript = Join-Path $ApplicationRoot "deploy\windows\run-queue-worker.ps1"
$powerShellExecutable = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"

if (-not (Test-Path $PhpExecutable)) {
    throw "PHP was not found at $PhpExecutable."
}

if (-not (Test-Path $queueScript)) {
    throw "Queue worker script was not found at $queueScript."
}

$schedulerCommand = "cd /d `"$apiRoot`" && `"$PhpExecutable`" artisan schedule:run"
schtasks.exe /Create /TN "Hourie Laravel Scheduler" /SC MINUTE /MO 1 /TR "cmd.exe /d /s /c `"$schedulerCommand`"" /RU SYSTEM /RL HIGHEST /F
if ($LASTEXITCODE -ne 0) {
    throw "Unable to install the Laravel scheduler task."
}

$queueCommand = "-NoLogo -NoProfile -ExecutionPolicy Bypass -File `"$queueScript`" -ApplicationRoot `"$ApplicationRoot`" -PhpExecutable `"$PhpExecutable`""
schtasks.exe /Create /TN "Hourie Laravel Queue" /SC ONSTART /TR "`"$powerShellExecutable`" $queueCommand" /RU SYSTEM /RL HIGHEST /F
if ($LASTEXITCODE -ne 0) {
    throw "Unable to install the Laravel queue task."
}

schtasks.exe /Run /TN "Hourie Laravel Scheduler"
schtasks.exe /Run /TN "Hourie Laravel Queue"

Write-Host "Hourie scheduler and queue tasks were installed and started."
