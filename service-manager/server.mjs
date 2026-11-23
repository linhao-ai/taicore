// 为道 WeDAO 服务管理器（按需启动 + 空闲回收）
// 常驻内存约 25MB，替代 4 个常驻服务（约 1GB）
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const PORT = Number(process.env.SM_PORT || 8799);
const IDLE_MS = Number(process.env.SM_IDLE_MIN || 10) * 60 * 1000;
const PERSIST_SERVICES = new Set(['account']); // 常驻：账号服务不自动回收（手机端依赖）
const ROOT = process.env.SM_ROOT || 'D:\\Users\\YC\\Documents\\deepseek-harness\\default-workspace\\seed';

const NODE = process.execPath;

const SERVICES = {
  img: { port: 8793, dir: 'img-studio', entry: 'server.mjs' },
  video: { port: 8790, dir: 'video-workshop', entry: 'server.mjs' },
  team: { port: 8796, dir: 'team-room', entry: 'server.mjs' },
  huoke: { port: 8792, dir: 'get-clients', entry: 'server.mjs' },
  account: { port: 8800, dir: 'account-service', entry: 'server.mjs' },
};

const state = {}; // name -> { proc, lastUsed, autoStarted }

function isOpen(port) {
  return new Promise((res) => {
    const s = net.connect({ host: '127.0.0.1', port }, () => { s.destroy(); res(true); });
    s.on('error', () => res(false));
    s.setTimeout(600, () => { s.destroy(); res(false); });
  });
}

async function ensure(name) {
  const svc = SERVICES[name];
  if (!svc) return { ok: false, reason: 'unknown service' };
  const st = state[name] || (state[name] = { proc: null, lastUsed: 0, autoStarted: false });
  st.lastUsed = Date.now();

  if (await isOpen(svc.port)) return { ok: true, started: false, port: svc.port };

  const dir = path.join(ROOT, svc.dir);
  const entry = path.join(dir, svc.entry);
  if (!fs.existsSync(entry)) return { ok: false, reason: 'entry missing: ' + entry };

  const logDir = path.join(os.homedir(), '.wedao-svc');
  fs.mkdirSync(logDir, { recursive: true });
  const out = fs.openSync(path.join(logDir, name + '.log'), 'a');
  const proc = spawn(NODE, [entry], { cwd: dir, stdio: ['ignore', out, out], windowsHide: true, detached: false });
  st.proc = proc; st.autoStarted = true;
  proc.on('exit', () => { st.proc = null; st.autoStarted = false; });

  // 等端口就绪（最多 12 秒）
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isOpen(svc.port)) return { ok: true, started: true, port: svc.port };
  }
  return { ok: false, reason: 'start timeout', port: svc.port };
}

function stop(name) {
  const st = state[name];
  if (st && st.proc) {
    try { st.proc.kill(); } catch {}
    st.proc = null; st.autoStarted = false;
    return true;
  }
  return false;
}

setInterval(async () => {
  const now = Date.now();
  for (const name of Object.keys(state)) {
    const st = state[name];
    if (!PERSIST_SERVICES.has(name) && st.autoStarted && st.lastUsed && now - st.lastUsed > IDLE_MS) {
      const open = await isOpen(SERVICES[name].port);
      if (open) { stop(name); console.log('[idle stop]', name); }
    }
  }
}, 60 * 1000);

const send = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
};

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': '*' });
    return res.end();
  }
  if (u.pathname === '/status') {
    const list = {};
    for (const [n, s] of Object.entries(SERVICES)) list[n] = { port: s.port, open: await isOpen(s.port) };
    return send(res, 200, { ok: true, services: list });
  }
  if (u.pathname === '/ensure') {
    const name = u.searchParams.get('name') || '';
    try { return send(res, 200, await ensure(name)); } catch (e) { return send(res, 200, { ok: false, reason: e.message }); }
  }
  if (u.pathname === '/stop') {
    return send(res, 200, { ok: stop(u.searchParams.get('name') || '') });
  }
  send(res, 404, { ok: false, reason: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => console.log('[svc-manager] http://127.0.0.1:' + PORT + ' root=' + ROOT));
