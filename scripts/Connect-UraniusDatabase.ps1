[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$PsqlPath,
    [Parameter(Mandatory)][string]$CaFile,
    [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$ref = 'sdtsivgtcaoaeoihcwzd'
$dbHost = "db.$ref.supabase.co"
$repo = Split-Path -Parent $PSScriptRoot
$psql = (Resolve-Path -LiteralPath $PsqlPath).ProviderPath
$ca = (Resolve-Path -LiteralPath $CaFile).ProviderPath

if ([IO.Path]::GetFileName($psql) -ne 'psql.exe' -or $ca.StartsWith($repo + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Select the verified psql executable and a certificate outside this checkout.'
}
$version = & $psql --version
if ($LASTEXITCODE -ne 0 -or $version -notmatch '^psql \(PostgreSQL\) 17\.') { throw 'Expected PostgreSQL 17 psql.' }

function Invoke-UraniusPsql([string[]]$Arguments) {
    & $psql -X --set=ON_ERROR_STOP=1 -P pager=off @Arguments
    if ($LASTEXITCODE -ne 0) { throw 'Connection or SQL failed. Inspect the role and ledger before retrying.' }
}

$keys = @('Path','URANIUS_SUPABASE_PROJECT_REF','URANIUS_SUPABASE_URL','URANIUS_DATABASE_CA_FILE','URANIUS_DATABASE_URL',
    'PGHOST','PGPORT','PGDATABASE','PGUSER','PGSSLMODE','PGSSLROOTCERT','PGCONNECT_TIMEOUT','PGGSSENCMODE')
$keys += @(Get-ChildItem Env: | Where-Object Name -like 'PG*' | Select-Object -ExpandProperty Name)
$keys = $keys | Sort-Object -Unique
$saved = @{}
foreach ($key in $keys) { $saved[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }

try {
    foreach ($key in $keys | Where-Object { $_ -like 'PG*' }) {
        [Environment]::SetEnvironmentVariable($key, $null, 'Process')
    }
    $env:PGHOST = $dbHost
    $env:PGPORT = '5432'
    $env:PGDATABASE = 'postgres'
    $env:PGUSER = 'postgres'
    $env:PGSSLMODE = 'verify-full'
    $env:PGSSLROOTCERT = $ca
    $env:PGCONNECT_TIMEOUT = '10'
    $env:PGGSSENCMODE = 'disable'
    $fresh = @'
DO $$
BEGIN
    IF current_database() <> 'postgres' OR current_user <> 'postgres' OR session_user <> 'postgres'
        OR current_setting('server_version_num')::integer / 10000 <> 17
        OR NOT EXISTS (SELECT 1 FROM pg_stat_ssl WHERE pid = pg_backend_pid() AND ssl) THEN
        RAISE EXCEPTION 'Database, login, version or TLS mismatch';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'uranius_migrator')
        OR EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public')
        OR to_regnamespace('uranius_private') IS NOT NULL
        OR to_regnamespace('uranius_catalog') IS NOT NULL THEN
        RAISE EXCEPTION 'Expected fresh Uranius state';
    END IF;
END $$;
'@
    Write-Host "Target: $dbHost (verify-full). Enter the Uranius postgres password at the psql prompt."
    if (-not $Apply) {
        Invoke-UraniusPsql @('-W','-c','BEGIN READ ONLY','-c',$fresh,'-c','ROLLBACK')
        Write-Host 'Read-only endpoint and fresh-state verification passed.'
        return
    }

    $dir = Join-Path $repo 'database/preparation'
    $manifest = @(Get-Content -Raw -LiteralPath (Join-Path $dir 'manifest.json') | ConvertFrom-Json)
    $files = @('001_identity.sql','002_reference_schema.sql','003_access.sql','004_synthetic_reference.sql')
    if ($manifest.Count -ne $files.Count) { throw 'Unexpected migration manifest.' }
    for ($i = 0; $i -lt $files.Count; $i++) {
        $hash = (Get-FileHash -LiteralPath (Join-Path $dir $files[$i]) -Algorithm SHA256).Hash
        if ($manifest[$i].file -cne $files[$i] -or $hash -ine $manifest[$i].sha256) {
            throw 'Migration name, order or checksum differs from the manifest.'
        }
    }

    $bootstrap = @'
CREATE ROLE uranius_migrator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOINHERIT NOREPLICATION NOBYPASSRLS;
GRANT CONNECT, CREATE ON DATABASE postgres TO uranius_migrator;
GRANT USAGE ON SCHEMA auth TO uranius_migrator;
GRANT REFERENCES (id) ON auth.users TO uranius_migrator;
GRANT EXECUTE ON FUNCTION auth.uid() TO uranius_migrator;
'@
    Write-Host 'Choose and confirm a distinct migration password when psql prompts for it.'
    Invoke-UraniusPsql @('-W','--single-transaction','-c',$fresh,'-c',$bootstrap,
        '-c','\password uranius_migrator','-c','ALTER ROLE uranius_migrator LOGIN;')

    $secret = Read-Host 'Re-enter the migration-role password for the initializer' -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    try {
        $env:Path = (Split-Path -Parent $psql) + [IO.Path]::PathSeparator + $saved['Path']
        $env:URANIUS_SUPABASE_PROJECT_REF = $ref
        $env:URANIUS_SUPABASE_URL = "https://$ref.supabase.co"
        $env:URANIUS_DATABASE_CA_FILE = $ca
        $encoded = [Uri]::EscapeDataString([Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer))
        $env:URANIUS_DATABASE_URL = 'postgresql://uranius_migrator:{0}@{1}:5432/postgres?sslmode=verify-full' -f $encoded,$dbHost
        Remove-Variable encoded
        & node (Join-Path $PSScriptRoot 'initialize-sandbox-database.mjs') --apply-reviewed-initial-migrations
        if ($LASTEXITCODE -ne 0) { throw 'Initializer stopped. Inspect the Uranius ledger before retrying.' }
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        $secret.Dispose()
        [Environment]::SetEnvironmentVariable('URANIUS_DATABASE_URL', $null, 'Process')
    }

    $env:PGUSER = 'uranius_migrator'
    Write-Host 'Enter the migration-role password for read-only verification.'
    $verify = @('-W','-f',(Join-Path $dir 'verify-initialization.sql'))
    for ($i = 0; $i -lt $manifest.Count; $i++) { $verify += '--set=hash' + ($i + 1) + '=' + $manifest[$i].sha256 }
    Invoke-UraniusPsql $verify
}
finally {
    foreach ($key in $keys) { [Environment]::SetEnvironmentVariable($key, $saved[$key], 'Process') }
}
