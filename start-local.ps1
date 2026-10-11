$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$engine = Get-Command "espeak-ng.exe" -ErrorAction SilentlyContinue
$enginePath = if ($engine) { $engine.Source } else { $null }
if (-not $engine) {
  $candidates = @(
    (Join-Path $env:ProgramFiles "eSpeak NG\espeak-ng.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "eSpeak NG\espeak-ng.exe")
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      $enginePath = $candidate
      break
    }
  }
}
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:8765/")

function Send-Response {
  param(
    [System.Net.HttpListenerContext]$Context,
    [int]$StatusCode,
    [string]$ContentType,
    [byte[]]$Bytes
  )
  $Context.Response.StatusCode = $StatusCode
  $Context.Response.ContentType = $ContentType
  $Context.Response.ContentLength64 = $Bytes.Length
  $Context.Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
  $Context.Response.Close()
}

function Send-Json {
  param([System.Net.HttpListenerContext]$Context, [int]$StatusCode, $Value)
  $json = ConvertTo-Json -InputObject $Value -Compress
  $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($json)
  Send-Response -Context $Context -StatusCode $StatusCode -ContentType "application/json; charset=utf-8" -Bytes $bytes
}

try {
  $listener.Start()
  Write-Host "Kannada Newsreader is running at http://127.0.0.1:8765/"
  if ($enginePath) {
    Write-Host "Offline speech engine found: $enginePath"
  } else {
    Write-Host "eSpeak NG was not found. Install it to enable offline Kannada speech."
  }
  Write-Host "Keep this window open. Press Ctrl+C to stop."

  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $path = $context.Request.Url.AbsolutePath

    if ($context.Request.HttpMethod -eq "GET" -and $path -eq "/api/health") {
      Send-Json -Context $context -StatusCode 200 -Value @{
        ready = [bool]$enginePath
        engine = if ($enginePath) { "eSpeak NG" } else { $null }
        language = if ($enginePath) { "Kannada" } else { $null }
        error = if ($enginePath) { $null } else { "Install eSpeak NG and restart this local reader." }
      }
      continue
    }

    if ($context.Request.HttpMethod -eq "POST" -and $path -eq "/api/speak") {
      if (-not $enginePath) {
        Send-Json -Context $context -StatusCode 503 -Value @{ error = "eSpeak NG is not installed. Install it, then restart this local reader." }
        continue
      }
      if ($context.Request.ContentLength64 -gt 1000000) {
        Send-Json -Context $context -StatusCode 413 -Value @{ error = "News text is too large." }
        continue
      }

      $reader = [System.IO.StreamReader]::new($context.Request.InputStream, $context.Request.ContentEncoding)
      try {
        try {
          $payload = $reader.ReadToEnd() | ConvertFrom-Json
        } catch {
          Send-Json -Context $context -StatusCode 400 -Value @{ error = "Request must contain valid JSON with a text field." }
          continue
        }
      } finally {
        $reader.Dispose()
      }
      $text = [string]$payload.text
      if ([string]::IsNullOrWhiteSpace($text) -or $text.Length -gt 5000) {
        Send-Json -Context $context -StatusCode 400 -Value @{ error = "Enter Kannada news text up to 5,000 characters." }
        continue
      }

      $id = [Guid]::NewGuid().ToString("N")
      $textPath = Join-Path $env:TEMP "$id.txt"
      $audioPath = Join-Path $env:TEMP "$id.wav"
      try {
        [System.IO.File]::WriteAllText($textPath, $text, [System.Text.UTF8Encoding]::new($false))
        $startInfo = New-Object System.Diagnostics.ProcessStartInfo
        $startInfo.FileName = $enginePath
        $startInfo.Arguments = '-v kn -s 145 -f "' + $textPath + '" -w "' + $audioPath + '"'
        $startInfo.UseShellExecute = $false
        $startInfo.CreateNoWindow = $true
        $startInfo.RedirectStandardError = $true
        $process = [System.Diagnostics.Process]::Start($startInfo)
        $process.WaitForExit()
        $errorText = $process.StandardError.ReadToEnd()
        if ($process.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $audioPath)) {
          throw "eSpeak NG could not create Kannada audio. $errorText"
        }
        $audioBytes = [System.IO.File]::ReadAllBytes($audioPath)
        Send-Response -Context $context -StatusCode 200 -ContentType "audio/wav" -Bytes $audioBytes
      } catch {
        Send-Json -Context $context -StatusCode 500 -Value @{ error = "Offline Kannada speech failed. Confirm the eSpeak NG installation includes the kn voice." }
      } finally {
        if (Test-Path -LiteralPath $textPath) { Remove-Item -LiteralPath $textPath -Force }
        if (Test-Path -LiteralPath $audioPath) { Remove-Item -LiteralPath $audioPath -Force }
      }
      continue
    }

    $file = switch ($path) {
      "/" { "index.html" }
      "/index.html" { "index.html" }
      "/styles.css" { "styles.css" }
      "/app.js" { "app.js" }
      default { $null }
    }
    if ($context.Request.HttpMethod -eq "GET" -and $file) {
      $filePath = Join-Path $root $file
      $contentType = switch ([System.IO.Path]::GetExtension($file)) {
        ".html" { "text/html; charset=utf-8" }
        ".css" { "text/css; charset=utf-8" }
        ".js" { "text/javascript; charset=utf-8" }
      }
      Send-Response -Context $context -StatusCode 200 -ContentType $contentType -Bytes ([System.IO.File]::ReadAllBytes($filePath))
    } else {
      Send-Json -Context $context -StatusCode 404 -Value @{ error = "Not found." }
    }
  }
} finally {
  if ($listener.IsListening) { $listener.Stop() }
  $listener.Close()
}
