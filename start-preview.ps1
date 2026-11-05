param([int]$Port = 8003)

$root = (Resolve-Path $PSScriptRoot).Path
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
try { $listener.Start() } catch {
  $listener.Close()
  throw "Port $Port is already in use. Try -Port 8004."
}

Write-Host "Preview is running at http://localhost:$Port/"
Write-Host "Press Ctrl+C here to stop it."
$contentTypes = @{'.html'='text/html; charset=utf-8';'.css'='text/css; charset=utf-8';'.js'='text/javascript; charset=utf-8';'.svg'='image/svg+xml';'.glb'='model/gltf-binary';'.png'='image/png';'.jpg'='image/jpeg';'.jpeg'='image/jpeg';'.webp'='image/webp'}
try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $relativePath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($relativePath)) { $relativePath = 'index.html' }
    $filePath = [IO.Path]::GetFullPath((Join-Path $root $relativePath))
    if (-not $filePath.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
      $context.Response.StatusCode = 404; $bytes = [Text.Encoding]::UTF8.GetBytes('Not found')
    } else {
      $context.Response.StatusCode = 200
      $extension = [IO.Path]::GetExtension($filePath).ToLowerInvariant()
      $context.Response.ContentType = $contentTypes[$extension]
      if (-not $context.Response.ContentType) { $context.Response.ContentType = 'application/octet-stream' }
      $bytes = [IO.File]::ReadAllBytes($filePath)
    }
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
  }
} finally {
  if ($listener.IsListening) { $listener.Stop() }
  $listener.Close()
}
