param(
  [switch]$DryRun
)

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
$appExe = (Get-Content -LiteralPath (Join-Path $PSScriptRoot 'voice-app-path.txt') -Encoding utf8 -Raw).Trim()

$arguments = @(
  '--app-exe', $appExe,
  '--v3',
  '--overwrite',
  '--update-map',
  '--only', 'event-purchase,event-upgrade,event-doctrine,event-prestige,dialogue-base-01,dialogue-base-02'
)

if ($DryRun) { $arguments += '--dry-run' }
& node .\scripts\generate-voices-from-manifest.mjs @arguments
exit $LASTEXITCODE
