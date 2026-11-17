[CmdletBinding()]
param(
    [string]$ApplicationRoot = "C:\inetpub\hourie",
    [string]$PhpExecutable = "C:\Program Files\PHP\php.exe"
)

$ErrorActionPreference = "Continue"
$apiRoot = Join-Path $ApplicationRoot "hourie-api"

while ($true) {
    Push-Location $apiRoot
    try {
        & $PhpExecutable artisan queue:work database --sleep=3 --tries=3 --timeout=120 --max-time=3600
    } finally {
        Pop-Location
    }

    Start-Sleep -Seconds 5
}
