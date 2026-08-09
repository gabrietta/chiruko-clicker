param(
  [switch]$DryRun
)

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
$appExe = (Get-Content -LiteralPath (Join-Path $PSScriptRoot 'voice-app-path.txt') -Encoding utf8 -Raw).Trim()

$arguments = @(
  '--app-exe', $appExe,
  '--v3',
  '--skip-existing',
  '--update-map'
)

if ($DryRun) { $arguments += '--dry-run' }
& node .\scripts\generate-voices-from-manifest.mjs @arguments
exit $LASTEXITCODE
