
# 把钛核品牌注入上游仓库（CI 或本地构建时调用）
# 用法：pwsh -File branding/apply-brand.ps1 -Upstream upstream -Branding .

param(
  [string]$Upstream = 'upstream',
  [string]$Branding = '.'
)

# 复制后去 BOM（Node JSON.parse 不接受 BOM）
function Strip-Bom([string]$p) {
  if (-not (Test-Path $p)) { return }
  $t = [System.IO.File]::ReadAllText($p)
  if ($t.Length -gt 0 -and $t[0] -eq [char]0xFEFF) { $t = $t.Substring(1) }
  [System.IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding($false)))
}

$ErrorActionPreference = 'Stop'

function Join-3([string]$a, [string]$b, [string]$c) { [System.IO.Path]::Combine($a, $b, $c) }

$appDir = Join-3 $Upstream 'dsh-tauri' 'src-tauri'
if (-not (Test-Path -LiteralPath $appDir)) { throw "upstream not found: $appDir" }

# 1) 壳层配置与图标
$confDst = [System.IO.Path]::Combine($appDir, 'src', 'app', 'tauri.conf.json')
$iconDir = [System.IO.Path]::Combine($appDir, 'src', 'app', 'icons')
Copy-Item ([System.IO.Path]::Combine($Branding, 'branding', 'tauri.conf.json')) $confDst -Force
Strip-Bom (Join-Path $TauriDir "tauri.conf.json")
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null
Copy-Item ([System.IO.Path]::Combine($Branding, 'branding', 'icon.ico')) ([System.IO.Path]::Combine($iconDir, 'icon.ico')) -Force
Copy-Item ([System.IO.Path]::Combine($Branding, 'branding', 'icon.png')) ([System.IO.Path]::Combine($iconDir, 'icon.png')) -Force
Write-Host '[ok] tauri.conf.json + icons'

# 1.5) 安装器钩子（注册开机静默更新）
$nsisSrc = [System.IO.Path]::Combine($Branding, 'branding', 'nsis')
$nsisDst = [System.IO.Path]::Combine($appDir, 'src', 'app', 'nsis')
if (Test-Path -LiteralPath $nsisSrc) {
  New-Item -ItemType Directory -Force -Path $nsisDst | Out-Null
  Get-ChildItem -LiteralPath $nsisSrc -File | ForEach-Object {
    Copy-Item $_.FullName ([System.IO.Path]::Combine($nsisDst, $_.Name)) -Force
  }
  Write-Host '[ok] installer hooks (silent update)'
}
# 2) 品牌插件进 assets/plugins
$pluginSrc = [System.IO.Path]::Combine($Branding, 'plugins', 'taicore-brand')
$pluginsDir = [System.IO.Path]::Combine($Upstream, 'dsh-desktop', 'assets', 'plugins')
$pluginDst = [System.IO.Path]::Combine($pluginsDir, 'taicore-brand')
New-Item -ItemType Directory -Force -Path $pluginDst | Out-Null
Copy-Item -Path ([System.IO.Path]::Combine($pluginSrc, '*')) -Destination $pluginDst -Recurse -Force
Write-Host '[ok] plugin -> assets/plugins/taicore-brand'

# 3) 注册进配套插件清单（否则首启不会同步进 profile）
$reg = [System.IO.Path]::Combine($Upstream, 'dsh-desktop', 'scripts', 'lib', 'companion-plugins.js')
if (Test-Path -LiteralPath $reg) {
  $text = Get-Content -LiteralPath $reg -Raw
  if ($text -notmatch "id:\s*'taicore-brand'") {
    $anchor = "  { id: 'ds-harness-remote', name: 'ds-harness-remote', shipsNodeModules: true },"
    if ($text.Contains($anchor)) {
      $text = $text.Replace($anchor, $anchor + "`r`n  // 钛核 TAICORE 品牌包（客户端 slot + 主题 token）`r`n  { id: 'taicore-brand', name: 'taicore-brand' },")
      Set-Content -LiteralPath $reg -Value $text -Encoding UTF8 -NoNewline
      Write-Host '[ok] registered taicore-brand in companion list'
    } else {
      Write-Host '[warn] companion anchor not found; brand pack must be installed manually after install'
    }
  } else {
    Write-Host '[ok] companion list already contains taicore-brand'
  }
}

# 4) 运行时资源：浏览器标题与托盘图标
$uiIndex = [System.IO.Path]::Combine($Upstream, 'ui', 'index.html')
if (Test-Path -LiteralPath $uiIndex) {
  $html = Get-Content -LiteralPath $uiIndex -Raw
  $html = $html -replace '<title>[^<]*</title>', '<title>钛核 TAICORE</title>'
  Set-Content -LiteralPath $uiIndex -Value $html -Encoding UTF8 -NoNewline
}
$tray = [System.IO.Path]::Combine($Upstream, 'dsh-desktop', 'assets', 'tray-icon.png')
if (Test-Path -LiteralPath $tray) {
  Copy-Item ([System.IO.Path]::Combine($Branding, 'branding', 'icon.png')) $tray -Force
}
Write-Host '[ok] ui title + tray icon'
Write-Host '[done] branding applied'

# 5) 商用合规：移除 GPL-2.0 的 dsh-pocket（手机同屏），并从配套清单摘除
$pocketDir = [System.IO.Path]::Combine($Upstream, 'dsh-desktop', 'assets', 'plugins', 'dsh-pocket')
if (Test-Path -LiteralPath $pocketDir) {
  Remove-Item -LiteralPath $pocketDir -Recurse -Force
  Write-Host '[ok] removed dsh-pocket (GPL-2.0)'
}
$regPath = [System.IO.Path]::Combine($Upstream, 'dsh-desktop', 'scripts', 'lib', 'companion-plugins.js')
if (Test-Path -LiteralPath $regPath) {
  $regText = Get-Content -LiteralPath $regPath -Raw
  $entry = "  { id: 'dsh-pocket', name: 'dsh-pocket', shipsNodeModules: true },"
  if ($regText.Contains($entry)) {
    $regText = $regText.Replace($entry, "  // taicore: removed dsh-pocket (GPL-2.0) for commercial distribution")
    Set-Content -LiteralPath $regPath -Value $regText -Encoding UTF8 -NoNewline
    Write-Host '[ok] unregistered dsh-pocket'
  }
}
Write-Host '[done] compliance pass'

# 5) 授权插件进 assets/plugins
$licSrc = [System.IO.Path]::Combine($Branding, 'plugins', 'taicore-license')
if (Test-Path -LiteralPath $licSrc) {
  $licDst = [System.IO.Path]::Combine($Upstream, 'dsh-desktop', 'assets', 'plugins', 'taicore-license')
  New-Item -ItemType Directory -Force -Path $licDst | Out-Null
  Copy-Item -Path ([System.IO.Path]::Combine($licSrc, '*')) -Destination $licDst -Recurse -Force
  Write-Host '[ok] plugin -> assets/plugins/taicore-license'
  if ((Test-Path -LiteralPath $reg) -and ((Get-Content -LiteralPath $reg -Raw) -notmatch "id:\s*'taicore-license'")) {
    $t2 = Get-Content -LiteralPath $reg -Raw
    $anchor2 = "  // 钛核 TAICORE 品牌包（客户端 slot + 主题 token）"
    if ($t2.Contains($anchor2)) {
      $t2 = $t2.Replace($anchor2, "  { id: 'taicore-license', name: 'taicore-license' },`r`n" + $anchor2)
      Set-Content -LiteralPath $reg -Value $t2 -Encoding UTF8 -NoNewline
      Write-Host '[ok] registered taicore-license in companion list'
    } else {
      $t2 = $t2.Replace("  { id: 'taicore-brand', name: 'taicore-brand' },", "  { id: 'taicore-license', name: 'taicore-license' },`r`n  { id: 'taicore-brand', name: 'taicore-brand' },")
      Set-Content -LiteralPath $reg -Value $t2 -Encoding UTF8 -NoNewline
      Write-Host '[ok] registered taicore-license (fallback anchor)'
    }
  }
}