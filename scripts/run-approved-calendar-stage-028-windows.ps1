# Owner-local one-job acceptance only. No permanent worker or scheduler.
param(
 [Parameter(Mandatory=$true)][string]$CaFile,
 [Parameter(Mandatory=$true)][string]$PostgresBin,
 [Parameter(Mandatory=$true)][string]$ApprovedManifestSha256
)
$ErrorActionPreference='Stop'
if ($ApprovedManifestSha256 -cnotmatch '^[a-f0-9]{64}$') {throw 'Exact approved manifest digest required.'}
$psql=Join-Path $PostgresBin 'psql.exe'
if (!(Test-Path -LiteralPath $CaFile -PathType Leaf) -or !(Test-Path -LiteralPath $psql -PathType Leaf)) {throw 'Trusted TLS CA and PostgreSQL 17 client required.'}
$version=(& $psql --version)
if ($LASTEXITCODE -ne 0 -or $version -notmatch '17\.') {throw 'PostgreSQL 17 client required.'}
$script=Join-Path $PSScriptRoot 'run-uranius-calendar-stage-028.mjs'
& node $script --review $ApprovedManifestSha256
if ($LASTEXITCODE -ne 0) {throw 'Offline verification refused. No database connection.'}
Write-Host 'Isolated Uranius only. Mountain Tour Stage 1 only, two independent simulations, worker login maximum five minutes, restore NOLOGIN afterward. No scheduler or official effects.'
$confirmation=Read-Host 'Type RUN URANIUS JOB 028 to confirm the previously approved operation'
if ($confirmation -cne 'RUN URANIUS JOB 028') {throw 'Confirmation missing. No database connection.'}
$secret=Read-Host 'Isolated Uranius database postgres administrator password (hidden; NOT migrator password)' -AsSecureString
$ptr=[IntPtr]::Zero
try {
 $ptr=[System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
 $env:URANIUS_LOCAL_ADMIN_PASSWORD=[System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
 $env:URANIUS_SUPABASE_PROJECT_REF='sdtsivgtcaoaeoihcwzd'
 $env:URANIUS_SUPABASE_URL='https://sdtsivgtcaoaeoihcwzd.supabase.co'
 $env:URANIUS_DATABASE_CA_FILE=(Resolve-Path -LiteralPath $CaFile).Path
 $env:URANIUS_PSQL_PATH=(Resolve-Path -LiteralPath $psql).Path
 & node $script --execute-approved $ApprovedManifestSha256
 if ($LASTEXITCODE -ne 0) {throw '028 stopped. Do not retry before independent verification of job and worker login state.'}
} finally {
 foreach($name in @('URANIUS_LOCAL_ADMIN_PASSWORD','URANIUS_SUPABASE_PROJECT_REF','URANIUS_SUPABASE_URL','URANIUS_DATABASE_CA_FILE','URANIUS_PSQL_PATH')) {Remove-Item "Env:$name" -ErrorAction SilentlyContinue}
 if ($ptr -ne [IntPtr]::Zero) {[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
 $secret=$null
}
