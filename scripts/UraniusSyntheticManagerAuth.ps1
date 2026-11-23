function Get-UraniusAuthFailure([Management.Automation.ErrorRecord]$Failure) {
    $exception = $Failure.Exception
    $response = $exception.Response
    $statusCode = if ($response -and $null -ne $response.StatusCode) { [int]$response.StatusCode } else { $null }
    $requestId = 'unavailable'
    $code = $null
    if ($response -and $response.Headers) {
        foreach ($name in @('sb-request-id', 'x-request-id', 'x-kong-request-id', 'cf-ray')) {
            $candidate = [string]$response.Headers[$name]
            if ($candidate -match '\A(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|[a-f0-9]{16,32}(?:-[A-Z]{3})?)\z') {
                $requestId = $candidate
                break
            }
        }
        $code = [string]$response.Headers['x-sb-error-code']
    }
    $known = @('invalid_credentials', 'email_not_confirmed', 'user_banned',
        'over_request_rate_limit', 'over_email_send_rate_limit', 'over_sms_send_rate_limit')
    $body = $Failure.ErrorDetails.Message
    # Windows PowerShell 5.1 often leaves the JSON in a buffered WebException response.
    if (!$code -and !$body -and $statusCode -in 400, 401, 403 -and
        $response -is [Net.HttpWebResponse] -and $response.ContentType -match "^application/json(?:\s*;|$)" -and
        $response.ContentLength -le 8192) {
        try {
            $stream = $response.GetResponseStream()
            if ($stream.CanTimeout) { $stream.ReadTimeout = 2000 }
            $reader = [IO.StreamReader]::new($stream)
            try {
                $buffer = New-Object char[] 8193
                $length = $reader.ReadBlock($buffer, 0, $buffer.Length)
                if ($length -gt 0 -and $length -le 8192) { $body = -join $buffer[0..($length - 1)] }
            } finally { $reader.Dispose() }
        } catch { $body = $null }
    }
    if (!$code -and $body -and $body.Length -le 8192 -and $body.TrimStart().StartsWith('{')) {
        try {
            $json = ConvertFrom-Json -InputObject $body -ErrorAction Stop
            $code = if ($json.error_code) { [string]$json.error_code } else { [string]$json.code }
        } catch { $code = $null }
    }
    $classification = 'transport failure'
    $retry = $false
    if ($statusCode -in 500, 502, 503, 504, 555) {
        $classification = if ($statusCode -eq 500) { 'Auth service failure' } else { 'gateway failure' }
        $retry = $true
    } elseif ($statusCode -ge 500 -and $statusCode -le 599) {
        $classification = 'server failure'
    } elseif ($statusCode -eq 429 -or ($statusCode -and $code -in $known -and $code.StartsWith('over_'))) {
        $classification = 'rate limited'
    } elseif ($statusCode -eq 408 -or $exception.Status -eq [Net.WebExceptionStatus]::Timeout -or
              $exception -is [TimeoutException] -or $exception.InnerException -is [TimeoutException]) {
        $classification = 'request timeout'
    } elseif ($statusCode -and $code -eq 'invalid_credentials') {
        $classification = 'invalid credentials'
    } elseif ($statusCode -and $code -eq 'email_not_confirmed') {
        $classification = 'unconfirmed account'
    } elseif ($statusCode -and $code -eq 'user_banned') {
        $classification = 'account banned'
    } elseif ($statusCode) {
        $classification = 'HTTP request rejected'
    }
    $http = if ($statusCode) { 'HTTP ' + $statusCode } else { 'no HTTP response' }
    [pscustomobject]@{
        Diagnostic = "$http, $classification, request ID $requestId"
        Retry = $retry
    }
}

function Invoke-UraniusAuthRequest {
    param([string]$Slot,[string]$Phase,[hashtable]$Request,[switch]$NoRetry)
    $label = 'Uranius Auth ' + $Phase + ' for manager ' + $Slot.ToUpperInvariant()
    for ($attempt = 1; $attempt -le 2; $attempt++) {
        try { return Invoke-RestMethod @Request }
        catch {
            $failure = Get-UraniusAuthFailure $_
            $message = $label + ': ' + $failure.Diagnostic + '.'
            if ($NoRetry -or !$failure.Retry -or $attempt -eq 2) { throw $message }
            Write-Warning ($message + ' Retrying once in 2 seconds.')
            Start-Sleep -Seconds 2
        }
    }
}

function Get-VerifiedUraniusManagerId {
    param([ValidateSet('a','b')][string]$Slot,[string]$PublishableKey,[string]$Password,[switch]$NoRetry)
    $origin = 'https://sdtsivgtcaoaeoihcwzd.supabase.co/auth/v1'
    if ($PublishableKey -cnotmatch '^sb_publishable_[A-Za-z0-9_-]+$') { throw 'Use the Uranius publishable key.' }
    $email = 'fixture-manager-' + $Slot + '@' + 'uranius.example'
    $request = @{ Headers=@{ apikey=$PublishableKey }; MaximumRedirection=0; TimeoutSec=15; ErrorAction='Stop' }
    $session = $null
    $proofFailure = $null
    $id = [Guid]::Empty
    try {
        $login = $request.Clone()
        $login.Method = 'Post'
        $login.ContentType = 'application/json'
        $login.Body = ConvertTo-Json -Compress @{ email=$email; password=$Password }
        $login.Uri = $origin + '/token?grant_type=password'
        $session = Invoke-UraniusAuthRequest -Slot $Slot -Phase 'sign-in' -Request $login -NoRetry:$NoRetry
        if (!$session.access_token) { throw 'Uranius Auth sign-in returned no session.' }
        $request.Headers.Authorization = 'Bearer ' + $session.access_token
        $request.Method = 'Get'
        $request.Uri = $origin + '/user'
        $user = Invoke-UraniusAuthRequest -Slot $Slot -Phase 'identity lookup' -Request $request -NoRetry:$NoRetry
        if ($user.email -cne $email -or !$user.email_confirmed_at -or $user.id -cne $session.user.id -or
            ![Guid]::TryParseExact([string]$user.id, 'D', [ref]$id) -or $id -eq [Guid]::Empty) {
            throw ('Uranius Auth identity mismatch for manager ' + $Slot.ToUpperInvariant() + '.')
        }
    } catch { $proofFailure = $_.Exception.Message }
    finally {
        if ($session.access_token) {
            $request.Method = 'Post'
            $request.Uri = $origin + '/logout?scope=local'
            try { Invoke-UraniusAuthRequest -Slot $Slot -Phase 'logout' -Request $request -NoRetry:$NoRetry | Out-Null }
            catch {
                if (!$proofFailure) { throw }
                Write-Warning $_.Exception.Message
            }
        }
    }
    if ($proofFailure) { throw $proofFailure }
    return $id
}
