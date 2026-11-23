$ErrorActionPreference = 'Stop'
. (Join-Path (Split-Path -Parent $PSScriptRoot) 'scripts/UraniusPsqlBatch.ps1')

$fixture = 'offline-test-password-2026'
$value = New-UraniusScramVerifier $fixture
if ($value -notmatch '^SCRAM-SHA-256\$4096:([^$]+)\$([^:]+):(.+)$') { throw 'Invalid SCRAM verifier format.' }
$parts = @($Matches[1], $Matches[2], $Matches[3])
$independent = @'
const crypto = require("node:crypto");
const [password, salt, stored, server] = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
const key = crypto.pbkdf2Sync(password, Buffer.from(salt, "base64"), 4096, 32, "sha256");
const hmac = label => crypto.createHmac("sha256", key).update(label).digest();
if (crypto.createHash("sha256").update(hmac("Client Key")).digest("base64") !== stored ||
    hmac("Server Key").toString("base64") !== server) process.exit(1);
'@
$check = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($independent))
ConvertTo-Json -InputObject (@($fixture) + $parts) -Compress | node -e ('eval(Buffer.from(''{0}'',''base64'').toString())' -f $check)
if ($LASTEXITCODE -ne 0) { throw 'SCRAM verifier differs from independent calculation.' }
if ((New-UraniusScramVerifier $fixture) -ceq $value) { throw 'Verifier reused its salt.' }

$exe = Join-Path ([IO.Path]::GetTempPath()) ('uranius-psql-test-' + [Guid]::NewGuid().ToString('N') + '.exe')
$pidFile = $exe + '.pid'
try {
    Add-Type -Language CSharp -OutputAssembly $exe -OutputType ConsoleApplication -TypeDefinition @'
using System;
using System.Threading;
public static class PsqlFixture {
    public static int Main(string[] args) {
        string password = Environment.GetEnvironmentVariable("PGPASSWORD");
        if (String.IsNullOrEmpty(password) || Array.IndexOf(args, "--no-password") < 0 ||
            Array.IndexOf(args, "-W") >= 0 || String.Join(" ", args).Contains(password) ||
            Environment.GetEnvironmentVariable("PGSERVICE") != null) return 9;
        if (Environment.GetEnvironmentVariable("PGOPTIONS") == "offline-slow-fixture") Thread.Sleep(6000);
        string sql = Console.In.ReadToEnd();
        if (sql.Length == 16000 && sql.Trim('x') == "") { Console.WriteLine("all-input"); return 0; }
        if (sql == "wait") {
            System.IO.File.WriteAllText(Environment.GetEnvironmentVariable("PGOPTIONS"), System.Diagnostics.Process.GetCurrentProcess().Id.ToString());
            Thread.Sleep(30000); return 0;
        }
        if (sql == "auth") { Console.Error.WriteLine("FATAL:  28P01 " + password); return 2; }
        if (sql == "connect-timeout") { Console.Error.WriteLine("connection to server: timeout expired " + password); return 2; }
        if (sql == "sql") { Console.Error.WriteLine("ERROR:  42501 " + password); return 3; }
        if (sql == "io") { Console.Error.WriteLine("could not read from input " + password); return 1; }
        Console.WriteLine(sql == "read-only" ? "batch-ok" : "unexpected input");
        return 0;
    }
}
'@
    $savedService = $env:PGSERVICE
    try {
        $env:PGSERVICE = 'should-not-reach-child'
        $connection = @{ PGHOST = 'db.sdtsivgtcaoaeoihcwzd.supabase.co'; PGPORT = '5432'; PGDATABASE = 'postgres'
            PGUSER = 'uranius_migrator'; PGSSLMODE = 'verify-full'; PGGSSENCMODE = 'disable'; PGSSLROOTCERT = 'unused' }
        $settings = @{ Executable = $exe; Password = $fixture; Connection = $connection; Stage = 'offline batch' }
        if ((Invoke-UraniusPsqlBatch @settings -Sql 'read-only').Trim() -ne 'batch-ok') { throw 'Batch probe failed.' }
        try {
            $connection.PGOPTIONS = 'offline-slow-fixture'
            if ((Invoke-UraniusPsqlBatch @settings -Sql ('x' * 16000) -TimeoutSeconds 12).Trim() -ne 'all-input') {
                throw 'Batch did not survive slow startup with complete SQL input.'
            }
        }
        finally { $connection.Remove('PGOPTIONS') }
        foreach ($case in @(
            @{ Sql = 'wait'; Message = 'process timeout' },
            @{ Sql = 'auth'; Message = 'authentication failure (SQLSTATE 28P01)' },
            @{ Sql = 'connect-timeout'; Message = 'connection timeout' },
            @{ Sql = 'sql'; Message = 'SQL execution failure (SQLSTATE 42501)' },
            @{ Sql = 'io'; Message = 'process I/O failure' }
        )) {
            $observed = ''
            $connection.PGOPTIONS = $pidFile
            try { Invoke-UraniusPsqlBatch @settings -Sql $case.Sql -TimeoutSeconds 2 | Out-Null }
            catch { $observed = $_.Exception.Message }
            if ($observed -notlike ('*' + $case.Message + '*') -or $observed.Contains($fixture)) {
                throw 'Batch timeout or sanitized failure regression.'
            }
        }
        $childPid = [int](Get-Content -LiteralPath $pidFile)
        if (Get-Process -Id $childPid -ErrorAction SilentlyContinue) { throw 'Timed-out child remained alive.' }
    }
    finally { $env:PGSERVICE = $savedService }
}
finally {
    foreach ($file in @($exe, $pidFile)) { if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file } }
}
Write-Output 'PowerShell 5.1 SCRAM, slow startup, complete input, deadline, and sanitized error tests passed.'
