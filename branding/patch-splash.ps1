<#
  品牌启动页补丁（Phase2）：
  1) 打补丁到 Rust 源码 pages.rs —— 启动页 HTML 就编译在里面
  2) 顺带处理 ui/index.html（若被引用）
#>
param(
  [Parameter(Mandatory = $true)][string]$Upstream
)

$ErrorActionPreference = 'Continue'
$root = Join-Path $Upstream 'dsh-tauri'
if (-not (Test-Path $root)) { Write-Host "[splash] skip: $root"; return }

$style = '<style>body{background:#05070d !important;color:#e9f1ff !important}main{color:#e9f1ff} .t{color:#e9f1ff !important} #title{background:linear-gradient(90deg,#eaf6ff,#8fe6ff,#a5b4fc);-webkit-background-clip:text;background-clip:text;color:transparent !important;font-size:22px !important;letter-spacing:.02em} .ring{display:none} #__wdbg{position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:0;pointer-events:none}#steps{display:none !important}.ring{display:none !important}#title{position:relative;z-index:2}</style><canvas id="__wdbg"></canvas><script>(function(){var c=document.getElementById("__wdbg");if(!c)return;var x=c.getContext("2d"),W=0,H=0,P=[],N=120,D=170;function rs(){var d=devicePixelRatio||1;W=c.clientWidth;H=c.clientHeight;c.width=W*d;c.height=H*d;x.setTransform(d,0,0,d,0,0)}function init(){P=[];for(var i=0;i<N;i++)P.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:Math.random()*1.5+.5})}function loop(){x.clearRect(0,0,W,H);for(var i=0;i<P.length;i++){var p=P[i];p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fillStyle="rgba(120,220,255,.6)";x.fill()}for(var a=0;a<P.length;a++)for(var b=a+1;b<P.length;b++){var dx=P[a].x-P[b].x,dy=P[a].y-P[b].y,d=Math.sqrt(dx*dx+dy*dy);if(d<D){x.beginPath();x.moveTo(P[a].x,P[a].y);x.lineTo(P[b].x,P[b].y);x.strokeStyle="rgba(34,211,238,"+(0.15*(1-d/D)).toFixed(3)+")";x.lineWidth=1;x.stroke()}}requestAnimationFrame(loop)}function boot(){rs();init()}boot();setTimeout(boot,100);addEventListener("resize",boot);loop()})();</script>'

$targets = @()
$pages = Get-ChildItem $root -Recurse -Filter 'pages.rs' -File -ErrorAction SilentlyContinue
if ($pages) { $targets += $pages }

$changed = 0
foreach ($f in $targets) {
  $t = [System.IO.File]::ReadAllText($f.FullName)
  $orig = $t
  $t = $t.Replace('正在启动 DSH 内核', '正在启动 为道 AI 工作台')
  $t = $t.Replace('DSH Pack', '为道 WeDAO')
  if ($t -match '</head>') { $t = $t -replace '</head>', ($style + '</head>') }
  elseif ($t -match '<main>') { $t = $t -replace '<main>', ($style + '<main>') }
  # 窗口/页面图标
  $iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD97A"/><stop offset="1" stop-color="#C9962B"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="#0B1220"/><path d="M22 32c0-6 4-10 9-10 3 0 5 1 7 4 2 3 3 6 6 6s6-4 6-6c3 0 5 4 5 9s-2 9-5 9c-3 0-4-3-6-6-2-3-4-4-7-4-5 0-9-4-9-10" fill="none" stroke="url(#g)" stroke-width="4" stroke-linecap="round"/></svg>'
  $iconUri = 'data:image/svg+xml;utf8,' + [uri]::EscapeDataString($iconSvg)
  if ($t -match '<title>') { $t = $t -replace '</title>', ('</title><link rel="icon" href="' + $iconUri + '">') }
  if ($t -ne $orig) {
    [System.IO.File]::WriteAllText($f.FullName, $t, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "[splash] patched rust: $($f.FullName)"
    $changed++
  }
}

# 旧逻辑：ui/index.html（部分版本会读）
$ui = Get-ChildItem $root -Recurse -Filter 'index.html' -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match '\\ui\\' }
foreach ($f in $ui) {
  $t = [System.IO.File]::ReadAllText($f.FullName)
  if ($t -match 'DSH Pack|正在启动') {
    [System.IO.File]::WriteAllText($f.FullName, ($t.Replace('DSH Pack', '为道 WeDAO').Replace('正在启动 DSH 内核', '正在启动 为道 AI 工作台')), (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "[splash] patched ui: $($f.FullName)"
    $changed++
  }
}
Write-Host "[splash] done, files changed: $changed"
