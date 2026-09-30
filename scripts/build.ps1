$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..
pnpm next build --webpack
