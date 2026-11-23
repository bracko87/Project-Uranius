$ErrorActionPreference = 'Stop'
. (Join-Path (Split-Path -Parent $PSScriptRoot) 'scripts/UraniusSyntheticManagerAuth.ps1')

Add-Type @'
using System;
using System.Collections.Generic;
public sealed class OfflineUraniusAuthResponse {
    public int StatusCode;
    public Dictionary<string,string> Headers = new Dictionary<string,string>();
}
public sealed class OfflineUraniusAuthException : Exception {
    public OfflineUraniusAuthResponse Response = new OfflineUraniusAuthResponse();
    public OfflineUraniusAuthException(int status) { Response.StatusCode = status; }
}
'@

$script:requestId = '43211310-eda9-49e0-a0ea-ee6b79f802ed'
$script:fixtureSecret = 'offline-secret-do-not-output-' + [char]0x00e4 + [char]0x6f22
$script:steps = @()
$script:count = 0
$script:sleeps = 0

function Start-Sleep([int]$Seconds) {
    if ($Seconds -ne 2) { throw 'Unexpected retry delay' }
    $script:sleeps++
}
function Invoke-RestMethod {
    param($Uri,$Method,$Headers,$MaximumRedirection,$TimeoutSec,$ErrorAction,$ContentType,$Body)
    if ($Uri -cnotlike 'https://sdtsivgtcaoaeoihcwzd.supabase.co/auth/v1/*' -or
        $MaximumRedirection -ne 0 -or $TimeoutSec -ne 15) { throw 'Unexpected request settings' }
    if ($Uri.EndsWith('/token?grant_type=password')) {
        if ($ContentType -cne 'application/json; charset=utf-8' -or $Body -isnot [byte[]]) { throw 'Expected explicit UTF-8 JSON bytes' }
        if ((ConvertFrom-Json -InputObject ([Text.Encoding]::UTF8.GetString($Body))).password -cne $script:fixtureSecret) {
            throw 'Password did not survive UTF-8 JSON encoding'
        }
    }
    $step = $script:steps[$script:count]
    $script:count++
    if ($step.Endpoint -and !$Uri.EndsWith($step.Endpoint)) { throw 'Unexpected Auth phase' }
    if ($step.Status -eq 0) { throw [Net.WebException]::new($script:fixtureSecret, [Net.WebExceptionStatus]::Timeout) }
    if ($step.Status) {
        $exception = [OfflineUraniusAuthException]::new($step.Status)
        $exception.Response.Headers['sb-request-id'] = if ($step.BadHeader) { $script:fixtureSecret } else { $script:requestId }
        $record = [Management.Automation.ErrorRecord]::new($exception, 'Fixture', 'InvalidOperation', $null)
        $record.ErrorDetails = [Management.Automation.ErrorDetails]::new((ConvertTo-Json -Compress @{
            error_code=$step.Code; msg=$script:fixtureSecret
        }))
        throw $record
    }
    return $step.Result
}
function Invoke-Verify([switch]$NoRetry) {
    Get-VerifiedUraniusManagerId -Slot a -PublishableKey sb_publishable_offlinefixture -Password $script:fixtureSecret -NoRetry:$NoRetry
}
function Assert-Failure($Steps,$Expected,[int]$Requests,[int]$Sleeps,[switch]$NoRetry) {
    $script:steps = $Steps
    $script:count = 0
    $script:sleeps = 0
    $actual = ''
    try { Invoke-Verify -NoRetry:$NoRetry | Out-Null }
    catch { $actual = $_.Exception.Message }
    if ($actual -notlike ('*' + $Expected + '*') -or $actual.Contains($script:fixtureSecret) -or
        $script:count -ne $Requests -or $script:sleeps -ne $Sleeps) {
        throw ('Unexpected sanitized classification or retry count for ' + $Expected)
    }
}

Assert-Failure @(@{Status=400;Code='invalid_credentials'}) ('HTTP 400, invalid credentials, request ID '+$script:requestId) 1 0
Assert-Failure @(@{Status=400;Code='email_not_confirmed'}) 'HTTP 400, unconfirmed account' 1 0
Assert-Failure @(@{Status=400;Code='unknown';BadHeader=$true}) 'HTTP 400, HTTP request rejected, request ID unavailable' 1 0
Assert-Failure @(@{Status=429;Code='over_request_rate_limit'}) 'HTTP 429, rate limited' 1 0
Assert-Failure @(@{Status=500},@{Status=500}) 'HTTP 500, Auth service failure' 2 1
Assert-Failure @(@{Status=555;Code='invalid_credentials'},@{Status=555}) 'HTTP 555, gateway failure' 2 1
Assert-Failure @(@{Status=555}) 'HTTP 555, gateway failure' 1 0 -NoRetry
Assert-Failure @(@{Status=0}) 'no HTTP response, request timeout, request ID unavailable' 1 0

$id = '00000000-0000-4000-8000-000000000001'
$login = @{Endpoint='/token?grant_type=password';Result=@{access_token=$script:fixtureSecret;user=@{id=$id}}}
$user = @{Endpoint='/user';Result=@{id=$id;email=('fixture-manager-a'+'@'+'uranius.example');email_confirmed_at='2000-01-01T00:00:00Z'}}
$logout = @{Endpoint='/logout?scope=local'}
$script:steps = @(@{Status=555},$login,$user,$logout)
$script:count = 0
$script:sleeps = 0
if ((Invoke-Verify).ToString() -ne $id -or $script:count -ne 4 -or $script:sleeps -ne 1) {
    throw 'Expected verified identity and logout after one transient failure'
}
Assert-Failure @($login,$user,@{Status=500}) 'logout for manager A: HTTP 500' 3 0 -NoRetry
Write-Output 'PowerShell 5.1 Auth diagnostics, bounded retries, identity proof and logout passed.'
