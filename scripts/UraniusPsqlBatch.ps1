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
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = $Executable
    $info.Arguments = '-X -w --set=ON_ERROR_STOP=1 -P pager=off -f -'
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    foreach ($name in @($info.EnvironmentVariables.Keys)) {
        if ($name -like 'PG*') { $info.EnvironmentVariables.Remove($name) }
    }
    foreach ($name in $Connection.Keys) { $info.EnvironmentVariables[$name] = $Connection[$name] }
    $info.EnvironmentVariables['PGPASSWORD'] = $Password

    $child = New-Object Diagnostics.Process
    $child.StartInfo = $info
    $started = $false
    try {
        $started = $child.Start()
        if (-not $started) { throw "$Stage could not start psql." }
        $info.EnvironmentVariables.Remove('PGPASSWORD')
        $out = $child.StandardOutput.ReadToEndAsync()
        $err = $child.StandardError.ReadToEndAsync()
        $write = $child.StandardInput.WriteAsync($Sql)
        if (-not $write.Wait(5000)) { throw "$Stage could not send SQL to psql within 5 seconds." }
        $child.StandardInput.Close()
        if (-not $child.WaitForExit($TimeoutSeconds * 1000)) { throw "$Stage timed out after $TimeoutSeconds seconds." }
        if ($child.ExitCode -ne 0) { throw "$Stage failed (psql exit $($child.ExitCode)). Check the project password, TLS, or database state before retrying." }
        $out.GetAwaiter().GetResult()
    }
    finally {
        $info.EnvironmentVariables.Remove('PGPASSWORD')
        if ($started -and -not $child.HasExited) { $child.Kill() }
        $child.Dispose()
    }
}
