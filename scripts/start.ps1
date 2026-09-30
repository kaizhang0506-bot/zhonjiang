$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..
$port = if ($env:DEPLOY_RUN_PORT) { $env:DEPLOY_RUN_PORT } else { '5000' }
pnpm next start --hostname 0.0.0.0 --port $port
