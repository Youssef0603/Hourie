[CmdletBinding()]
param(
    [string]$ApplicationRoot = "C:\inetpub\hourie",
    [string]$DataRoot = "D:\Hourie",
    [string]$SiteName = "Hourie Assets",
    [string]$ApplicationPoolName = "HourieAssets",
    [string]$HostName = "assets.hourie.com",
    [string]$PhpCgiExecutable = "C:\Program Files\PHP\php-cgi.exe"
)

$ErrorActionPreference = "Stop"

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run this script from an elevated PowerShell session."
}

Import-Module WebAdministration

$publicRoot = Join-Path $ApplicationRoot "hourie-api\public"
$storageRoot = Join-Path $ApplicationRoot "hourie-api\storage"
$cacheRoot = Join-Path $ApplicationRoot "hourie-api\bootstrap\cache"
$imagesRoot = Join-Path $DataRoot "uploads\equipment-images"
$documentsRoot = Join-Path $DataRoot "uploads\equipment-documents"
$backupRoot = Join-Path $DataRoot "backups"

foreach ($path in @($publicRoot, $storageRoot, $cacheRoot)) {
    if (-not (Test-Path $path)) {
        throw "Required application directory was not found: $path"
    }
}

if (-not (Test-Path $PhpCgiExecutable)) {
    throw "PHP CGI was not found at $PhpCgiExecutable."
}

$webConfigPath = Join-Path $publicRoot "web.config"
[xml]$webConfig = Get-Content -Path $webConfigPath
$phpHandler = $webConfig.SelectSingleNode("/configuration/system.webServer/handlers/add[@name='PHP_via_FastCGI']")
if ($null -eq $phpHandler) {
    throw "The PHP FastCGI handler is missing from $webConfigPath."
}
$phpHandler.scriptProcessor = $PhpCgiExecutable
$webConfig.Save($webConfigPath)

if (-not (Get-WebGlobalModule | Where-Object Name -eq "RewriteModule")) {
    throw "Install the IIS URL Rewrite module before configuring the site."
}

foreach ($path in @($imagesRoot, $documentsRoot, $backupRoot)) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
}

if (-not (Test-Path "IIS:\AppPools\$ApplicationPoolName")) {
    New-WebAppPool -Name $ApplicationPoolName | Out-Null
}
Set-ItemProperty "IIS:\AppPools\$ApplicationPoolName" -Name managedRuntimeVersion -Value ""
Set-ItemProperty "IIS:\AppPools\$ApplicationPoolName" -Name startMode -Value "AlwaysRunning"
Set-ItemProperty "IIS:\AppPools\$ApplicationPoolName" -Name processModel.idleTimeout -Value ([TimeSpan]::Zero)

if (Test-Path "IIS:\Sites\$SiteName") {
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $publicRoot
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name applicationPool -Value $ApplicationPoolName
} else {
    New-Website -Name $SiteName -PhysicalPath $publicRoot -ApplicationPool $ApplicationPoolName -Port 80 -HostHeader $HostName | Out-Null
}

$fastCgiFilter = "system.webServer/fastCgi/application[@fullPath='$PhpCgiExecutable']"
if (-not (Get-WebConfiguration -PSPath "MACHINE/WEBROOT/APPHOST" -Filter $fastCgiFilter)) {
    Add-WebConfiguration -PSPath "MACHINE/WEBROOT/APPHOST" -Filter "system.webServer/fastCgi" -Value @{ fullPath = $PhpCgiExecutable }
}

$applicationPoolIdentity = "IIS AppPool\$ApplicationPoolName"
foreach ($path in @($storageRoot, $cacheRoot, $imagesRoot, $documentsRoot, $backupRoot)) {
    & icacls.exe $path /grant "${applicationPoolIdentity}:(OI)(CI)M" /T /C | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to grant application permissions on $path."
    }
}

if ((Get-WebAppPoolState -Name $ApplicationPoolName).Value -ne "Started") {
    Start-WebAppPool -Name $ApplicationPoolName
}
if ((Get-WebsiteState -Name $SiteName).Value -ne "Started") {
    Start-Website -Name $SiteName
}

Write-Host "IIS site '$SiteName' is configured for $HostName. IT can now attach the SSL certificate and HTTPS binding."
