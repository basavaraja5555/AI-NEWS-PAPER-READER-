param([ValidateRange(1, 65535)][int]$Port = 8765)

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
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$newsCache = @{}
$maximumNewsItems = 50

function Send-Response {
  param(
    [System.Net.HttpListenerContext]$Context,
    [int]$StatusCode,
    [string]$ContentType,
    [byte[]]$Bytes
  )
  $Context.Response.Headers["Access-Control-Allow-Origin"] = "*"
  $Context.Response.Headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
  $Context.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type"
  $Context.Response.Headers["Access-Control-Allow-Private-Network"] = "true"
  if ($StatusCode -ne 204) {
    $Context.Response.ContentLength64 = $Bytes.Length
  }
  $Context.Response.StatusCode = $StatusCode
  $Context.Response.ContentType = $ContentType
  if ($Bytes.Length -gt 0) {
    $Context.Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
  }
  $Context.Response.Close()
}

function Send-Json {
  param([System.Net.HttpListenerContext]$Context, [int]$StatusCode, $Value)
  $json = ConvertTo-Json -InputObject $Value -Compress
  $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($json)
  Send-Response -Context $Context -StatusCode $StatusCode -ContentType "application/json; charset=utf-8" -Bytes $bytes
}

function Get-FeedText {
  param([System.Xml.XmlNode]$Item, [string]$ElementName)
  $node = $Item.SelectSingleNode("*[local-name()='$ElementName']")
  if (-not $node) { return "" }
  $text = [System.Net.WebUtility]::HtmlDecode($node.InnerText)
  $text = [System.Text.RegularExpressions.Regex]::Replace($text, "<[^>]*>", " ")
  return [System.Text.RegularExpressions.Regex]::Replace($text, "\s+", " ").Trim()
}

try {
  $listener.Start()
  Write-Host "Current Desk is running at http://127.0.0.1:$Port/"
  if ($enginePath) {
    Write-Host "Offline speech engine found: $enginePath"
  } else {
    Write-Host "eSpeak NG was not found. Install it to enable offline Kannada speech."
  }
  Write-Host "Keep this window open. Press Ctrl+C to stop."

  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $path = $context.Request.Url.AbsolutePath

    if ($context.Request.HttpMethod -eq "OPTIONS") {
      Send-Response -Context $context -StatusCode 200 -ContentType "text/plain" -Bytes ([byte[]]@())
      continue
    }

    if ($context.Request.HttpMethod -eq "GET" -and $path -eq "/api/health") {
      Send-Json -Context $context -StatusCode 200 -Value @{
        ready = [bool]$enginePath
        engine = if ($enginePath) { "eSpeak NG" } else { $null }
        language = if ($enginePath) { "Kannada" } else { $null }
        error = if ($enginePath) { $null } else { "Install eSpeak NG and restart this local reader." }
        newsApi = "Bing News RSS and FreeJobAlert RSS"
      }
      continue
    }

    if ($context.Request.HttpMethod -eq "GET" -and $path -eq "/api/news") {
      $section = [string]$context.Request.QueryString["section"]
      if ($section -notin @("national", "international", "karnataka", "jobs")) {
        Send-Json -Context $context -StatusCode 400 -Value @{ error = "Choose national, international, Karnataka, or jobs." }
        continue
      }
      if ($newsCache.ContainsKey($section) -and ([DateTime]::UtcNow - $newsCache[$section].fetchedAt).TotalMinutes -lt 15) {
        Send-Json -Context $context -StatusCode 200 -Value $newsCache[$section].payload
        continue
      }

      try {
        if ($section -eq "jobs") {
          $feedUris = @("https://www.freejobalert.com/feed/")
          $provider = "FreeJobAlert RSS"
        } else {
          $queries = switch ($section) {
            "international" { @("world news latest", "world news today", "international news today") }
            "karnataka" { @("Karnataka news today", "Karnataka current affairs", "Karnataka government news", "Karnataka policy development news") }
            default { @("India national news today", "India current affairs news", "national news India today") }
          }
          $market = "en-IN"
          $feedUris = @($queries | ForEach-Object {
            $encodedQuery = [Uri]::EscapeDataString($_)
            "https://www.bing.com/news/search?q=$encodedQuery&format=rss&mkt=$market&freshness=Week"
          })
          $provider = "Bing News RSS"
        }

        $articles = @()
        $seenUrls = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
        $successfulFeeds = 0
        $lastFeedError = $null
        foreach ($feedUri in $feedUris) {
          if ($articles.Count -ge $maximumNewsItems) { break }
          try {
            $feedResponse = Invoke-WebRequest -Uri $feedUri -TimeoutSec 30 -UseBasicParsing -Headers @{
              "User-Agent" = "Mozilla/5.0 (compatible; CurrentDesk/1.0)"
              "Accept" = "application/rss+xml, application/xml, text/xml"
            }
            [xml]$feedXml = $feedResponse.Content
            $feedItems = @($feedXml.rss.channel.item)
            $successfulFeeds += 1
          } catch {
            $lastFeedError = $_
            continue
          }

          foreach ($feedItem in ($feedItems | Select-Object -First 50)) {
            $publishedAt = Get-FeedText -Item $feedItem -ElementName "pubDate"
            $publishedDate = [DateTime]::MinValue
            if (-not [DateTime]::TryParse($publishedAt, [ref]$publishedDate)) { continue }
            $maximumAge = if ($section -eq "jobs") { 30 } else { 7 }
            if (([DateTime]::UtcNow - $publishedDate.ToUniversalTime()).TotalDays -gt $maximumAge) { continue }

            $feedLink = Get-FeedText -Item $feedItem -ElementName "link"
            $articleUrl = $feedLink
            if ($feedLink -match "(?:\?|&)url=([^&]+)") {
              $articleUrl = [Uri]::UnescapeDataString($Matches[1])
            } elseif ($feedLink -match "^http://") {
              $articleUrl = $feedLink -replace "^http://", "https://"
            }
            if ($articleUrl -notmatch "^https://" -or -not $seenUrls.Add($articleUrl)) { continue }
            $title = Get-FeedText -Item $feedItem -ElementName "title"
            if ([string]::IsNullOrWhiteSpace($title)) { continue }
            $sourceNode = $feedItem.SelectSingleNode("*[local-name()='Source']")
            $description = Get-FeedText -Item $feedItem -ElementName "description"
            if ($description.Length -gt 600) { $description = $description.Substring(0, 597) + "..." }
            $articles += @{
              title = $title
              summary = $description
              url = $articleUrl
              source = if ($sourceNode) { [System.Net.WebUtility]::HtmlDecode($sourceNode.InnerText) } else { ([Uri]$articleUrl).Host }
              country = switch ($section) {
                "international" { "International" }
                "karnataka" { "Karnataka" }
                default { "India" }
              }
              publishedAt = $publishedAt
            }
            if ($articles.Count -ge $maximumNewsItems) { break }
          }
        }
        if ($successfulFeeds -eq 0 -and $lastFeedError) { throw $lastFeedError }
        $articles = @($articles | Sort-Object { [DateTime]::Parse($_.publishedAt) } -Descending | Select-Object -First $maximumNewsItems)
        $payload = @{
          section = $section
          provider = $provider
          fetchedAt = [DateTime]::UtcNow.ToString("o")
          items = $articles
        }
        $newsCache[$section] = @{ fetchedAt = [DateTime]::UtcNow; payload = $payload }
        Send-Json -Context $context -StatusCode 200 -Value $payload
      } catch {
        $message = "The public news API is temporarily unavailable or rate-limited. Wait a moment and refresh."
        Send-Json -Context $context -StatusCode 502 -Value @{ error = $message }
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
