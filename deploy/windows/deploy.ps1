[CmdletBinding()]
param(
    [string]$ApplicationRoot = "C:\inetpub\hourie",
    [string]$PhpExecutable = "C:\Program Files\PHP\php.exe",
    [string]$ComposerExecutable = "C:\ProgramData\ComposerSetup\bin\composer.bat",
    [string]$NodeExecutable = "C:\Program Files\nodejs\npm.cmd"
)

$ErrorActionPreference = "Stop"
$apiRoot = Join-Path $ApplicationRoot "hourie-api"
$webRoot = Join-Path $ApplicationRoot "hourie-web"
$publicRoot = Join-Path $apiRoot "public"
$distributionRoot = Join-Path $webRoot "dist"

if (-not (Test-Path (Join-Path $apiRoot ".env"))) {
    throw "Create hourie-api\.env from .env.windows.example before deploying."
}

& $PhpExecutable -r "if (!extension_loaded('zip')) { fwrite(STDERR, 'The PHP zip extension is required.' . PHP_EOL); exit(1); }"
if ($LASTEXITCODE -ne 0) {
    throw "The required PHP zip extension is unavailable."
}

Push-Location $apiRoot
try {
    & $ComposerExecutable install --no-dev --no-interaction --prefer-dist --optimize-autoloader
    & $PhpExecutable artisan migrate --force --no-interaction
    & $PhpExecutable artisan equipment-images:migrate-private --no-interaction
    & $PhpExecutable artisan optimize:clear
    & $PhpExecutable artisan config:cache
    & $PhpExecutable artisan route:cache
    & $PhpExecutable artisan view:cache
    & $PhpExecutable artisan queue:restart
} finally {
    Pop-Location
}

Push-Location $webRoot
try {
    & $NodeExecutable ci
    & $NodeExecutable run build
} finally {
    Pop-Location
}

if (-not (Test-Path $distributionRoot)) {
    throw "The React production build was not created."
}

Get-ChildItem $distributionRoot -Force | Copy-Item -Destination $publicRoot -Recurse -Force

Write-Host "Hourie deployment completed. Point the IIS site to $publicRoot, then run deploy\windows\verify-deployment.ps1."
