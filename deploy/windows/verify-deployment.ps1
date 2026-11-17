[CmdletBinding()]
param(
    [string]$BaseUrl = "https://assets.hourie.com",
    [string]$ApplicationRoot = "C:\inetpub\hourie",
    [string]$PhpExecutable = "C:\Program Files\PHP\php.exe",
    [string]$TestEmail = "",
    [int]$HeartbeatWaitSeconds = 30
)

$ErrorActionPreference = "Stop"
$apiRoot = Join-Path $ApplicationRoot "hourie-api"

function Assert-HttpStatus {
    param(
        [string]$Url,
        [int[]]$AllowedStatuses
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 30
        $statusCode = [int]$response.StatusCode
    } catch {
        if ($null -eq $_.Exception.Response) {
            throw
        }

        $statusCode = [int]$_.Exception.Response.StatusCode
    }

    if ($statusCode -notin $AllowedStatuses) {
        throw "$Url returned HTTP $statusCode. Expected: $($AllowedStatuses -join ', ')."
    }

    Write-Host "HTTP $statusCode $Url"
}

foreach ($taskName in @("Hourie Laravel Scheduler", "Hourie Laravel Queue")) {
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
    if ($task.State -eq "Disabled") {
        throw "$taskName is disabled."
    }
    Write-Host "$taskName state: $($task.State)"
}

Start-ScheduledTask -TaskName "Hourie Laravel Scheduler"
Start-ScheduledTask -TaskName "Hourie Laravel Queue"
Start-Sleep -Seconds $HeartbeatWaitSeconds

Push-Location $apiRoot
try {
    $healthArguments = @("artisan", "hourie:health-check")
    if ($TestEmail -ne "") {
        $healthArguments += "--email=$TestEmail"
    }

    & $PhpExecutable @healthArguments
    if ($LASTEXITCODE -ne 0) {
        throw "The Hourie production health check failed."
    }
} finally {
    Pop-Location
}

Assert-HttpStatus -Url "$BaseUrl/up" -AllowedStatuses @(200)
Assert-HttpStatus -Url "$BaseUrl/api/health" -AllowedStatuses @(200)
Assert-HttpStatus -Url "$BaseUrl/sanctum/csrf-cookie" -AllowedStatuses @(204)
Assert-HttpStatus -Url "$BaseUrl/" -AllowedStatuses @(200)
Assert-HttpStatus -Url "$BaseUrl/api/v1/auth/user" -AllowedStatuses @(401)

Write-Host "Hourie IIS deployment verification passed."
