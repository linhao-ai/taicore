param(
  [Parameter(Mandatory = $true)][string]$Upstream
)
$ErrorActionPreference = 'Continue'
$root = Join-Path $Upstream 'dsh-tauri'
if (-not (Test-Path $root)) { Write-Host "[splash] skip"; return }

$style = @'
<style id="wedao-splash-style">body{background:#05070d !important;color:#e9f1ff !important;-webkit-font-smoothing:antialiased}main{position:relative;z-index:2;color:#e9f1ff !important}#title{background:linear-gradient(90deg,#eaf6ff,#8fe6ff,#a5b4fc);-webkit-background-clip:text;background-clip:text;color:transparent !important;letter-spacing:.02em}.ring{display:none !important}#steps{display:none !important}#__wdbg{position:fixed;left:0;top:0;width:100vw;height:100vh;display:block;z-index:0;pointer-events:none;opacity:.85}</style><canvas id="__wdbg"></canvas><script>(function(){var c=document.getElementById("__wdbg");if(!c)return;var x=c.getContext("2d"),W=0,H=0,P=[],N=200,D=190;function rs(){var d=devicePixelRatio||1;W=Math.max(window.innerWidth,320);H=Math.max(window.innerHeight,240);c.width=W*d;c.height=H*d;c.style.width=W+"px";c.style.height=H+"px";x.setTransform(d,0,0,d,0,0)}function init(){P=[];for(var i=0;i<N;i++)P.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.22,r:Math.random()*1.1+.3})}function loop(){x.clearRect(0,0,W,H);for(var i=0;i<P.length;i++){var p=P[i];p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fillStyle="rgba(120,214,255,.28)";x.fill()}for(var a=0;a<P.length;a++)for(var b=a+1;b<P.length;b++){var dx=P[a].x-P[b].x,dy=P[a].y-P[b].y,d=Math.sqrt(dx*dx+dy*dy);if(d<D){x.beginPath();x.moveTo(P[a].x,P[a].y);x.lineTo(P[b].x,P[b].y);x.strokeStyle="rgba(46,190,235,"+(0.07*(1-d/D)).toFixed(3)+")";x.lineWidth=1;x.stroke()}}requestAnimationFrame(loop)}function boot(){rs();init()}boot();setTimeout(boot,80);setTimeout(boot,400);addEventListener("resize",boot);loop()})();</script>
'@

$changed = 0
$pages = Get-ChildItem $root -Recurse -Filter 'pages.rs' -File -ErrorAction SilentlyContinue
foreach ($f in $pages) {
  $t = [System.IO.File]::ReadAllText($f.FullName)
  $orig = $t
  $t = $t.Replace('正在启动 DSH 内核', '正在启动 为道 AI 工作台')
  $t = $t.Replace('DSH Pack', '为道 WeDAO')
  if ($t -match '</head>') { $t = $t -replace '</head>', ($style + '</head>') }
  elseif ($t -match '<main>') { $t = $t -replace '<main>', ($style + '<main>') }
  if ($t -ne $orig) {
    [System.IO.File]::WriteAllText($f.FullName, $t, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "[splash] patched rust: $($f.FullName)"
    $changed++
  }
}
Write-Host "[splash] done, files changed: $changed"
