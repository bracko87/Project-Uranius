# Read-only live Overview A/B test using verified manager Auth + restricted PG reader.
# No loopback cert/key or local webserver needed. No database schema/data writes.
param(
  [Parameter(Mandatory=$true)][string]$CaFile,
  [Parameter(Mandatory=$true)][string]$PostgresBin
)
$ErrorActionPreference='Stop'
if (!(Test-Path -LiteralPath $CaFile -PathType Leaf)) { throw 'Database CA file not found; no connection attempted.' }
$psql=Join-Path $PostgresBin 'psql.exe'
if (!(Test-Path -LiteralPath $psql -PathType Leaf)) { throw 'PostgreSQL psql.exe not found; no connection attempted.' }
$script=Join-Path $PSScriptRoot 'verify-uranius-overview-live.mjs'
if (!(Test-Path -LiteralPath $script -PathType Leaf)) { throw 'Read-only Overview verification script not found.' }
try {
  $env:URANIUS_DATABASE_CA_FILE=(Resolve-Path -LiteralPath $CaFile).Path
  $env:URANIUS_PSQL_PATH=(Resolve-Path -LiteralPath $psql).Path
  Write-Host 'Uranius 010 live A/B Overview: verified Auth + TLS restricted PostgreSQL reader.'
  Write-Host 'No local web certificate required. All credentials prompted privately.'
  Write-Host 'Do not use the postgres or migrator database password as the smoke-reader password.'
  & node $script --verify-live-overview-read-only
  if ($LASTEXITCODE -ne 0) { throw 'Read-only Overview verification stopped; no automatic retry.' }
} finally {
  Remove-Item Env:URANIUS_DATABASE_CA_FILE -ErrorAction SilentlyContinue
  Remove-Item Env:URANIUS_PSQL_PATH -ErrorAction SilentlyContinue
}
