<#
  品牌启动页补丁：在上游 dsh-tauri 源码里替换启动页文案 + 注入科技感样式与粒子
  由 apply-brand.ps1 调用（CI 构建时执行）
#>
param(
  [Parameter(Mandatory = $true)][string]$Upstream
)

$ErrorActionPreference = 'Continue'
$root = Join-Path $Upstream 'dsh-tauri'
if (-not (Test-Path $root)) { Write-Host "[splash] skip: $root not found"; return }

$targets = Get-ChildItem $root -Recurse -File -Include *.html,*.js,*.css,*.ts,*.tsx -ErrorAction SilentlyContinue |
  Where-Object { $_.Length -lt 30MB } |
  ForEach-Object {
    $t = [System.IO.File]::ReadAllText($_.FullName)
    if ($t -match '正在启动 DSH 内核|DSH Pack') { $_ }
  }

if (-not $targets) { Write-Host '[splash] no splash source found'; return }

$style = @'
<style id="wedao-brand-splash">
html,body{background:#05070d !important;color:#e9f1ff !important;
  font-family:"Microsoft YaHei",system-ui,sans-serif !important;overflow:hidden}
body>*{color:#e9f1ff !important}
h1,h2,h3,b,strong{color:#dff6ff !important}
#__wedao_particles{position:fixed;inset:0;z-index:0;pointer-events:none}
</style>
<canvas id="__wedao_particles"></canvas>
<script>
(function(){
  var c=document.getElementById('__wedao_particles');if(!c)return;
  var x=c.getContext('2d'),W=0,H=0,P=[],N=80,D=150;
  function rs(){var d=devicePixelRatio||1;W=c.clientWidth;H=c.clientHeight;c.width=W*d;c.height=H*d;x.setTransform(d,0,0,d,0,0);}
  function init(){P=[];for(var i=0;i<N;i++)P.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:Math.random()*1.6+.6});}
  function loop(){
    x.clearRect(0,0,W,H);
    for(var i=0;i<P.length;i++){var p=P[i];p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;
      x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fillStyle='rgba(120,220,255,.7)';x.fill();}
    for(var a=0;a<P.length;a++)for(var b=a+1;b<P.length;b++){
      var dx=P[a].x-P[b].x,dy=P[a].y-P[b].y,d=Math.sqrt(dx*dx+dy*dy);
      if(d<D){x.beginPath();x.moveTo(P[a].x,P[a].y);x.lineTo(P[b].x,P[b].y);
        x.strokeStyle='rgba(34,211,238,'+(0.16*(1-d/D)).toFixed(3)+')';x.lineWidth=1;x.stroke();}}
    requestAnimationFrame(loop);}
  rs();init();loop();addEventListener('resize',function(){rs();init();});
})();
</script>
'@

$changed = 0
foreach ($f in $targets) {
  $t = [System.IO.File]::ReadAllText($f.FullName)
  $orig = $t
  $t = $t.Replace('正在启动 DSH 内核', '正在启动 为道 AI 工作台')
  $t = $t.Replace('正在启动DSH内核', '正在启动 为道 AI 工作台')
  $t = $t.Replace('DSH Pack', '为道 WeDAO')
  $t = $t.Replace('DSH Pack（Tauri 版）', '为道 WeDAO')
  if ($t -match '</body>') { $t = $t -replace '</body>', ($style + '</body>') }
  elseif ($t -match '</head>') { $t = $t -replace '</head>', ($style + '</head>') }
  if ($t -ne $orig) {
    [System.IO.File]::WriteAllText($f.FullName, $t, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "[splash] patched: $($f.FullName)"
    $changed++
  }
}
Write-Host "[splash] done, files changed: $changed"
