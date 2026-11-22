$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$script = Join-Path $repo 'scripts/Connect-UraniusDatabase.ps1'
$entries = @(& $script -VerifyManifest)
$expected = @('001_identity.sql', '002_reference_schema.sql', '003_access.sql', '004_synthetic_reference.sql')
if ($entries.Count -ne 4) { throw 'Expected four separate migration entries.' }
for ($i = 0; $i -lt $expected.Count; $i++) {
    if ($entries[$i].file -cne $expected[$i]) { throw ('Incorrect migration order at entry ' + ($i + 1)) }
    $file = Join-Path (Join-Path $repo 'database/preparation') $expected[$i]
    $hash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
    if ($hash -ine $entries[$i].sha256) { throw ('Checksum mismatch for ' + $expected[$i]) }
    Write-Output ($expected[$i] + ' ' + $hash.ToLowerInvariant())
}
Write-Output 'Manifest regression passed offline.'
