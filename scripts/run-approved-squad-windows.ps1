# OWNER-ONLY guarded Squad 013 migration launcher, NOT approved by default.
# Do not invoke unless separate explicit owner approval for exact manifest digest.
param(
 [Parameter(Mandatory=$true)][string]$CaFile,
 [Parameter(Mandatory=$true)][string]$PostgresBin,
 [Parameter(Mandatory=$true)][string]$ApprovedManifestSha256
)
$ErrorActionPreference='Stop'
$ref='sdtsivgtcaoaeoihcwzd'
$expected='ab63e7949889a49bd33fb584885f4911df6b027eb20d3aed3be43e77f0ccaa7a'
if ($ApprovedManifestSha256 -cne $expected) {throw 'Exact separate Squad 013 owner approval digest required. No connection attempted.'}
$psql=Join-Path $PostgresBin 'psql.exe'
if (!(Test-Path -LiteralPath $CaFile -PathType Leaf)) {throw 'Supabase TLS CA missing. No connection attempted.'}
if (!(Test-Path -LiteralPath $psql -PathType Leaf)) {throw 'Portable PostgreSQL psql.exe missing. No connection attempted.'}
& $psql --version | Out-Host
if ($LASTEXITCODE -ne 0) {throw 'psql version unavailable. No connection attempted.'}
$script=Join-Path $PSScriptRoot 'apply-uranius-squad.mjs'
if (!(Test-Path -LiteralPath $script -PathType Leaf)) {throw 'Guarded Squad installer missing.'}
& node $script --review
if ($LASTEXITCODE -ne 0) {throw 'Frozen Squad package verification failed. No connection attempted.'}
Write-Host 'Only isolated Uranius sdtsivgtcaoaeoihcwzd is targeted.'
Write-Host 'Migration 013: five extra rider columns to restricted reader; original production excluded.'
$confirmation=Read-Host 'Type APPLY URANIUS 013 to confirm the separately approved exact digest'
if ($confirmation -cne 'APPLY URANIUS 013') {throw 'Confirmation not received. No connection attempted.'}
$secret=Read-Host 'Dedicated Uranius migrator password' -AsSecureString
$ptr=[IntPtr]::Zero
try {
 $ptr=[System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
 $password=[System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
 if ([string]::IsNullOrWhiteSpace($password)) {throw 'Missing password. No connection attempted.'}
 $encoded=[uri]::EscapeDataString($password)
 $env:URANIUS_SUPABASE_PROJECT_REF=$ref
 $env:URANIUS_SUPABASE_URL="https://$ref.supabase.co"
 $env:URANIUS_DATABASE_URL="postgresql://uranius_migrator:$encoded@db.$ref.supabase.co:5432/postgres?sslmode=verify-full"
 $env:URANIUS_DATABASE_CA_FILE=(Resolve-Path -LiteralPath $CaFile).Path
 $env:URANIUS_PSQL_PATH=(Resolve-Path -LiteralPath $psql).Path
 $password=$null
 $encoded=$null
 & node $script --apply-reviewed-squad $ApprovedManifestSha256
 if ($LASTEXITCODE -ne 0) {throw 'Guarded Squad 013 failed. STOP; inspect before any retry.'}
 Write-Host 'Guarded installer exited successfully. Verify hosted ledger and ACL independently.'
}finally{
 foreach($name in @('URANIUS_SUPABASE_PROJECT_REF','URANIUS_SUPABASE_URL',
 'URANIUS_DATABASE_URL','URANIUS_DATABASE_CA_FILE','URANIUS_PSQL_PATH')){
  Remove-Item "Env:$name" -ErrorAction SilentlyContinue
 }
 if ($ptr -ne [IntPtr]::Zero){[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
 $secret=$null
}
