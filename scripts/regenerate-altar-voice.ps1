$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
$appExe = (Get-Content -LiteralPath (Join-Path $PSScriptRoot 'voice-app-path.txt') -Encoding utf8 -Raw).Trim()

$arguments = @(
  '--app-exe', $appExe,
  '--v3',
  '--overwrite',
  '--only', 'dialogue-facility-altar-02'
)

& node .\scripts\generate-voices-from-manifest.mjs @arguments
exit $LASTEXITCODE
