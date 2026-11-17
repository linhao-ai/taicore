// 钛核 · 手机访问网关
// 作用：以局域网地址启动 dsh web，生成带 token 的访问链接与二维码，手机同 WiFi 扫码即可使用。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const PORT_UI = Number(process.env.UI_PORT || 8766);
const PORT_WEB = Number(process.env.WEB_PORT || 8765);

function lanIp() {
  const nets = os.networkInterfaces();
  const cands = [];
  for (const [name, list] of Object.entries(nets)) {
    for (const n of list || []) {
      if (n.family !== 'IPv4' || n.internal) continue;
      if (n.address.startsWith('169.254.')) continue;
      cands.push({ name, address: n.address });
    }
  }
  cands.sort((a, b) => {
    const score = (x) => (x.address.startsWith('192.168.') ? 0 : x.address.startsWith('10.') ? 1 : x.address.startsWith('172.') ? 2 : 3);
    return score(a) - score(b);
  });
  return cands[0] || null;
}

function findNode() {
  if (process.env.NODE_EXE && fs.existsSync(process.env.NODE_EXE)) return process.env.NODE_EXE;
  const cands = [
    path.join(HERE, '..', 'vendor', 'node', 'node.exe'),
    path.join(HERE, '..', '..', 'vendor', 'node', 'node.exe'),
    path.join(HERE, 'bin', 'node.exe'),
    process.execPath,
  ];
  for (const c of cands) { try { if (fs.existsSync(c)) return c; } catch {} }
  return 'node';
}

function findDshBin() {
  if (process.env.DSH_BIN && fs.existsSync(process.env.DSH_BIN)) return process.env.DSH_BIN;
  const cands = [
    path.join(HERE, '..', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
    path.join(HERE, '..', '..', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
  ];
  for (const c of cands) { try { if (fs.existsSync(c)) return c; } catch {} }
  return null;
}

const state = { ip: null, url: null, status: 'idle', message: '', child: null, startedAt: null };

function start() {
  const ip = lanIp();
  if (!ip) { state.status = 'error'; state.message = '未找到局域网 IP（请确认已连接 WiFi）'; return; }
  state.ip = ip.address;
  const dshBin = findDshBin();
  if (!dshBin) { state.status = 'error'; state.message = '未找到 dsh 内核（安装不完整）'; return; }
  const nodeExe = findNode();
  state.status = 'starting';
  state.message = '正在启动工作台…';

  const args = [dshBin, 'web', '--host', ip.address, '--port', String(PORT_WEB), '--no-open', '--trusted-host', `${ip.address}:${PORT_WEB}`];
  const child = spawn(nodeExe, args, { cwd: HERE, env: { ...process.env, DSH_HOME: process.env.DSH_HOME || path.join(os.homedir(), '.dsh') }, windowsHide: true });
  state.child = child;
  state.startedAt = Date.now();

  let buf = '';
  const onData = (d) => {
    const s = d.toString();
    buf += s;
    const m = /dsh web:\s*(https?:\/\/[^\s]+)/.exec(buf);
    if (m && state.status !== 'ready') {
      state.url = m[1];
      state.status = 'ready';
      state.message = '已就绪，手机扫码即可打开';
    }
    if (buf.length > 20000) buf = buf.slice(-8000);
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  child.on('exit', (code) => {
    if (state.status !== 'stopped') {
      state.status = 'error';
      state.message = `工作台进程退出（code ${code}）`;
    }
  });

  setTimeout(() => {
    if (state.status === 'starting') {
      state.status = 'error';
      state.message = '启动超时，请查看控制台日志';
    }
  }, 60000);
}

function stop() {
  if (state.child) {
    try { state.child.kill(); } catch {}
  }
  state.status = 'stopped';
  state.message = '已停止';
  state.child = null;
}

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT_UI}`);
  if (url.pathname === '/m') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return fs.createReadStream(path.join(HERE, 'public', 'mobile.html')).pipe(res);
  }
  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return fs.createReadStream(path.join(HERE, 'public', 'index.html')).pipe(res);
  }
  if (/^\/icon-\d+\.png$/.test(url.pathname)) {
    const ic = path.join(HERE, 'public', url.pathname.slice(1));
    if (fs.existsSync(ic)) {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=3600' });
      return fs.createReadStream(ic).pipe(res);
    }
    res.writeHead(404).end();
    return;
  }
  if (url.pathname === '/qrcode.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
    return fs.createReadStream(path.join(HERE, 'public', 'qrcode.js')).pipe(res);
  }
  if (url.pathname === '/api/status') {
    return json(res, 200, {
      ip: state.ip, url: state.url, mUrl: state.ip ? `http://${state.ip}:${PORT_UI}/m` : null, status: state.status, message: state.message,
      port: PORT_WEB, startedAt: state.startedAt,
    });
  }
  if (url.pathname === '/api/start' && req.method === 'POST') {
    if (state.status === 'ready' || state.status === 'starting') return json(res, 200, { status: state.status, url: state.url });
    start();
    return json(res, 200, { status: state.status });
  }
  if (url.pathname === '/api/stop' && req.method === 'POST') {
    stop();
    return json(res, 200, { status: state.status });
  }
  res.writeHead(404).end('not found');
});

server.listen(PORT_UI, '0.0.0.0', () => {
  console.log(`手机访问网关: http://127.0.0.1:${PORT_UI}`);
  start();
});
