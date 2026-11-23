param([string]$PostgresBin, [string]$OpenSsl, [string]$ScratchRoot, [switch]$ManagementSmoke)
$ErrorActionPreference='Stop'
if ([Console]::IsInputRedirected) { throw 'Run in an interactive Windows PowerShell terminal.' }
$repo=Split-Path -Parent $PSScriptRoot
$wrapper=Join-Path $repo 'scripts/Connect-UraniusDatabase.ps1'
$world=Join-Path $repo 'database/reconstruction/world'
$psql=(Resolve-Path (Join-Path $PostgresBin 'psql.exe')).ProviderPath
$pgctl=Join-Path $PostgresBin 'pg_ctl.exe'
$root=Join-Path $ScratchRoot ('uranius-006-test-'+[Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($root) | Out-Null
$data=Join-Path $root 'data'
$ca=Join-Path $root 'ca.crt'
$key=Join-Path $root 'fixture.key'
$shim=Join-Path $root 'psql.exe'
$hostName='db.sdtsivgtcaoaeoihcwzd.supabase.co'
$digest='7df2b37dec41fa6ddd93eb22f48bcb149f72b49f7857705805d572cb98995081'

function Expect-Denial([scriptblock]$Run,[string]$Pattern) {
    try { & $Run; throw 'Expected rejection.' }
    catch { if ($_.Exception.Message -notlike $Pattern) { throw } }
}
Expect-Denial { & $wrapper -PsqlPath unused -CaFile unused -ClubReconstruction -SyntheticWorld -ResumeExistingRole -Apply } '*only one*'
Expect-Denial { & $wrapper -PsqlPath unused -CaFile unused -SyntheticWorld -Apply } '*existing migration role*'
Expect-Denial { & $wrapper -PsqlPath unused -CaFile unused -SyntheticWorld -ResumeExistingRole -Apply -ApprovedManifestSha256 ('0' * 64) } '*exact migration manifest*'

try {
    $ErrorActionPreference = 'Continue'
    & $OpenSsl req -x509 -newkey rsa:2048 -nodes -days 1 -subj "/CN=$hostName" -addext "subjectAltName=DNS:$hostName" -out $ca -keyout $key 2>$null
    $certificateExitCode = $LASTEXITCODE
} finally { $ErrorActionPreference = 'Stop' }
if ($certificateExitCode -ne 0) { throw 'Fixture certificate generation failed.' }
$fixtureAdmin=if ($ManagementSmoke) {'fixture_admin'} else {'postgres'}
& (Join-Path $PostgresBin 'initdb.exe') -D $data -U $fixtureAdmin -A trust --no-locale --no-sync -E UTF8 | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Fixture database initialization failed.' }
Copy-Item -LiteralPath $ca -Destination (Join-Path $data 'server.crt')
Copy-Item -LiteralPath $key -Destination (Join-Path $data 'server.key')
$proxy=@'
using System;
using System.Diagnostics;
public static class PsqlProxy {
  public static int Main(string[] args) {
    if (Array.IndexOf(args,"--version") >= 0) { Console.WriteLine("psql (PostgreSQL) 17.12"); return 0; }
    if (Environment.GetEnvironmentVariable("PGHOST") != "db.sdtsivgtcaoaeoihcwzd.supabase.co" ||
        Environment.GetEnvironmentVariable("PGPORT") != "5432" ||
        Environment.GetEnvironmentVariable("PGSSLMODE") != "verify-full" ||
        Environment.GetEnvironmentVariable("PGUSER") != "uranius_migrator") return 77;
    var p = new ProcessStartInfo(@"__PSQL__", String.Join(" ",args));
    p.UseShellExecute=false; p.CreateNoWindow=true;
    p.RedirectStandardInput=true; p.RedirectStandardOutput=true; p.RedirectStandardError=true;
    p.EnvironmentVariables["PGHOSTADDR"]="127.0.0.1"; p.EnvironmentVariables["PGPORT"]="45680";
    using (var c=Process.Start(p)) {
      var o=c.StandardOutput.ReadToEndAsync(); var e=c.StandardError.ReadToEndAsync();
      c.StandardInput.Write(Console.In.ReadToEnd()); c.StandardInput.Close();
      if (!c.WaitForExit(20000)) { c.Kill(); return 78; }
      Console.Write(o.GetAwaiter().GetResult()); Console.Error.Write(e.GetAwaiter().GetResult());
      return c.ExitCode;
    }
  }
}
'@
Add-Type -Language CSharp -OutputAssembly $shim -OutputType ConsoleApplication -TypeDefinition ($proxy.Replace('__PSQL__',$psql))

function Local-Sql([string]$Sql,[string]$User=$fixtureAdmin,[string]$Database='postgres') {
    $connection="host=127.0.0.1 hostaddr=127.0.0.1 port=45680 dbname=$Database user=$User sslmode=disable connect_timeout=5"
    $result=$Sql | & $psql -X -q -w -At -v ON_ERROR_STOP=1 -d $connection -f -
    if ($LASTEXITCODE -ne 0) { throw 'Disposable SQL failed.' }
    return $result
}
function Read-Host {
    param([string]$Prompt,[switch]$AsSecureString)
    if ($Prompt -like '*publishable API key*' -and !$AsSecureString) { return 'sb_publishable_offlinefixture' }
    if (!$AsSecureString -or ($Prompt -notlike '*Existing*' -and $Prompt -notlike '*fixture manager*')) { throw 'Unexpected prompt.' }
    ConvertTo-SecureString 'offline-loopback-fixture-only' -AsPlainText -Force
}

& $pgctl -D $data -l (Join-Path $root 'postgres.log') -o '-h 127.0.0.1 -p 45680 -c ssl=on' -w start
if ($LASTEXITCODE -ne 0) { throw 'Fixture database start failed.' }
try {
    Local-Sql 'CREATE ROLE uranius_migrator LOGIN NOINHERIT; CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); GRANT CONNECT, CREATE ON DATABASE postgres TO uranius_migrator;' | Out-Null
    $manifest=ConvertFrom-Json -InputObject (Get-Content -Raw (Join-Path $world 'manifest.json'))
    $sql="BEGIN; SELECT set_config('uranius.approved_project_ref','sdtsivgtcaoaeoihcwzd',true);"
    foreach ($entry in $manifest.requires) {
        $folder=if ($entry.file.StartsWith('005_')) {'database/reconstruction'} else {'database/preparation'}
        $file=Join-Path (Join-Path $repo $folder) $entry.file
        if ((Get-FileHash -LiteralPath $file).Hash -ine $entry.sha256) { throw 'Foundation checksum mismatch.' }
        $sql+=(Get-Content -Raw $file)+" INSERT INTO uranius_private.migration_ledger(version,sha256) VALUES ('$($entry.file)','$($entry.sha256)');"
    }
    Local-Sql ($sql+'COMMIT;') uranius_migrator | Out-Null
    $options=@{PsqlPath=$shim; CaFile=$ca; ResumeExistingRole=$true; SyntheticWorld=$true; Apply=$true; ApprovedManifestSha256=$digest}
    $prior=$manifest.requires[4].sha256
    Local-Sql "UPDATE uranius_private.migration_ledger SET sha256=repeat('0',64) WHERE version='005_club_identity.sql';" | Out-Null
    Expect-Denial { & $wrapper @options } '*Inspect the Uranius ledger*'
    if ((Local-Sql "SELECT to_regclass('uranius_game.stage_calendar') IS NULL;") -ne 't') { throw 'Ledger drift bypassed.' }
    Local-Sql "UPDATE uranius_private.migration_ledger SET sha256='$prior' WHERE version='005_club_identity.sql'; CREATE TABLE uranius_game.opening_balances(collision integer);" | Out-Null
    Expect-Denial { & $wrapper @options } '*Inspect the Uranius ledger*'
    if ((Local-Sql "SELECT count(*)=5 AND to_regclass('uranius_game.stage_calendar') IS NULL FROM uranius_private.migration_ledger;") -ne 't') { throw 'Rollback failed.' }
    Local-Sql 'DROP TABLE uranius_game.opening_balances;' | Out-Null
    & $wrapper @options
    if ((Local-Sql "SELECT count(*)=6 AND EXISTS (SELECT 1 FROM uranius_private.migration_ledger WHERE version='006_synthetic_world.sql' AND sha256='$($manifest.migrations[0].sha256)') AND NOT EXISTS (SELECT 1 FROM auth.users) AND NOT EXISTS (SELECT 1 FROM uranius_catalog.team_owners) FROM uranius_private.migration_ledger;") -ne 't') { throw 'Unexpected ledger or accounts.' }
    Expect-Denial { & $wrapper @options } '*Inspect the Uranius ledger*'
    Local-Sql 'CREATE DATABASE uranius_006_test_wrapper TEMPLATE postgres;' | Out-Null
    Local-Sql (Get-Content -Raw (Join-Path $world 'verify-offline.sql')) -Database uranius_006_test_wrapper | Out-Null
    # Simulate only the Auth transport. PostgreSQL below remains native and TLS-verified.
    function Invoke-RestMethod {
        param($Uri,$Method,$Headers,$MaximumRedirection,$TimeoutSec,$ErrorAction,$ContentType,$Body)
        $prefix='https://sdtsivgtcaoaeoihcwzd.supabase.co/auth/v1'
        if ($MaximumRedirection -ne 0 -or $Headers.apikey -cne 'sb_publishable_offlinefixture') { throw 'Unsafe fixture request.' }
        if ($Uri -ceq ($prefix + '/token?grant_type=password') -and $Method -eq 'Post') {
            $email=(ConvertFrom-Json -InputObject ([Text.Encoding]::UTF8.GetString($Body))).email
            $slot=if ($email -ceq ('fixture-manager-a'+'@'+'uranius.example')) { 1 } elseif ($email -ceq ('fixture-manager-b'+'@'+'uranius.example')) { 2 } else { throw 'Unexpected fixture email.' }
            return @{ access_token=('offline-token-' + $slot); user=@{id=('00000000-0000-4000-8000-00000000000'+$slot)} }
        }
        $slot=if ($Headers.Authorization -ceq 'Bearer offline-token-1') { 1 } elseif ($Headers.Authorization -ceq 'Bearer offline-token-2') { 2 } else { throw 'Unexpected fixture session.' }
        if ($Uri -ceq ($prefix + '/user') -and $Method -eq 'Get') {
            $letter=if ($slot -eq 1) { 'a' } else { 'b' }
            $email='fixture-manager-'+$letter+'@'+'uranius.example'
            return @{ id=('00000000-0000-4000-8000-00000000000'+$slot); email=$email; email_confirmed_at='2000-01-01T00:00:00Z' }
        }
        if ($Uri -ceq ($prefix + '/logout?scope=local') -and $Method -eq 'Post') { return }
        throw 'Unexpected fixture Auth endpoint.'
    }
    $bind=Join-Path $repo 'scripts/Bind-UraniusSyntheticManagers.ps1'
    & $bind -PsqlPath $shim -CaFile $ca
    if ((Local-Sql 'SELECT count(*) FROM uranius_catalog.team_owners;') -ne '0') { throw 'Proof-only mode wrote a mapping.' }
    & $bind -PsqlPath $shim -CaFile $ca -BindReviewedManagers
    & $bind -PsqlPath $shim -CaFile $ca -BindReviewedManagers
    if ((Local-Sql "SELECT count(*)=2 AND bool_and(user_id::text='00000000-0000-4000-8000-00000000000'||team_id) FROM uranius_catalog.team_owners;") -ne 't') { throw 'Verified manager binding mismatch.' }
    if ((Local-Sql 'SELECT count(*) FROM auth.users;') -ne '0') { throw 'Bind procedure unexpectedly inserted Auth users.' }
    Write-Output 'Mocked Auth verification and native TLS binding path passed.'
    Local-Sql 'CREATE ROLE uranius_fixture_reader LOGIN NOINHERIT; GRANT authenticated TO uranius_fixture_reader;' | Out-Null
    Local-Sql 'CREATE DATABASE uranius_006_test_dashboard TEMPLATE postgres;' | Out-Null
    $oldPsql = $env:URANIUS_SMOKE_PSQL
    $oldPort = $env:URANIUS_SMOKE_DB_PORT
    try {
        $env:URANIUS_SMOKE_PSQL = $psql
        $env:URANIUS_SMOKE_DB_PORT = '45680'
        & node (Join-Path $repo 'database/synthetic-world/login-browser-check.mjs') --postgres-fixture
        if ($LASTEXITCODE -ne 0) { throw 'Database-backed browser smoke failed.' }
    } finally {
        $env:URANIUS_SMOKE_PSQL = $oldPsql
        $env:URANIUS_SMOKE_DB_PORT = $oldPort
    }
    $smoke=Join-Path $repo 'database/reconstruction/smoke'
    $reader=ConvertFrom-Json -InputObject (Get-Content -Raw (Join-Path $smoke 'manifest.json'))
    foreach ($entry in @($reader.bootstrap) + @($reader.migrations)) {
        if ((Get-FileHash -LiteralPath (Join-Path $smoke $entry.file)).Hash -ine $entry.sha256) { throw '007 package hash mismatch.' }
    }
    Local-Sql (Get-Content -Raw (Join-Path $smoke 'bootstrap-reader.sql')) | Out-Null
    Local-Sql 'ALTER ROLE uranius_smoke_reader LOGIN;' | Out-Null
    $digest=(Get-FileHash -LiteralPath (Join-Path $smoke 'manifest.json')).Hash
    if ($ManagementSmoke) {
        Local-Sql 'CREATE ROLE postgres LOGIN CREATEROLE NOSUPERUSER; GRANT uranius_migrator TO postgres WITH ADMIN TRUE, SET FALSE, INHERIT FALSE;' | Out-Null
        $membershipQuery="SELECT row_to_json(m) FROM pg_auth_members m WHERE roleid='uranius_migrator'::regrole ORDER BY oid;"
        $membershipBefore=Local-Sql $membershipQuery
        Expect-Denial { Local-Sql 'SET ROLE uranius_migrator;' postgres } '*Disposable SQL failed*'
        Expect-Denial { Local-Sql 'SELECT count(*) FROM uranius_private.migration_ledger;' postgres } '*Disposable SQL failed*'
        $managedSql=Get-Content -Raw (Join-Path $smoke '007_management.sql')
        function Deny-Management([string]$Sql) {
            Expect-Denial { Local-Sql $Sql postgres } '*Disposable SQL failed*'
            if ((Local-Sql "SELECT count(*)=6 AND NOT has_schema_privilege('uranius_smoke_reader','uranius_game','USAGE') FROM uranius_private.migration_ledger;") -ne 't') {
                throw 'Management rejection left grants or changed the ledger.'
            }
            if ((Local-Sql $membershipQuery) -cne $membershipBefore) { throw 'Failed transaction changed role membership.' }
        }
        Deny-Management ($managedSql.Replace('sdtsivgtcaoaeoihcwzd', ('x' * 20)))
        Deny-Management ($managedSql.Replace($reader.requires[0].sha256, ('0' * 64)))
        Local-Sql 'ALTER ROLE uranius_smoke_reader BYPASSRLS;' | Out-Null
        Deny-Management $managedSql
        Local-Sql 'ALTER ROLE uranius_smoke_reader NOBYPASSRLS;' | Out-Null
        Local-Sql "ALTER TABLE uranius_private.migration_ledger ADD CONSTRAINT fixture_reject_007 CHECK (version <> '007_smoke_reader.sql');" | Out-Null
        Deny-Management $managedSql
        Local-Sql 'ALTER TABLE uranius_private.migration_ledger DROP CONSTRAINT fixture_reject_007;' | Out-Null
        Local-Sql $managedSql postgres | Out-Null
        Expect-Denial { Local-Sql $managedSql postgres } '*Disposable SQL failed*'
        if ((Local-Sql $membershipQuery) -cne $membershipBefore) { throw 'Successful transaction changed role membership.' }
        Expect-Denial { Local-Sql 'SET ROLE uranius_migrator;' postgres } '*Disposable SQL failed*'
    } else {
        & $wrapper -PsqlPath $shim -CaFile $ca -ResumeExistingRole -SmokeReader -Apply -ApprovedManifestSha256 $digest
    }
    if ((Local-Sql "SELECT count(*)=7 AND EXISTS (SELECT 1 FROM uranius_private.migration_ledger WHERE version='007_smoke_reader.sql' AND sha256='$($reader.migrations[0].sha256)') FROM uranius_private.migration_ledger;") -ne 't') { throw '007 ledger mismatch.' }
    $sqlPath=Join-Path $repo 'database/synthetic-world/hosted-club-dashboard-read.sql'
    $trustedCa=$ca.Replace('\','/')
    $readerConnection="host=$hostName hostaddr=127.0.0.1 port=45680 dbname=postgres user=uranius_smoke_reader sslmode=verify-full sslrootcert='$trustedCa' connect_timeout=5"
    foreach ($n in 1,2) {
        $value='00000000-0000-4000-8000-00000000000'+$n
        $packet = & $psql -X -qAtw -v ON_ERROR_STOP=1 -v "verified_subject=$value" -d $readerConnection -f $sqlPath
        if ($LASTEXITCODE -ne 0) { throw 'Dedicated reader SQL failed.' }
        $result = ConvertFrom-Json -InputObject $packet[-1]
        if ($result.club.name -cne ('Fixture Team '+$n) -or $result.riders -ne 10 -or $result.credits -ne 10000 -or $result.calendar -ne 3) {
            throw 'Dedicated role returned invalid manager scope.'
        }
    }
    $audit=Local-Sql "SELECT NOT has_schema_privilege('uranius_smoke_reader','uranius_private','USAGE') AND NOT has_any_column_privilege('uranius_smoke_reader','uranius_catalog.riders','UPDATE') AND NOT has_column_privilege('uranius_smoke_reader','uranius_catalog.riders','label','SELECT') AND NOT pg_has_role('uranius_smoke_reader','authenticated','MEMBER');"
    if ($audit -ne 't') { throw 'Unexpected smoke role permissions.' }
    Write-Output '007 exact column grants, RLS and native reader TLS query passed.'
    Write-Output 'PowerShell 5.1 wrapper and PostgreSQL 17 TLS migration rehearsal passed.'
}
finally { & $pgctl -D $data -m fast -w stop }
