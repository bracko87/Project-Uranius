# Local HTTPS-only Uranius Overview reader smoke; does not deploy or mutate SQL.
# The existing Node runner prompts interactively for reader password and publishable key.
param(
  [Parameter(Mandatory=$true)][string]$TlsCert,
  [Parameter(Mandatory=$true)][string]$TlsKey,
  [Parameter(Mandatory=$true)][string]$CaFile,
  [Parameter(Mandatory=$true)][string]$PostgresBin
)
$ErrorActionPreference = 'Stop'
$paths = @($TlsCert,$TlsKey,$CaFile)
foreach ($value in $paths) {
  if (!(Test-Path -LiteralPath $value -PathType Leaf)) {
    throw "Required certificate/key path does not exist; server not started: $value"
  }
}
$psql = Join-Path $PostgresBin 'psql.exe'
if (!(Test-Path -LiteralPath $psql -PathType Leaf)) { throw 'PostgreSQL 17 psql.exe not found.' }
$runner = Join-Path $PSScriptRoot 'run-uranius-hosted-smoke.mjs'
if (!(Test-Path -LiteralPath $runner -PathType Leaf)) { throw 'Uranius HTTPS smoke runner not found.' }
try {
  $env:URANIUS_SMOKE_TLS_CERT = (Resolve-Path -LiteralPath $TlsCert).Path
  $env:URANIUS_SMOKE_TLS_KEY = (Resolve-Path -LiteralPath $TlsKey).Path
  $env:URANIUS_DATABASE_CA_FILE = (Resolve-Path -LiteralPath $CaFile).Path
  $env:URANIUS_PSQL_PATH = (Resolve-Path -LiteralPath $psql).Path
  $env:URANIUS_CLOCK_READ_APPROVED = '1'
  $env:URANIUS_OVERVIEW_SCHEDULE_READ_APPROVED = '1'
  $env:URANIUS_SQUAD_READ_APPROVED = '1'
  # Migration 015 independently verified on isolated Uranius; UUID route remains
  # restricted to server-owned reader sessions, never public Data API.
  $env:URANIUS_SQUAD_UUID_READ_APPROVED = '1'
  Write-Host 'Local HTTPS Overview + Squad smoke: isolated Uranius project sdtsivgtcaoaeoihcwzd only.'
  Write-Host 'No schema writes, external listener, original production access or client Data API grants.'
  Write-Host 'The Node process will prompt privately for the uranius_smoke_reader password and Uranius publishable API key.'
  Write-Host 'Checking local TLS, SQL assets, CSS and frontend bundle BEFORE credential prompts.'
  & node $runner --offline-preflight
  if ($LASTEXITCODE -ne 0) { throw 'Local HTTPS startup preflight failed. No passwords requested; investigate the printed stage.' }
  & node $runner --reviewed-hosted-smoke
  if ($LASTEXITCODE -ne 0) { throw 'HTTPS read-only smoke stopped. Inspect fixed diagnostic messages; no automatic retry.' }
} finally {
  foreach ($name in @('URANIUS_SMOKE_TLS_CERT','URANIUS_SMOKE_TLS_KEY',
    'URANIUS_DATABASE_CA_FILE','URANIUS_PSQL_PATH',
    'URANIUS_CLOCK_READ_APPROVED','URANIUS_OVERVIEW_SCHEDULE_READ_APPROVED',
    'URANIUS_SQUAD_READ_APPROVED','URANIUS_SQUAD_UUID_READ_APPROVED')) {
    Remove-Item "Env:$name" -ErrorAction SilentlyContinue
  }
}
