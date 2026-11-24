# Owner-approved 014 on isolated Uranius ONLY. Never targets original ProPeloton.
# Requires explicit digest, local confirmation and private direct migrator password.
param(
 [Parameter(Mandatory=$true)][string]$CaFile,
 [Parameter(Mandatory=$true)][string]$PostgresBin,
 [Parameter(Mandatory=$true)][string]$ApprovedManifestSha256
)
$ErrorActionPreference='Stop'
$ref='sdtsivgtcaoaeoihcwzd'
$expected='620d5eacbd836e13a72fdaac9159162061fab8b490a30528b177d25d7952db62'
if ($ApprovedManifestSha256 -cne $expected) {throw 'Exact owner-approved 014 manifest digest required. No connection attempted.'}
$psql=Join-Path $PostgresBin 'psql.exe'
if (!(Test-Path -LiteralPath $CaFile -PathType Leaf)) {throw 'Database TLS CA missing. No connection attempted.'}
if (!(Test-Path -LiteralPath $psql -PathType Leaf)) {throw 'Portable PostgreSQL 17 psql.exe missing. No connection attempted.'}
$version=(& $psql --version)
if ($LASTEXITCODE -ne 0 -or $version -notmatch '17\.') {throw 'PostgreSQL 17 client required. No connection attempted.'}
$script=Join-Path $PSScriptRoot 'apply-uranius-rider-identity.mjs'
if (!(Test-Path -LiteralPath $script -PathType Leaf)) {throw '014 guarded installer missing.'}
& node $script --review
if ($LASTEXITCODE -ne 0) {throw 'Frozen 014 fingerprint/ledger preflight failed. No connection attempted.'}
Write-Host 'OWNER APPROVAL: isolated project sdtsivgtcaoaeoihcwzd ONLY.'
Write-Host 'Scope: 200 private synthetic UUID mappings; no original riders or production operations.'
Write-Host 'Only direct uranius_migrator TLS sessions accepted. Installation will be atomic.'
$confirmation=Read-Host 'Type APPLY URANIUS 014 to confirm previously authorized isolated migration'
if ($confirmation -cne 'APPLY URANIUS 014') {throw 'Local confirmation missing. No database connection attempted.'}
$secret=Read-Host 'Dedicated Uranius migrator password (hidden)' -AsSecureString
$ptr=[IntPtr]::Zero
try {
 $ptr=[System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
 $password=[System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
 if ([string]::IsNullOrWhiteSpace($password)) {throw 'Migration password is empty. No connection attempted.'}
 $encoded=[uri]::EscapeDataString($password)
 $env:URANIUS_SUPABASE_PROJECT_REF=$ref
 $env:URANIUS_SUPABASE_URL="https://$ref.supabase.co"
 $env:URANIUS_DATABASE_URL="postgresql://uranius_migrator:$encoded@db.$ref.supabase.co:5432/postgres?sslmode=verify-full"
 $env:URANIUS_DATABASE_CA_FILE=(Resolve-Path -LiteralPath $CaFile).Path
 $env:URANIUS_PSQL_PATH=(Resolve-Path -LiteralPath $psql).Path
 $password=$null
 $encoded=$null
 & node $script --apply-approved-014 $ApprovedManifestSha256
 if ($LASTEXITCODE -ne 0) {throw 'Guarded Uranius 014 installation did not report success. STOP; do not retry without checking hosted state.'}
 Write-Host 'Guarded 014 migration exited successfully. Independent hosted verification is still required.'
} finally {
 foreach($name in @('URANIUS_SUPABASE_PROJECT_REF','URANIUS_SUPABASE_URL',
  'URANIUS_DATABASE_URL','URANIUS_DATABASE_CA_FILE','URANIUS_PSQL_PATH')) {
  Remove-Item "Env:$name" -ErrorAction SilentlyContinue
 }
 if ($ptr -ne [IntPtr]::Zero) {[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
 $secret=$null
}
