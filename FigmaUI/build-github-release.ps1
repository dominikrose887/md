#Requires -Version 5.1
<#
.SYNOPSIS
  Builds Windows release artifacts for GitHub Releases.

.DESCRIPTION
  - Produces both installer and portable executable artifacts.
  - Collects artifacts into release\github\v<version>.
  - Generates SHA256SUMS.txt for uploaded files.

.OUTPUTS
  FigmaUI\release\github\v<version>\*
#>
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host 'MD Studio - GitHub Release build' -ForegroundColor Cyan

# Avoid locked files from previous runs.
Get-Process -Name 'MD Studio' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 400

if (-not (Test-Path 'node_modules')) {
  Write-Host 'Installing dependencies (npm install)...' -ForegroundColor Yellow
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host 'Building installer + portable executable...' -ForegroundColor Yellow
npm run build:release
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$version = (Get-Content 'package.json' | ConvertFrom-Json).version
$releaseRoot = Join-Path $PSScriptRoot 'release'
$githubOut = Join-Path $releaseRoot "github\v$version"

if (-not (Test-Path $githubOut)) {
  New-Item -ItemType Directory -Path $githubOut -Force | Out-Null
}

$artifacts = @(
  (Join-Path $releaseRoot "MD Studio Setup $version.exe"),
  (Join-Path $releaseRoot "MD Studio $version.exe"),
  (Join-Path $releaseRoot "latest.yml")
)

$copiedFiles = @()
foreach ($artifact in $artifacts) {
  if (Test-Path $artifact) {
    $target = Join-Path $githubOut (Split-Path $artifact -Leaf)
    Copy-Item -Path $artifact -Destination $target -Force
    $copiedFiles += $target
  }
}

if ($copiedFiles.Count -eq 0) {
  Write-Host 'No artifacts found in release\ after build. Check electron-builder output.' -ForegroundColor Red
  exit 1
}

$checksumFile = Join-Path $githubOut 'SHA256SUMS.txt'
if (Test-Path $checksumFile) {
  Remove-Item $checksumFile -Force
}

foreach ($file in ($copiedFiles | Sort-Object)) {
  $hash = (Get-FileHash -Algorithm SHA256 -Path $file).Hash.ToLowerInvariant()
  $name = Split-Path $file -Leaf
  Add-Content -Path $checksumFile -Value "$hash  $name"
}

Write-Host "Done. GitHub artifacts are ready in: $githubOut" -ForegroundColor Green
Write-Host 'Upload these files to the GitHub Release assets list:' -ForegroundColor Green
Get-ChildItem -Path $githubOut -File | ForEach-Object { Write-Host " - $($_.Name)" }
