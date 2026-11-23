# 给打包后的 dsh-pocket 代理打品牌补丁：页面标题 / 图标 / PWA 清单
param([Parameter(Mandatory = $true)][string]$Upstream)

$ErrorActionPreference = 'Continue'
$proxy = Join-Path $Upstream 'dsh-desktop/assets/plugins/dsh-pocket/lib/proxy.mjs'
if (-not (Test-Path $proxy)) { Write-Host '[pocket] proxy.mjs 不存在，跳过'; return }

$c = [System.IO.File]::ReadAllText($proxy)
if ($c -match 'WEDAO_BRAND') { Write-Host '[pocket] 已打过补丁'; return }

$logo = 'https://dl.wedao.org.cn/assets/brand/logo-mark.png'
$nl = [Environment]::NewLine

# 1) 注入脚本常量
$injectLines = @(
  'export const WEDAO_BRAND = ''<script data-wedao-brand="1">!function(){try{',
  'var L=''__LOGO__'';',
  'function fix(){',
  '  document.title=''为道 WeDAO'';',
  '  document.querySelectorAll(''link[rel*="icon"]'').forEach(function(e){ if(e.href!==L) e.href=L; });',
  '  var m=document.querySelector(''link[rel="manifest"]'');',
  '  if(m && m.getAttribute(''href'')!==''/manifest.webmanifest'') m.setAttribute(''href'',''/manifest.webmanifest'');',
  '}',
  'if(document.readyState===''loading'') document.addEventListener(''DOMContentLoaded'',fix); else fix();',
  'setInterval(fix,800);',
  'try{ new MutationObserver(fix).observe(document.head||document.documentElement,{childList:true,subtree:true}); }catch(e){}',
  '}catch(e){}}();</script>'';'
)
$inject = ($injectLines -join $nl).Replace('__LOGO__', $logo)

$c = $c.Replace('export const DEFAULT_INJECT', $inject + $nl + 'export const DEFAULT_INJECT')
$c = [regex]::Replace($c, 'export const DEFAULT_INJECT = ([^;]+);', 'export const DEFAULT_INJECT = $1 + WEDAO_BRAND;')

# 2) 路由：品牌 favicon 与 PWA 清单
$routeLines = @(
  '    // WEDAO_ASSET_ROUTE：品牌 favicon 与 PWA 清单',
  '    try {',
  '      const __p = String(req.url || '''').split(''?'')[0];',
  '      if (__p === ''/favicon.ico'' || __p === ''/apple-touch-icon.png'' || __p === ''/apple-touch-icon-precomposed.png'' || __p === ''/icon.png'') {',
  '        res.writeHead(302, { Location: ''__LOGO__'', ''Cache-Control'': ''no-cache'' });',
  '        return res.end();',
  '      }',
  '      if (__p === ''/manifest.webmanifest'' || __p === ''/wedao.webmanifest'') {',
  '        const body = JSON.stringify({',
  '          name: ''为道 WeDAO'', short_name: ''为道'', start_url: ''/'', display: ''standalone'',',
  '          background_color: ''#05070d'', theme_color: ''#05070d'',',
  '          icons: [{ src: ''__LOGO__'', sizes: ''512x512'', type: ''image/png'', purpose: ''any'' }],',
  '        });',
  '        res.writeHead(200, { ''Content-Type'': ''application/manifest+json; charset=utf-8'', ''Cache-Control'': ''no-store'', ''Access-Control-Allow-Origin'': ''*'' });',
  '        return res.end(body);',
  '      }',
  '    } catch (e) {}'
)
$route = ($routeLines -join $nl).Replace('__LOGO__', $logo)

$c = $c.Replace('createServer((req, res) => {', ('createServer((req, res) => {' + $nl + $route))

[System.IO.File]::WriteAllText($proxy, $c, (New-Object System.Text.UTF8Encoding($false)))
Write-Host '[pocket] 品牌补丁已应用'
