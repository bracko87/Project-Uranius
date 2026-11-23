function New-UraniusScramVerifier([string]$Password) {
    # Printable ASCII avoids differences in PostgreSQL's SASLprep normalization.
    if ($Password -cnotmatch '^[\x21-\x7e]{16,}$') {
        throw 'Use at least 16 printable ASCII characters, without spaces, for the migration password.'
    }
    $salt = New-Object byte[] 16
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($salt) } finally { $rng.Dispose() }
    $kdf = [Security.Cryptography.Rfc2898DeriveBytes]::new(
        $Password, $salt, 4096, [Security.Cryptography.HashAlgorithmName]::SHA256)
    try { $salted = $kdf.GetBytes(32) } finally { $kdf.Dispose() }
    $hmac = [Security.Cryptography.HMACSHA256]::new($salted)
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        $stored = $sha.ComputeHash($hmac.ComputeHash([Text.Encoding]::ASCII.GetBytes('Client Key')))
        $server = $hmac.ComputeHash([Text.Encoding]::ASCII.GetBytes('Server Key'))
        'SCRAM-SHA-256$4096:{0}${1}:{2}' -f [Convert]::ToBase64String($salt),
            [Convert]::ToBase64String($stored), [Convert]::ToBase64String($server)
    }
    finally {
        $hmac.Dispose()
        $sha.Dispose()
        [Array]::Clear($salted, 0, $salted.Length)
    }
}

function Invoke-UraniusPsqlBatch {
    param(
        [string]$Executable,
        [string]$Sql,
        [string]$Password,
        [hashtable]$Connection,
        [string]$Stage,
        [int]$TimeoutSeconds = 60
    )
    if ($Sql.Length -gt 24000) { throw "$Stage - SQL exceeds the bounded local batch size." }
    $node = Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1
    $runner = Join-Path $PSScriptRoot 'run-uranius-psql-batch.mjs'
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = $node.Source
    $info.Arguments = '"' + $runner + '"'
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    foreach ($name in @($info.EnvironmentVariables.Keys)) {
        if ($name -match '^(PG|URANIUS_|NODE_)') { $info.EnvironmentVariables.Remove($name) }
    }
    foreach ($name in $Connection.Keys) { $info.EnvironmentVariables[$name] = $Connection[$name] }
    $info.EnvironmentVariables['PGPASSWORD'] = $Password
    $info.EnvironmentVariables['URANIUS_BATCH_SQL'] = $Sql
    $info.EnvironmentVariables['URANIUS_BATCH_PSQL'] = $Executable
    $info.EnvironmentVariables['URANIUS_BATCH_TIMEOUT_MS'] = [string]($TimeoutSeconds * 1000)

    $child = New-Object Diagnostics.Process
    $child.StartInfo = $info
    $started = $false
    try {
        try { $started = $child.Start() }
        catch { throw "$Stage - process I/O failure while starting the batch runner." }
        if (-not $started) { throw "$Stage could not start psql." }
        $info.EnvironmentVariables.Remove('PGPASSWORD')
        $info.EnvironmentVariables.Remove('URANIUS_BATCH_SQL')
        $out = $child.StandardOutput.ReadToEndAsync()
        $err = $child.StandardError.ReadToEndAsync()
        if (-not $child.WaitForExit(($TimeoutSeconds + 5) * 1000)) { throw "$Stage - process timeout waiting for the batch runner." }
        if ($child.ExitCode -ne 0) {
            $detail = $err.GetAwaiter().GetResult().Trim()
            if ($detail -match '^PostgreSQL batch: (authentication failure|connection timeout|connection or TLS failure|SQL execution failure|process I/O failure|process timeout)( \(SQLSTATE [0-9A-Z]{5}\))?\.$') {
                throw ($Stage + ': ' + $Matches[1] + $Matches[2] + '.')
            }
            throw "$Stage - process I/O failure in the batch runner."
        }
        $out.GetAwaiter().GetResult()
    }
    finally {
        $info.EnvironmentVariables.Remove('PGPASSWORD')
        $info.EnvironmentVariables.Remove('URANIUS_BATCH_SQL')
        if ($started -and -not $child.HasExited) { $child.Kill() }
        $child.Dispose()
    }
}
