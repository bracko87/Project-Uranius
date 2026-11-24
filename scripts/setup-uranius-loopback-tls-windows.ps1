# Generate a short-lived 127.0.0.1-only TLS certificate for the Uranius local HTTPS smoke.
# Never stores files in the repository. Does not contact Supabase or change its settings.
param(
  [switch]$TrustForCurrentUser,
  [switch]$RemoveTrust
)
$ErrorActionPreference='Stop'
$base=Join-Path $env:LOCALAPPDATA 'Uranius\loopback-tls'
$cert=Join-Path $base 'loopback-cert.pem'
$key=Join-Path $base 'loopback-key.pem'
$subject='/CN=127.0.0.1'
function Get-OpenSsl {
  $candidates=@()
  $cmd=Get-Command openssl.exe -ErrorAction SilentlyContinue
  if ($cmd) { $candidates+= $cmd.Source }
  $candidates+=@(
    'C:\Program Files\Git\usr\bin\openssl.exe',
    'C:\Program Files\Git\mingw64\bin\openssl.exe',
    'C:\Program Files (x86)\Git\usr\bin\openssl.exe'
  )
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
      return $candidate
    }
  }
  throw 'OpenSSL was not found. Install Git for Windows with OpenSSL or supply a trusted 127.0.0.1 certificate and private key manually.'
}
function Assert-LocalCert {
  if (!(Test-Path -LiteralPath $cert -PathType Leaf) -or !(Test-Path -LiteralPath $key -PathType Leaf)) {
    throw 'Loopback certificate and private key must already exist.'
  }
  $openssl=Get-OpenSsl
  $san=& $openssl x509 -in $cert -noout -ext subjectAltName 2>&1
  if ($LASTEXITCODE -ne 0 -or -not (($san -join ' ') -match 'IP Address:127\.0\.0\.1')) {
    throw 'Certificate lacks exact 127.0.0.1 IP Subject Alternative Name.'
  }
  $end=& $openssl x509 -in $cert -noout -checkend 0 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'Certificate expired.' }
  return $openssl
}
if ($RemoveTrust) {
  if (!(Test-Path -LiteralPath $cert -PathType Leaf)) { throw 'Cannot locate local loopback certificate to remove its trust.' }
  $fingerprint=([System.Security.Cryptography.X509Certificates.X509Certificate2]::new($cert)).Thumbprint
  $store=New-Object System.Security.Cryptography.X509Certificates.X509Store('Root','CurrentUser')
  $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
  try {
    $match=$store.Certificates.Find([System.Security.Cryptography.X509Certificates.X509FindType]::FindByThumbprint,$fingerprint,$false)
    foreach ($item in $match) { $store.Remove($item) }
  } finally { $store.Close() }
  Write-Host "Removed only local Uranius loopback certificate from CurrentUser Root store: $fingerprint"
  exit 0
}
if (!(Test-Path -LiteralPath $cert -PathType Leaf) -or !(Test-Path -LiteralPath $key -PathType Leaf)) {
  if (Test-Path -LiteralPath $cert -PathType Leaf) { throw 'Certificate exists but key is missing. Refusing to overwrite partial credentials.' }
  if (Test-Path -LiteralPath $key -PathType Leaf) { throw 'Key exists but certificate is missing. Refusing to overwrite partial credentials.' }
  $openssl=Get-OpenSsl
  New-Item -ItemType Directory -Path $base -Force | Out-Null
  # 2-day expiry. First generate the private key without printing openssl progress.
  & $openssl genrsa -out $key 3072
  if ($LASTEXITCODE -ne 0) { throw 'Local private key generation failed.' }
  & $openssl req -new -x509 -sha256 -days 2 -subj $subject -key $key -out $cert -addext 'subjectAltName=IP:127.0.0.1' -addext 'basicConstraints=critical,CA:FALSE' -addext 'extendedKeyUsage=serverAuth'
  if ($LASTEXITCODE -ne 0) { throw 'Local certificate generation failed.' }
  # NTFS: remove inherited access to the private key and grant the current Windows user access.
  $current=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  & icacls.exe $key /inheritance:r /grant:r ('*'+$current+':(R,W)') | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Cannot restrict local private key permissions.' }
}
$null=Assert-LocalCert
$fingerprint=([System.Security.Cryptography.X509Certificates.X509Certificate2]::new($cert)).Thumbprint
if ($TrustForCurrentUser) {
  Write-Host 'Explicitly requested: trust the 2-day self-signed loopback certificate in CURRENT USER Root store.'
  Write-Host 'This changes local browser trust, not Supabase or computer-wide trust.'
  $store=New-Object System.Security.Cryptography.X509Certificates.X509Store('Root','CurrentUser')
  $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
  try {
    $existing=$store.Certificates.Find([System.Security.Cryptography.X509Certificates.X509FindType]::FindByThumbprint,$fingerprint,$false)
    if ($existing.Count -eq 0) {
      $item=[System.Security.Cryptography.X509Certificates.X509Certificate2]::new($cert)
      $store.Add($item)
    }
  } finally { $store.Close() }
  Write-Host 'Trust installed for only the displayed certificate. Remove after testing with -RemoveTrust.'
} else {
  Write-Host 'No browser trust changes made. To trust in Edge/Chrome, rerun with -TrustForCurrentUser.'
}
Write-Host "Certificate: $cert"
Write-Host "Private key: $key"
Write-Host "Certificate thumbprint: $fingerprint"
Write-Host 'Local Uranius HTTPS run command:'
Write-Host ('powershell -NoProfile -File scripts\run-approved-overview-https-windows.ps1 -TlsCert "'+$cert+'" -TlsKey "'+$key+'" -CaFile "%USERPROFILE%\Downloads\prod-ca-2021.crt" -PostgresBin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"')
