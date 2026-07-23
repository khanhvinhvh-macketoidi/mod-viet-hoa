$ErrorActionPreference = 'Stop'
$root = (Resolve-Path "$PSScriptRoot\..\..").Path
Set-Location $root
if (!(Test-Path '.env.production')) {
  throw 'Thiếu .env.production. Hãy copy từ .env.production.example và cập nhật AUTH_SECRET.'
}
$env:NODE_ENV = 'production'
$env:PORT = '3000'
$env:HOSTNAME = '127.0.0.1'
npm run start
