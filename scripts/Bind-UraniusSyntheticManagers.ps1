[CmdletBinding()]
param(
    [string]$PsqlPath,
    [string]$CaFile,
    [switch]$BindReviewedManagers,
    [switch]$NoRetry
)

$ErrorActionPreference = 'Stop'
if ([Console]::IsInputRedirected) { throw 'Run in an interactive Windows PowerShell terminal.' }
. (Join-Path $PSScriptRoot 'UraniusSyntheticManagerAuth.ps1')
. (Join-Path $PSScriptRoot 'UraniusPsqlBatch.ps1')
$repo = Split-Path -Parent $PSScriptRoot
if ($BindReviewedManagers) {
    if (!$PsqlPath -or !$CaFile) { throw 'Binding requires trusted psql and the Uranius CA file.' }
    $psql = (Resolve-Path -LiteralPath $PsqlPath).ProviderPath
    $ca = (Resolve-Path -LiteralPath $CaFile).ProviderPath
    if ([IO.Path]::GetFileName($psql) -ne 'psql.exe' -or $ca.StartsWith($repo + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Use the trusted psql executable and a CA file outside the checkout.'
    }
    $version = & $psql --version
    if ($LASTEXITCODE -ne 0 -or $version -notmatch '^psql \(PostgreSQL\) 17\.') { throw 'Expected PostgreSQL 17 psql.' }
}

function Read-VerifiedManagerId([string]$Slot, [string]$Key) {
    $secret = Read-Host ('Uranius fixture manager ' + $Slot.ToUpperInvariant() + ' password') -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    try {
        Get-VerifiedUraniusManagerId -Slot $Slot -PublishableKey $Key -NoRetry:$NoRetry -Password ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr))
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
        $secret.Dispose()
    }
}

$key = Read-Host 'Uranius publishable API key'
$a = Read-VerifiedManagerId 'a' $key
$b = Read-VerifiedManagerId 'b' $key
if ($a -eq $b) { throw 'The two Uranius Auth subjects must be distinct.' }
Write-Host 'Two confirmed Uranius Auth identities verified and signed out.'
if (-not $BindReviewedManagers) { return }

$dir = Join-Path $repo 'database/reconstruction/world'
$manifest = ConvertFrom-Json -InputObject (Get-Content -Raw -LiteralPath (Join-Path $dir 'manifest.json'))
if ((Get-FileHash -LiteralPath (Join-Path $dir 'manifest.json')).Hash -ine '7df2b37dec41fa6ddd93eb22f48bcb149f72b49f7857705805d572cb98995081') {
    throw 'Reviewed 006 manifest mismatch.'
}
$entries = @($manifest.requires) + @($manifest.migrations)
$expected = ($entries | ForEach-Object { "('$($_.file)','$($_.sha256)')" }) -join ','
$template = Get-Content -Raw -LiteralPath (Join-Path $repo 'database/synthetic-world/bind-reviewed-managers.sql')
$sql = $template.Replace('__EXPECTED_LEDGER__', $expected).Replace('__MANAGER_A__', $a.ToString('D')).Replace('__MANAGER_B__', $b.ToString('D'))
$connection = @{
    PGHOST='db.sdtsivgtcaoaeoihcwzd.supabase.co'; PGPORT='5432'; PGDATABASE='postgres'; PGUSER='uranius_migrator'
    PGSSLMODE='verify-full'; PGSSLROOTCERT=$ca; PGCONNECT_TIMEOUT='10'; PGGSSENCMODE='disable'
    PGOPTIONS='-c statement_timeout=30000 -c lock_timeout=10000'
}
$secret = Read-Host 'Existing Uranius migration-role password' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
    Invoke-UraniusPsqlBatch -Executable $psql -Connection $connection -Password ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)) -Stage 'Uranius manager binding' -Sql $sql | Out-Null
    Write-Host 'Verified manager A and B mappings are committed.'
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    $secret.Dispose()
}
