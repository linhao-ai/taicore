// 钛核 · 用量中心（本地）
// 读取 %USERPROFILE%\.dsh\bot\usage.sqlite，统计 token 用量与估算费用
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const PORT = Number(process.env.PORT || 8791);
const DSH_DIR = path.join(os.homedir(), '.dsh');
const USAGE_DB = path.join(DSH_DIR, 'bot', 'usage.sqlite');
const KEY_FILE = path.join(DSH_DIR, 'taicore', 'provider-keys.json');

// 每百万 token 价格（人民币），仅用于估算，以厂商账单为准
const PRICES = {
  'deepseek-flash': { input: 0.5, cache: 0.1, output: 2 },
  'deepseek-pro': { input: 2, cache: 0.5, output: 8 },
  'deepseek-chat': { input: 2, cache: 0.5, output: 8 },
  'deepseek-reasoner': { input: 4, cache: 1, output: 16 },
  default: { input: 1, cache: 0.2, output: 4 },
};

// 厂商充值/控制台入口
const TOPUP = {
  'deepseek-account': { name: 'DeepSeek', url: 'https://platform.deepseek.com/top_up', balanceApi: 'https://api.deepseek.com/user/balance' },
  deepseek: { name: 'DeepSeek', url: 'https://platform.deepseek.com/top_up', balanceApi: 'https://api.deepseek.com/user/balance' },
  openai: { name: 'OpenAI', url: 'https://platform.openai.com/settings/organization/billing/overview' },
  moonshot: { name: 'Kimi', url: 'https://platform.moonshot.cn/console/info' },
  qwen: { name: '通义千问', url: 'https://dashscope.console.aliyun.com/overview' },
  ollama: { name: '本地 Ollama', url: '' },
};

function priceOf(model) {
  const key = String(model || '').toLowerCase();
  for (const [k, v] of Object.entries(PRICES)) {
    if (k !== 'default' && key.includes(k)) return v;
  }
  return PRICES.default;
}

function readUsage() {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(USAGE_DB, { readOnly: true });
    const rows = db.prepare('select session,time,provider,model,kind,input,cache_read,cache_write,output from calls order by time desc limit 5000').all();
    db.close();
    return rows;
  } catch (e) {
    return { error: String(e.message || e) };
  }
}

function summarize(rows, days) {
  const since = days > 0 ? Date.now() - days * 86400 * 1000 : 0;
  const list = rows.filter((r) => r.time >= since);
  let input = 0, cache = 0, output = 0, cost = 0;
  const byModel = new Map();
  const byDay = new Map();
  for (const r of list) {
    const p = priceOf(r.model);
    const c = ((r.input || 0) * p.input + (r.cache_read || 0) * p.cache + (r.output || 0) * p.output) / 1e6;
    input += r.input || 0;
    cache += r.cache_read || 0;
    output += r.output || 0;
    cost += c;
    const m = r.model || 'unknown';
    const cur = byModel.get(m) || { model: m, calls: 0, input: 0, output: 0, cost: 0 };
    cur.calls++; cur.input += r.input || 0; cur.output += r.output || 0; cur.cost += c;
    byModel.set(m, cur);
    const day = new Date(r.time).toISOString().slice(0, 10);
    const d = byDay.get(day) || { day, input: 0, output: 0, cost: 0, calls: 0 };
    d.input += r.input || 0; d.output += r.output || 0; d.cost += c; d.calls++;
    byDay.set(day, d);
  }
  return {
    calls: list.length,
    input, cache, output,
    tokens: input + output,
    cost: Number(cost.toFixed(4)),
    models: [...byModel.values()].sort((a, b) => b.cost - a.cost),
    days: [...byDay.values()].sort((a, b) => (a.day < b.day ? -1 : 1)),
    providers: [...new Set(list.map((r) => r.provider).filter(Boolean))],
  };
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function loadKeys() {
  try { return JSON.parse(fs.readFileSync(KEY_FILE, 'utf8')); } catch { return {}; }
}
function saveKeys(obj) {
  fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
  fs.writeFileSync(KEY_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = url.pathname;

  if (p === '/' || p === '/index.html') {
    const f = path.join(HERE, 'public', 'index.html');
    res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
    return fs.createReadStream(f).pipe(res);
  }

  if (p === '/api/summary') {
    const range = Number(url.searchParams.get('days') || 0);
    const rows = readUsage();
    if (!Array.isArray(rows)) return sendJson(res, 200, { error: rows.error, calls: 0 });
    return sendJson(res, 200, { range, all: summarize(rows, 0), today: summarize(rows, 1), week: summarize(rows, 7), month: summarize(rows, 30), current: summarize(rows, range) });
  }

  if (p === '/api/records') {
    const limit = Math.min(200, Number(url.searchParams.get('limit') || 50));
    const rows = readUsage();
    if (!Array.isArray(rows)) return sendJson(res, 200, { error: rows.error, records: [] });
    const records = rows.slice(0, limit).map((r) => {
      const pr = priceOf(r.model);
      const cost = ((r.input || 0) * pr.input + (r.cache_read || 0) * pr.cache + (r.output || 0) * pr.output) / 1e6;
      return { ...r, cost: Number(cost.toFixed(5)), providerName: (TOPUP[r.provider] || {}).name || r.provider };
    });
    return sendJson(res, 200, { records });
  }

  if (p === '/api/providers') {
    const rows = readUsage();
    const set = new Set(Array.isArray(rows) ? rows.map((r) => r.provider).filter(Boolean) : []);
    const list = [...set].map((id) => ({ id, ...(TOPUP[id] || { name: id, url: '' }) }));
    return sendJson(res, 200, list);
  }

  if (p === '/api/balance') {
    const provider = url.searchParams.get('provider') || 'deepseek-account';
    const keys = loadKeys();
    const key = keys[provider] || keys.deepseek || '';
    const meta = TOPUP[provider] || {};
    if (!meta.balanceApi) return sendJson(res, 200, { supported: false, provider, name: meta.name || provider, topupUrl: meta.url || '' });
    if (!key) return sendJson(res, 200, { supported: true, needKey: true, provider, name: meta.name, topupUrl: meta.url });
    try {
      const r = await fetch(meta.balanceApi, { headers: { Authorization: 'Bearer ' + key } });
      const j = await r.json();
      return sendJson(res, 200, { supported: true, provider, name: meta.name, topupUrl: meta.url, balance: j });
    } catch (e) {
      return sendJson(res, 200, { supported: true, provider, name: meta.name, topupUrl: meta.url, error: String(e.message || e) });
    }
  }

  if (p === '/api/keys' && req.method === 'POST') {
    let body = '';
    for await (const c of req) body += c;
    try {
      const j = JSON.parse(body || '{}');
      const keys = loadKeys();
      if (j.provider && j.key) keys[j.provider] = String(j.key).trim();
      if (j.provider && j.key === '') delete keys[j.provider];
      saveKeys(keys);
      return sendJson(res, 200, { ok: true, providers: Object.keys(keys) });
    } catch (e) {
      return sendJson(res, 400, { error: String(e.message || e) });
    }
  }

  res.writeHead(404).end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`用量中心已启动: http://127.0.0.1:${PORT}`);
  console.log(`数据源: ${USAGE_DB}`);
  console.log(`密钥文件: ${KEY_FILE}`);
});
