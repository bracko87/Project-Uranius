[CmdletBinding(DefaultParameterSetName = 'Connect')]
param(
    [Parameter(Mandatory, ParameterSetName = 'Connect')][string]$PsqlPath,
    [Parameter(Mandatory, ParameterSetName = 'Connect')][string]$CaFile,
    [Parameter(ParameterSetName = 'Connect')][switch]$Apply,
    [Parameter(ParameterSetName = 'Connect')][switch]$ResumeExistingRole,
    [Parameter(ParameterSetName = 'Connect')][switch]$ClubReconstruction,
    [Parameter(ParameterSetName = 'Connect')][switch]$SyntheticWorld,
    [Parameter(ParameterSetName = 'Connect')][string]$ApprovedManifestSha256,
    [Parameter(Mandatory, ParameterSetName = 'Offline')][switch]$VerifyManifest
)

$ErrorActionPreference = 'Stop'
$ref = 'sdtsivgtcaoaeoihcwzd'
$dbHost = "db.$ref.supabase.co"
$repo = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $repo 'database/preparation'
$manifest = ConvertFrom-Json -InputObject (Get-Content -Raw -LiteralPath (Join-Path $dir 'manifest.json'))
$files = @('001_identity.sql','002_reference_schema.sql','003_access.sql','004_synthetic_reference.sql')
if ($manifest -isnot [array] -or $manifest.Count -ne $files.Count) { throw 'Unexpected migration manifest.' }
for ($i = 0; $i -lt $files.Count; $i++) {
    $hash = (Get-FileHash -LiteralPath (Join-Path $dir $files[$i]) -Algorithm SHA256).Hash
    if ($manifest[$i].file -cne $files[$i] -or $hash -ine $manifest[$i].sha256) {
        throw 'Migration name, order or checksum differs from the manifest.'
    }
}
if ($VerifyManifest) {
    $manifest
    return
}

if ($ClubReconstruction -and $SyntheticWorld) { throw 'Select only one reconstruction package.' }
$isReconstruction = $ClubReconstruction -or $SyntheticWorld
if ($isReconstruction -and -not $ResumeExistingRole) { throw 'Reconstruction requires the existing migration role.' }
$approvedManifestPath = if ($SyntheticWorld) {
    Join-Path $repo 'database/reconstruction/world/manifest.json'
} elseif ($ClubReconstruction) {
    Join-Path $repo 'database/reconstruction/manifest.json'
} else {
    Join-Path $dir 'manifest.json'
}
if ($Apply -and ((Get-FileHash -LiteralPath $approvedManifestPath -Algorithm SHA256).Hash -ine $ApprovedManifestSha256)) {
    throw 'Explicit approval of the exact migration manifest SHA-256 is required.'
}

$psql = (Resolve-Path -LiteralPath $PsqlPath).ProviderPath
$ca = (Resolve-Path -LiteralPath $CaFile).ProviderPath

if ([IO.Path]::GetFileName($psql) -ne 'psql.exe' -or $ca.StartsWith($repo + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Select the verified psql executable and a certificate outside this checkout.'
}
$version = & $psql --version
if ($LASTEXITCODE -ne 0 -or $version -notmatch '^psql \(PostgreSQL\) 17\.') { throw 'Expected PostgreSQL 17 psql.' }

. (Join-Path $PSScriptRoot 'UraniusPsqlBatch.ps1')
if ([Console]::IsInputRedirected) { throw 'Run this script directly in an interactive Windows PowerShell terminal.' }

$connection = @{
    PGHOST = $dbHost; PGPORT = '5432'; PGDATABASE = 'postgres'; PGUSER = 'postgres'
    PGSSLMODE = 'verify-full'; PGSSLROOTCERT = $ca; PGCONNECT_TIMEOUT = '10'; PGGSSENCMODE = 'disable'
    PGOPTIONS = '-c statement_timeout=30000 -c lock_timeout=10000'
}

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

Write-Host ('Target: ' + $dbHost + ' (verify-full). Press Ctrl+C to cancel.')
function Initialize-UraniusMigrationRole {
    $adminSecret = Read-Host 'Uranius postgres database password' -AsSecureString
    $adminPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminSecret)
    try {
        $adminPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($adminPointer)
        if (!$adminPassword) { throw 'The Uranius postgres password was empty.' }
        Invoke-UraniusPsqlBatch -Executable $psql -Connection $connection -Password $adminPassword -Stage 'Read-only Uranius login and fresh-state check' -Sql ('BEGIN READ ONLY;' + $fresh + 'ROLLBACK;') | Out-Null
        Write-Host 'Uranius login, TLS and fresh-state checks passed.'
        if (-not $Apply) { return }

        $migrationSecret = Read-Host 'Choose the uranius_migrator password (16+ printable ASCII characters, no spaces)' -AsSecureString
        $confirmSecret = Read-Host 'Confirm the uranius_migrator password' -AsSecureString
        $migrationPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($migrationSecret)
        $confirmPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmSecret)
        try {
            $migrationPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($migrationPointer)
            $confirmation = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmPointer)
            if ($migrationPassword -cne $confirmation) { throw 'Migration passwords do not match. No write was attempted.' }
            if ($migrationPassword -ceq $adminPassword) { throw 'Use a distinct migration-role password. No write was attempted.' }
            $verifier = New-UraniusScramVerifier $migrationPassword

            $bootstrap = @'
CREATE ROLE uranius_migrator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOINHERIT NOREPLICATION NOBYPASSRLS;
GRANT CONNECT, CREATE ON DATABASE postgres TO uranius_migrator;
DO $ BEGIN
  IF NOT has_database_privilege('uranius_migrator', 'postgres', 'CONNECT')
     OR NOT has_database_privilege('uranius_migrator', 'postgres', 'CREATE') THEN
    RAISE EXCEPTION 'Migration role bootstrap grants were ineffective';
  END IF;
END $;
'@
            $roleSql = 'BEGIN;' + $fresh + $bootstrap + ('ALTER ROLE uranius_migrator LOGIN PASSWORD ''{0}'';' -f $verifier) + 'COMMIT;'
            Invoke-UraniusPsqlBatch -Executable $psql -Connection $connection -Password $adminPassword -Stage 'Restricted role bootstrap' -Sql $roleSql | Out-Null
            Remove-Variable verifier,roleSql
            Write-Host 'Restricted role created.'
            return $migrationSecret.Copy()

        }
        finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($migrationPointer)
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmPointer)
            $migrationSecret.Dispose()
            $confirmSecret.Dispose()
        }
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($adminPointer)
        $adminSecret.Dispose()
    }
}

$migrationInput = if ($ResumeExistingRole) {
    Read-Host 'Existing Uranius migration-role password' -AsSecureString
} else {
    Initialize-UraniusMigrationRole
}
if ($null -eq $migrationInput) { return }
$migrationPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($migrationInput)
try {
    $migrationPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($migrationPtr)
    if (!$migrationPassword) { throw 'Migration password was empty.' }
    $connection.PGUSER = 'uranius_migrator'
    Invoke-UraniusPsqlBatch -Executable $psql -Connection $connection -Password $migrationPassword -Stage 'Read-only migration login probe' -Sql 'BEGIN READ ONLY; SELECT 1; ROLLBACK;' | Out-Null
    Write-Host 'Read-only migration login probe passed.'
    if (-not $isReconstruction) {
        $preflight = Get-Content -Raw -LiteralPath (Join-Path $dir 'preflight.sql')
        Invoke-UraniusPsqlBatch -Executable $psql -Connection $connection -Password $migrationPassword -Stage 'Read-only migration-role and empty-ledger check' -Sql ('BEGIN READ ONLY;' + $preflight + 'ROLLBACK;') | Out-Null
        Write-Host 'Restricted migration login, TLS and fresh-state checks passed.'
    }
    if (-not $Apply) { return }

    $keys = @('URANIUS_SUPABASE_PROJECT_REF','URANIUS_SUPABASE_URL','URANIUS_DATABASE_CA_FILE','URANIUS_DATABASE_URL','URANIUS_PSQL_PATH')
    $saved = @{}
    foreach ($key in $keys) { $saved[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
    try {
        $env:URANIUS_SUPABASE_PROJECT_REF = $ref
        $env:URANIUS_SUPABASE_URL = 'https://' + $ref + '.supabase.co'
        $env:URANIUS_DATABASE_CA_FILE = $ca
        $env:URANIUS_PSQL_PATH = $psql
        $env:URANIUS_DATABASE_URL = 'postgresql://uranius_migrator:{0}@{1}:5432/postgres?sslmode=verify-full' -f [Uri]::EscapeDataString($migrationPassword),$dbHost
        if ($SyntheticWorld) {
            & node (Join-Path $PSScriptRoot 'apply-synthetic-world.mjs') --apply-reviewed-synthetic-world $ApprovedManifestSha256
        } elseif ($ClubReconstruction) {
            & node (Join-Path $PSScriptRoot 'apply-club-reconstruction.mjs') --apply-reviewed-club-reconstruction $ApprovedManifestSha256
        } else {
            & node (Join-Path $PSScriptRoot 'initialize-sandbox-database.mjs') --apply-reviewed-initial-migrations $ApprovedManifestSha256
        }
        if ($LASTEXITCODE -ne 0) { throw 'Initializer stopped. Inspect the Uranius ledger before retrying.' }
    }
    finally {
        foreach ($key in $keys) { [Environment]::SetEnvironmentVariable($key, $saved[$key], 'Process') }
    }

    if ($isReconstruction) { return }

    $verify = for ($i = 0; $i -lt $manifest.Count; $i++) { '\set hash' + ($i + 1) + ' ' + $manifest[$i].sha256 }
    $verifySql = ($verify -join [Environment]::NewLine) + [Environment]::NewLine + (Get-Content -Raw -LiteralPath (Join-Path $dir 'verify-initialization.sql'))
    Invoke-UraniusPsqlBatch -Executable $psql -Connection $connection -Password $migrationPassword -Stage 'Post-migration verification' -Sql $verifySql
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($migrationPtr)
    $migrationInput.Dispose()
}
