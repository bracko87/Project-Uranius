# 023 dormant RELEASE SCRIPT: NOT owner-approved, do not run before explicit exact-hash approval.
# Isolated Uranius only, no original production; dedicated direct TLS migrator only.
# Requires explicit digest, local confirmation and private direct migrator password.
param(
 [Parameter(Mandatory=$true)][string]$CaFile,
 [Parameter(Mandatory=$true)][string]$PostgresBin,
 [Parameter(Mandatory=$true)][string]$ApprovedManifestSha256
)
$ErrorActionPreference='Stop'
$ref='sdtsivgtcaoaeoihcwzd'
if ($ApprovedManifestSha256 -cnotmatch '^[a-f0-9]{64}$') {throw 'Exact owner-approved 023 manifest digest required. No connection attempted.'}
$psql=Join-Path $PostgresBin 'psql.exe'
if (!(Test-Path -LiteralPath $CaFile -PathType Leaf)) {throw 'Database TLS CA missing. No connection attempted.'}
if (!(Test-Path -LiteralPath $psql -PathType Leaf)) {throw 'Portable PostgreSQL 17 psql.exe missing. No connection attempted.'}
$version=(& $psql --version)
if ($LASTEXITCODE -ne 0 -or $version -notmatch '17\.') {throw 'PostgreSQL 17 client required. No connection attempted.'}
$script=Join-Path $PSScriptRoot 'run-uranius-first-hosted-race.mjs'
if (!(Test-Path -LiteralPath $script -PathType Leaf)) {throw '023 guarded installer missing.'}
& node $script --review $ApprovedManifestSha256
if ($LASTEXITCODE -ne 0) {throw 'Frozen 023 fingerprint/ledger preflight failed. No connection attempted.'}
Write-Host 'OWNER APPROVAL: isolated project sdtsivgtcaoaeoihcwzd ONLY.'
Write-Host 'Scope: Add Club B to Club A flat classic; copy five selected riders; rehearse and commit exactly one private synthetic archive. No persistent new permissions, worker, scheduler, official results, finance or clock advance.'
Write-Host 'Only direct uranius_migrator TLS sessions accepted. Opponent, five selections and private archive commit together; rehearsal rolled back.'
$confirmation=Read-Host 'Type RUN URANIUS RACE 023 to confirm the explicitly authorized isolated race'
if ($confirmation -cne 'RUN URANIUS RACE 023') {throw 'Local confirmation missing. No database connection attempted.'}
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
 & node $script --execute-approved $ApprovedManifestSha256
 if ($LASTEXITCODE -ne 0) {throw 'Guarded Uranius 023 race did not report success. STOP; do not retry without checking hosted state.'}
 Write-Host 'Guarded 023 race exited successfully. Independent hosted verification is still required.'
} finally {
 foreach($name in @('URANIUS_SUPABASE_PROJECT_REF','URANIUS_SUPABASE_URL',
  'URANIUS_DATABASE_URL','URANIUS_DATABASE_CA_FILE','URANIUS_PSQL_PATH')) {
  Remove-Item "Env:$name" -ErrorAction SilentlyContinue
 }
 if ($ptr -ne [IntPtr]::Zero) {[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
 $secret=$null
}
