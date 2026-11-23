function Get-VerifiedUraniusManagerId {
    param([ValidateSet('a','b')][string]$Slot,[string]$PublishableKey,[string]$Password)
    $origin = 'https://sdtsivgtcaoaeoihcwzd.supabase.co/auth/v1'
    if ($PublishableKey -cnotmatch '^sb_publishable_[A-Za-z0-9_-]+$') { throw 'Use the Uranius publishable key.' }
    $email = 'fixture-manager-' + $Slot + '@' + 'uranius.example'
    $request = @{ Headers=@{ apikey=$PublishableKey }; MaximumRedirection=0; TimeoutSec=15; ErrorAction='Stop' }
    $session = $null
    try {
        $payload = ConvertTo-Json -Compress @{ email=$email; password=$Password }
        $session = Invoke-RestMethod @request -Method Post -ContentType 'application/json' -Body $payload -Uri ($origin + '/token?grant_type=password')
        if (!$session.access_token) { throw 'No session.' }
        $request.Headers.Authorization = 'Bearer ' + $session.access_token
        $user = Invoke-RestMethod @request -Method Get -Uri ($origin + '/user')
        $id = [Guid]::Empty
        if ($user.email -cne $email -or !$user.email_confirmed_at -or $user.id -cne $session.user.id -or
            ![Guid]::TryParseExact([string]$user.id, 'D', [ref]$id) -or $id -eq [Guid]::Empty) {
            throw 'Unexpected user identity.'
        }
        return $id
    }
    catch { throw ('Uranius Auth verification failed for manager ' + $Slot.ToUpperInvariant() + '.') }
    finally {
        if ($session.access_token) {
            $request.Headers.Authorization = 'Bearer ' + $session.access_token
            try { Invoke-RestMethod @request -Method Post -Uri ($origin + '/logout?scope=local') | Out-Null }
            catch { throw ('Uranius Auth logout failed for manager ' + $Slot.ToUpperInvariant() + '. Binding stopped.') }
        }
    }
}
