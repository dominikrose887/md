#Requires -Version 5.1
<#
.SYNOPSIS
  Builds the Vite renderer and produces the Windows NSIS installer only.

.DESCRIPTION
  Runs npm install if node_modules is missing, then npm run build:installer.
  Stops running MD Studio.exe instances to avoid file locks on release\win-unpacked.

  Output: FigmaUI\release\MD Studio Setup <version>.exe (see package.json "version")
#>
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host 'MD Studio — Windows installer build' -ForegroundColor Cyan

# Avoid electron-builder failing to replace locked unpacked binaries
Get-Process -Name 'MD Studio' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 400

if (-not (Test-Path 'node_modules')) {
  Write-Host 'Installing dependencies (npm install)...' -ForegroundColor Yellow
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host 'Building renderer + NSIS installer...' -ForegroundColor Yellow
npm run build:installer
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$version = (Get-Content 'package.json' | ConvertFrom-Json).version
$setup = Join-Path $PSScriptRoot "release\MD Studio Setup $version.exe"
if (Test-Path $setup) {
  Write-Host "Done: $setup" -ForegroundColor Green
} else {
  Write-Host 'Build finished but setup EXE not found at expected path. Check release\ folder.' -ForegroundColor Yellow
}
