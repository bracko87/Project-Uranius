# Direct-owner execution of the exact approved Uranius migration 010.
# Password is prompted securely and never written to a file or command argument.
# Requires: Node.js, pinned portable PostgreSQL 17 psql.exe, trusted Supabase CA.
param(
  [Parameter(Mandatory=$true)]
  [string]$CaFile,
  [Parameter(Mandatory=$true)]
  [string]$PostgresBin
)
$ErrorActionPreference = 'Stop'
$ref = 'sdtsivgtcaoaeoihcwzd'
$digest = '26cdce51966cf2264ff2ec49affe8c987f5cbcb447040807c61354382092a170'
$psql = Join-Path $PostgresBin 'psql.exe'
if (!(Test-Path -LiteralPath $CaFile -PathType Leaf)) {
  throw 'Supabase TLS root CA file not found. No connection attempted.'
}
if (!(Test-Path -LiteralPath $psql -PathType Leaf)) {
  throw 'Portable PostgreSQL psql.exe not found. No connection attempted.'
}
& $psql --version | Out-Host
if ($LASTEXITCODE -ne 0) { throw 'psql unavailable; no connection attempted.' }
$script = Join-Path $PSScriptRoot 'apply-uranius-overview.mjs'
if (!(Test-Path -LiteralPath $script -PathType Leaf)) { throw 'Approved installer missing.' }
& node $script --review
if ($LASTEXITCODE -ne 0) { throw 'Exact manifest review failed; no connection attempted.' }

Write-Host 'Project: isolated Uranius sdtsivgtcaoaeoihcwzd'
Write-Host 'Migration: 010_overview_race_reader.sql'
Write-Host 'Original ProPeloton production is never targeted.'
Write-Host 'The following prompt is for the dedicated uranius_migrator database password.'
$secret = Read-Host 'Uranius migrator password' -AsSecureString
$ptr = [IntPtr]::Zero
try {
  $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  $password = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  if ([string]::IsNullOrWhiteSpace($password)) { throw 'Empty password; no connection attempted.' }
  $encoded = [uri]::EscapeDataString($password)
  $env:URANIUS_SUPABASE_PROJECT_REF = $ref
  $env:URANIUS_SUPABASE_URL = "https://$ref.supabase.co"
  $env:URANIUS_DATABASE_URL = "postgresql://uranius_migrator:$encoded@db.$ref.supabase.co:5432/postgres?sslmode=verify-full"
  $env:URANIUS_DATABASE_CA_FILE = (Resolve-Path -LiteralPath $CaFile).Path
  $env:URANIUS_PSQL_PATH = (Resolve-Path -LiteralPath $psql).Path
  $password = $null
  $encoded = $null
  & node $script --apply-reviewed-overview $digest
  if ($LASTEXITCODE -ne 0) {
    throw 'Guarded migration stopped; check the reported failure. Do not retry automatically.'
  }
  Write-Host 'Guarded migration command succeeded. Verify hosted ledger and permissions independently.'
} finally {
  foreach ($name in @('URANIUS_SUPABASE_PROJECT_REF','URANIUS_SUPABASE_URL',
      'URANIUS_DATABASE_URL','URANIUS_DATABASE_CA_FILE','URANIUS_PSQL_PATH')) {
    Remove-Item "Env:$name" -ErrorAction SilentlyContinue
  }
  if ($ptr -ne [IntPtr]::Zero) {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
  $secret = $null
}
