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
try {
    Add-Type -Language CSharp -OutputAssembly $exe -OutputType ConsoleApplication -TypeDefinition @'
using System;
using System.Threading;
public static class PsqlFixture {
    public static int Main(string[] args) {
        string password = Environment.GetEnvironmentVariable("PGPASSWORD");
        if (String.IsNullOrEmpty(password) || Array.IndexOf(args, "-w") < 0 ||
            Array.IndexOf(args, "-W") >= 0 || String.Join(" ", args).Contains(password) ||
            Environment.GetEnvironmentVariable("PGSERVICE") != null) return 9;
        string sql = Console.In.ReadToEnd();
        if (sql == "wait") { Thread.Sleep(30000); return 0; }
        if (sql == "fail") { Console.Error.WriteLine(password); return 1; }
        Console.WriteLine(sql == "read-only" ? "batch-ok" : "unexpected input");
        return 0;
    }
}
'@
    $savedService = $env:PGSERVICE
    try {
        $env:PGSERVICE = 'should-not-reach-child'
        $settings = @{ Executable = $exe; Password = $fixture; Connection = @{}; Stage = 'offline batch' }
        if ((Invoke-UraniusPsqlBatch @settings -Sql 'read-only').Trim() -ne 'batch-ok') { throw 'Batch probe failed.' }
        foreach ($case in @(@{ Sql = 'wait'; Message = 'timed out' }, @{ Sql = 'fail'; Message = 'psql exit 1' })) {
            $observed = ''
            try { Invoke-UraniusPsqlBatch @settings -Sql $case.Sql -TimeoutSeconds 1 | Out-Null }
            catch { $observed = $_.Exception.Message }
            if ($observed -notlike ('*' + $case.Message + '*') -or $observed.Contains($fixture)) {
                throw 'Batch timeout or sanitized failure regression.'
            }
        }
    }
    finally { $env:PGSERVICE = $savedService }
}
finally { if (Test-Path -LiteralPath $exe) { Remove-Item -LiteralPath $exe } }
Write-Output 'Windows PowerShell 5.1 private SCRAM and bounded psql batch tests passed.'
