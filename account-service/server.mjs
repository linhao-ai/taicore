// 为道 WeDAO 账号服务（1.3.1 基础版）
// 手机号验证码登录 + 微信扫码（预留）+ 设备限制 + 生图计次
// 数据：%APPDATA%\WeDAO\account\ 下 JSON 存储（后续可换 MySQL）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const PORT = Number(process.env.ACC_PORT || 8800);
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const DATA = path.join(process.env.APPDATA || os.homedir(), 'WeDAO', 'account');
fs.mkdirSync(DATA, { recursive: true });

const DB_FILE = path.join(DATA, 'db.json');
const db = (() => {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { users: {}, sessions: {}, codes: {}, devices: {}, credits: {}, orders: [] }; }
})();
const save = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');

const send = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' });
  res.end(JSON.stringify(obj));
};
const readBody = (req) => new Promise((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => r(b)); });
const token = () => crypto.randomBytes(24).toString('hex');
const now = () => new Date().toISOString();

function userByToken(req) {
  const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const s = db.sessions[t];
  if (!s) return null;
  const u = db.users[s.userId] || Object.values(db.users).find((x) => x.id === s.userId);
  return u ? { user: u, session: s, token: t } : null;
}

const FREE_CREDITS = 10;       // 新用户赠送
const MAX_DEVICES = 2;         // 单账号最多设备数

const routes = {
  'POST /api/auth/sms/send'(body) {
    const mobile = String(body.mobile || '').trim();
    if (!/^1[3-9]\d{9}$/.test(mobile)) return { ok: false, reason: '手机号格式不正确' };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    db.codes[mobile] = { code, expire: Date.now() + 10 * 60 * 1000 };
    save();
    // TODO: 接入短信服务商（阿里云/腾讯云 SMS）
    console.log('[sms]', mobile, 'code=', code);
    return { ok: true, devCode: code, note: '开发模式：验证码直接返回' };
  },

  'POST /api/auth/login'(body) {
    const mobile = String(body.mobile || '').trim();
    const code = String(body.code || '').trim();
    const deviceId = String(body.deviceId || '').trim();
    const c = db.codes[mobile];
    if (!c || c.code !== code || c.expire < Date.now()) return { ok: false, reason: '验证码错误或已过期' };
    delete db.codes[mobile];

    let u = db.users[mobile];
    if (!u) {
      u = { id: crypto.randomBytes(8).toString('hex'), mobile, createdAt: now(), devices: [], credits: FREE_CREDITS, plan: 'free' };
      db.users[mobile] = u;
    }
    // 设备限制
    if (deviceId && !u.devices.includes(deviceId)) {
      if (u.devices.length >= MAX_DEVICES) { u.devices.shift(); }
      u.devices.push(deviceId);
    }
    const t = token();
    db.sessions[t] = { userId: u.id, createdAt: now(), deviceId };
    save();
    return { ok: true, token: t, replaced: false, user: { mobile: u.mobile, credits: u.credits, plan: u.plan, devices: u.devices.length } };
  },

  'GET /api/auth/me'(body, req) {
    const r = userByToken(req);
    if (!r) return { ok: false, reason: '未登录' };
    return { ok: true, user: { mobile: r.user.mobile, credits: r.user.credits, plan: r.user.plan, devices: r.user.devices.length, createdAt: r.user.createdAt } };
  },

  'POST /api/auth/logout'(body, req) {
    const r = userByToken(req);
    if (r) { delete db.sessions[r.token]; save(); }
    return { ok: true };
  },

  // 生图计次：预扣 / 确认 / 退还
  'POST /api/gen/consume'(body, req) {
    const r = userByToken(req);
    if (!r) return { ok: false, reason: '未登录' };
    const n = Math.max(1, Number(body.count || 1));
    if (r.user.credits < n) return { ok: false, reason: '次数不足，请充值' };
    r.user.credits -= n;
    save();
    return { ok: true, credits: r.user.credits };
  },

  'POST /api/gen/refund'(body, req) {
    const r = userByToken(req);
    if (!r) return { ok: false, reason: '未登录' };
    const n = Math.max(1, Number(body.count || 1));
    r.user.credits += n;
    save();
    return { ok: true, credits: r.user.credits };
  },

  // 微信扫码登录（预留：需要微信开放平台 网站应用 appid/secret）
  'POST /api/auth/wx/qrcode'() {
    return { ok: false, reason: '微信扫码登录待接入：需要微信开放平台网站应用 AppID' };
  },
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const __p = new URL(req.url, 'http://127.0.0.1').pathname;
  if (req.method === 'GET' && (__p === '/' || __p === '/login')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(fs.readFileSync(path.join(DIR, 'public', 'login.html')));
  }
  if (req.method === 'GET' && __p === '/welcome') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(fs.readFileSync(path.join(DIR, 'public', 'welcome.html')));
  }
  const u = new URL(req.url, 'http://127.0.0.1');
  const key = req.method + ' ' + u.pathname;
  const fn = routes[key];
  if (!fn) return send(res, 404, { ok: false, reason: 'not found' });
  let body = {};
  try { body = JSON.parse((await readBody(req)) || '{}'); } catch {}
  try { return send(res, 200, fn(body, req)); }
  catch (e) { return send(res, 200, { ok: false, reason: e.message }); }
});

server.listen(PORT, '0.0.0.0', () => console.log('[account] http://127.0.0.1:' + PORT + ' data=' + DATA));
