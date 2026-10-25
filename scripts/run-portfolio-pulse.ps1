param([Parameter(Mandatory = $true)][string]$NodePath)

$ErrorActionPreference = 'Stop'
$pulseRoot = Split-Path -Parent $PSScriptRoot
$pulseOutput = Join-Path $pulseRoot 'private\portfolio-pulse'
New-Item -ItemType Directory -Path $pulseOutput -Force | Out-Null
$pulseLog = Join-Path $pulseOutput 'run.log'
Set-Location -LiteralPath $pulseRoot
Add-Content -LiteralPath $pulseLog -Value "[$([DateTime]::UtcNow.ToString('o'))] Starting monthly pulse."
try {
    & $NodePath (Join-Path $PSScriptRoot 'portfolio-pulse.mjs') >> $pulseLog 2>&1
    $pulseExitCode = $LASTEXITCODE
    Add-Content -LiteralPath $pulseLog -Value "Completed with exit code $pulseExitCode."
    exit $pulseExitCode
} catch {
    Add-Content -LiteralPath $pulseLog -Value 'The pulse failed to start or finish. Run npm run pulse interactively for diagnostics.'
    exit 1
}
