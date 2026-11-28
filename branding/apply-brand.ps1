
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
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null
Copy-Item ([System.IO.Path]::Combine($Branding, 'branding', 'icon.ico')) ([System.IO.Path]::Combine($iconDir, 'icon.ico')) -Force
Copy-Item ([System.IO.Path]::Combine($Branding, 'branding', 'icon.png')) ([System.IO.Path]::Combine($iconDir, 'icon.png')) -Force
  # WEDAO_ICON_FIX2：tauri.conf 位于 src/app/，图标也要放到 src/app/icons/
  $icoDir2 = [System.IO.Path]::Combine($appDir, 'src', 'app', 'icons')
  New-Item -ItemType Directory -Force -Path $icoDir2 | Out-Null
  $wi = [System.IO.Path]::Combine($Branding, 'branding', 'icons', 'wedao.ico')
  $wpng = [System.IO.Path]::Combine($Branding, 'branding', 'icons', 'wedao.png')
  if (Test-Path $wi) { Copy-Item $wi ([System.IO.Path]::Combine($icoDir2, 'wedao.ico')) -Force; Write-Host '[ok] wedao.ico -> src/app/icons' }
  if (Test-Path $wpng) { Copy-Item $wpng ([System.IO.Path]::Combine($icoDir2, 'wedao.png')) -Force }
  $s2 = [System.IO.Path]::Combine($Upstream, 'dsh-tauri', 'src-tauri', 'icons')
  New-Item -ItemType Directory -Force -Path $s2 | Out-Null
  if (Test-Path $wi) { Copy-Item $wi ([System.IO.Path]::Combine($s2, 'wedao.ico')) -Force; Write-Host '[ok] wedao.ico -> src-tauri/icons' }
# WEDAO_ICON_OVERRIDE：把 wedao.ico 覆盖成 icon.ico（Windows 资源用的是 icon.ico）
  $wi2 = [System.IO.Path]::Combine($Branding, 'branding', 'icons', 'wedao.ico')
  if (Test-Path $wi2) {
    Copy-Item $wi2 ([System.IO.Path]::Combine($icoDir2, 'icon.ico')) -Force
    Copy-Item $wi2 ([System.IO.Path]::Combine($s2, 'icon.ico')) -Force
    Write-Host '[ok] icon.ico overridden with wedao.ico'
  }
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

# STRIP_AT_END：确保 tauri.conf.json 无 BOM
$confPath = Join-Path $Upstream 'dsh-tauri/src-tauri/src/app/tauri.conf.json'
if (Test-Path $confPath) { Strip-Bom $confPath }


# 品牌启动页（粒子 + 文案）
$splashScript = Join-Path $PSScriptRoot 'patch-splash.ps1'
if (Test-Path $splashScript) {
  try { & $splashScript -Upstream $Upstream } catch { Write-Host "[splash] failed: $_" }
}


# WEDAO_ICONS_COPY：把品牌图标复制到 tauri-build 要求的位置（src-tauri/icons）
$iconsSrcDir = Join-Path $Branding 'branding\icons'
$iconsDstDir = Join-Path $Upstream 'dsh-tauri\src-tauri\icons'
if (Test-Path $iconsSrcDir) {
  New-Item -ItemType Directory -Force -Path $iconsDstDir | Out-Null
  Copy-Item (Join-Path $iconsSrcDir '*') $iconsDstDir -Force -Recurse
  # 同时兼容默认 icon.ico 名称
  $wedaoIco = Join-Path $iconsDstDir 'wedao.ico'
  if (Test-Path $wedaoIco) { Copy-Item $wedaoIco (Join-Path $iconsDstDir 'icon.ico') -Force }
  Write-Host '[ok] brand icons -> src-tauri/icons'
  Get-ChildItem $iconsDstDir | ForEach-Object { Write-Host ("  ico: " + $_.Name) }
} else {
  Write-Host '[warn] branding/icons 不存在'
}


# TAICORE_SERVICES_INSTALL：服务自启插件（复制 + 注册）
$svcSrc = [System.IO.Path]::Combine($Branding, 'plugins', 'taicore-services')
$svcDst = [System.IO.Path]::Combine($Upstream, 'dsh-desktop', 'assets', 'plugins', 'taicore-services')
if (Test-Path $svcSrc) {
  New-Item -ItemType Directory -Force -Path $svcDst | Out-Null
  Copy-Item -Path ([System.IO.Path]::Combine($svcSrc, '*')) -Destination $svcDst -Recurse -Force
  Write-Host '[ok] plugin -> assets/plugins/taicore-services'

  $regSvc = [System.IO.Path]::Combine($Upstream, 'dsh-desktop', 'scripts', 'lib', 'companion-plugins.js')
  if (Test-Path $regSvc) {
    $tSvc = [System.IO.File]::ReadAllText($regSvc)
    if ($tSvc -notmatch 'taicore-services') {
      $entry = "  { id: 'taicore-services', name: 'taicore-services' },"
      $anchorSvc = "  { id: 'taicore-brand', name: 'taicore-brand' },"
      if ($tSvc.Contains($anchorSvc)) {
        $tSvc = $tSvc.Replace($anchorSvc, $entry + "`r`n" + $anchorSvc)
      } else {
        $tSvc = $tSvc.Replace("module.exports = [", "module.exports = [`r`n" + $entry)
      }
      [System.IO.File]::WriteAllText($regSvc, $tSvc, (New-Object System.Text.UTF8Encoding($false)))
      Write-Host '[ok] registered taicore-services in companion list'
    }
  }
}

# 品牌化 dsh-pocket 代理（标题/图标/PWA 清单）
$pocketScript = Join-Path $PSScriptRoot 'patch-pocket.ps1'
if (Test-Path $pocketScript) {
  try { & $pocketScript -Upstream $Upstream } catch { Write-Host "[pocket] failed: $_" }
}


# WEDAO_OFFPEAK_OFF：安装包默认关闭错峰拦截插件（避免高峰弹窗打断）
$offpeakDir = Join-Path $Upstream 'dsh-desktop/assets/plugins/dsh-offpeak'
if (Test-Path $offpeakDir) {
  Rename-Item -LiteralPath $offpeakDir -NewName 'dsh-offpeak.disabled' -Force -ErrorAction SilentlyContinue
  Write-Host '[ok] dsh-offpeak disabled'
  $regOff = Join-Path $Upstream 'dsh-desktop/scripts/lib/companion-plugins.js'
  if (Test-Path $regOff) {
    $tOff = [System.IO.File]::ReadAllText($regOff)
    $tOff = $tOff -replace "(?m)^\s*\{ id: 'dsh-offpeak'.*\r?\n?", ''
    [System.IO.File]::WriteAllText($regOff, $tOff, (New-Object System.Text.UTF8Encoding($false)))
  }
}


# WEDAO_NO_LICENSE：发行版不再使用授权码（改为账号登录）
$regNoLic = Join-Path $Upstream 'dsh-desktop/scripts/lib/companion-plugins.js'
if (Test-Path $regNoLic) {
  $tNoLic = [System.IO.File]::ReadAllText($regNoLic)
  $tNoLic = $tNoLic -replace "(?m)^\s*\{ id: 'taicore-license'.*\r?\n?", ''
  [System.IO.File]::WriteAllText($regNoLic, $tNoLic, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host '[ok] taicore-license removed from companion list'
}
$licDir = Join-Path $Upstream 'dsh-desktop/assets/plugins/taicore-license'
if (Test-Path $licDir) { Remove-Item $licDir -Recurse -Force -ErrorAction SilentlyContinue; Write-Host '[ok] taicore-license removed' }


# WEDAO_SHORTCUT_ICON：把品牌 ico 放进 assets，供快捷方式使用
$wiAsset = Join-Path $Branding 'branding/icons/wedao.ico'
$assetDir = Join-Path $Upstream 'dsh-desktop/assets'
if ((Test-Path $wiAsset) -and (Test-Path $assetDir)) {
  Copy-Item $wiAsset (Join-Path $assetDir 'wedao.ico') -Force
  Write-Host '[ok] wedao.ico -> dsh-desktop/assets'
}


# WEDAO_ASSET_ICONS：替换鲸鱼图标（标题栏/头像/托盘/手机）
$brand = Join-Path $Branding 'branding/icons'
$dshAssets = Join-Path $Upstream 'dsh-desktop/assets'
if ((Test-Path $brand) -and (Test-Path $dshAssets)) {
  Copy-Item (Join-Path $brand 'brand-900.png') (Join-Path $dshAssets 'icon.png') -Force
  Copy-Item (Join-Path $brand 'brand-900.jpg') (Join-Path $dshAssets 'icon.jpg') -Force
  Copy-Item (Join-Path $brand 'brand-256.png') (Join-Path $dshAssets 'tray-icon.png') -Force
  $icoSrc = Join-Path $brand 'wedao_win.ico'
  if (-not (Test-Path $icoSrc)) { $icoSrc = Join-Path $brand 'wedao.ico' }
  if (Test-Path $icoSrc) { Copy-Item $icoSrc (Join-Path $dshAssets 'icon.ico') -Force }
  Write-Host '[ok] brand icons -> dsh-desktop/assets'
}
$mob = Join-Path $Upstream 'dsh-desktop/mobile-gateway/public'
if ((Test-Path $brand) -and (Test-Path $mob)) {
  Copy-Item (Join-Path $brand 'brand-192.png') (Join-Path $mob 'icon-192.png') -Force
  Copy-Item (Join-Path $brand 'brand-512.png') (Join-Path $mob 'icon-512.png') -Force
  Write-Host '[ok] brand icons -> mobile-gateway/public'
}


# WEDAO_FRONTEND_ICONS：前端/PWA/移动端图标也换成品牌
$fe = Join-Path $Upstream 'dsh-desktop/node_modules/@deepseek-ai/dsh-web-frontend/dist'
if ((Test-Path $fe) -and (Test-Path $brand)) {
  Copy-Item (Join-Path $brand 'brand-192.png') (Join-Path $fe 'icon-192.png') -Force
  Copy-Item (Join-Path $brand 'brand-512.png') (Join-Path $fe 'icon-512.png') -Force
  Copy-Item (Join-Path $brand 'brand-512.png') (Join-Path $fe 'icon-maskable-512.png') -Force
  Copy-Item (Join-Path $brand 'brand-192.png') (Join-Path $fe 'apple-touch-icon.png') -Force
  Write-Host '[ok] brand icons -> web-frontend/dist'
}
$mob2 = Join-Path $Upstream 'dsh-desktop/mobile-gateway/public'
if ((Test-Path $mob2) -and (Test-Path $brand)) {
  Copy-Item (Join-Path $brand 'brand-192.png') (Join-Path $mob2 'icon-192.png') -Force
  Copy-Item (Join-Path $brand 'brand-512.png') (Join-Path $mob2 'icon-512.png') -Force
  Write-Host '[ok] brand icons -> mobile-gateway/public'
}


# WEDAO_ICON_PNGSET：Tauri 会用 32x32/128x128/icon.png 做窗口图标，全部覆盖
$pngDir = Join-Path $Upstream 'dsh-tauri/src-tauri/icons'
$pngDir2 = Join-Path $Upstream 'dsh-tauri/src-tauri/src/app/icons'
$b192 = Join-Path $Branding 'branding/icons/brand-192.png'
$b256 = Join-Path $Branding 'branding/icons/brand-256.png'
$b512 = Join-Path $Branding 'branding/icons/brand-512.png'
foreach ($pd in @($pngDir, $pngDir2)) {
  if (-not (Test-Path $pd)) { continue }
  if (Test-Path $b256) { Copy-Item $b256 (Join-Path $pd '32x32.png') -Force; Copy-Item $b256 (Join-Path $pd 'icon.png') -Force }
  if (Test-Path $b192) { Copy-Item $b192 (Join-Path $pd '128x128.png') -Force }
  if (Test-Path $b256) { Copy-Item $b256 (Join-Path $pd '128x128@2x.png') -Force }
  if (Test-Path $b512) { Copy-Item $b512 (Join-Path $pd 'icon-512.png') -Force }
  if (Test-Path $b256) { Copy-Item $b256 (Join-Path $pd 'tray-icon.png') -Force }
  Write-Host '[ok] png icon set -> ' $pd
}
