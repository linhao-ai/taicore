import { fileURLToPath } from 'node:url';
// 钛核 · 智能客服（本地）
// 知识库 + 检索 + AI 回复生成；数据存本机
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8794);
const DATA_DIR = path.join(os.homedir(), '.dsh', 'taicore');
const KB_FILE = path.join(DATA_DIR, 'cs-kb.json');
const SETTINGS = path.join(DATA_DIR, 'cs-settings.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

const readJson = (f, def) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; } };
const writeJson = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 2), 'utf8');
const settings = () => readJson(SETTINGS, { apiKey: '', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com', shopName: '', tone: '亲切专业' });

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function readBody(req, limit = 4 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) return reject(new Error('too large')); chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function askModel(messages, json = false) {
  const s = settings();
  if (!s.apiKey) return null;
  const body = { model: s.model || 'deepseek-chat', messages, temperature: 0.5, max_tokens: 1200 };
  if (json) body.response_format = { type: 'json_object' };
  const r = await fetch(`${(s.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.apiKey },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`模型接口 ${r.status}: ${t.slice(0, 160)}`);
  const j = JSON.parse(t);
  const content = j.choices?.[0]?.message?.content || '';
  if (!json) return content;
  try { return JSON.parse(content); } catch { return { raw: content }; }
}

/* 简单检索：字重合 + 关键词命中 */
function score(q, item) {
  const a = String(q || '').toLowerCase();
  const b = (String(item.q || '') + ' ' + String(item.a || '')).toLowerCase();
  let s = 0;
  for (const ch of new Set(a.replace(/[\s，。？！、,.?!]/g, ''))) if (b.includes(ch)) s += 1;
  for (const kw of (item.keywords || [])) if (kw && a.includes(String(kw).toLowerCase())) s += 6;
  return s;
}
function search(q, kb, n = 3) {
  return kb.map((x) => ({ ...x, _s: score(q, x) })).sort((x, y) => y._s - x._s).filter((x) => x._s > 0).slice(0, n);
}

/* 无 Key 时的兜底回复 */
function fallbackReply(q, hits, s) {
  const name = s.shopName || '我们';
  if (!hits.length) {
    return `您好，感谢咨询${name}～您问的问题我这边确认一下马上回复您。如果需要，也可以直接说下您的具体需求（比如时间、数量、预算），我帮您安排。`;
  }
  const top = hits[0];
  if (/价|钱|多少|费用/.test(q) && hits.find((h) => /价|钱|费用/.test(h.q + h.a))) {
    const h = hits.find((x) => /价|钱|费用/.test(x.q + x.a));
    return `您好，${h.a}`;
  }
  return `您好，${top.a}`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = url.pathname;

  if (p === '/' || p === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return fs.createReadStream(path.join(HERE, 'public', 'index.html')).pipe(res);
  }

  if (p === '/api/settings' && req.method === 'GET') {
    const s = settings();
    return sendJson(res, 200, { hasKey: !!s.apiKey, model: s.model, baseUrl: s.baseUrl, shopName: s.shopName, tone: s.tone });
  }
  if (p === '/api/settings' && req.method === 'POST') {
    const b = JSON.parse((await readBody(req)) || '{}');
    const s = { ...settings(), ...b };
    writeJson(SETTINGS, s);
    return sendJson(res, 200, { ok: true, hasKey: !!s.apiKey });
  }

  // 知识库
  if (p === '/api/kb' && req.method === 'GET') return sendJson(res, 200, readJson(KB_FILE, []));
  if (p === '/api/kb' && req.method === 'POST') {
    const b = JSON.parse((await readBody(req)) || '{}');
    const list = readJson(KB_FILE, []);
    if (b.bulk && typeof b.bulk === 'string') {
      const lines = b.bulk.split('\n').map((x) => x.trim()).filter(Boolean);
      let added = 0;
      for (const line of lines) {
        const [q, a] = line.split(/\s*[|｜\t]\s*/);
        if (q && a) { list.unshift({ id: crypto.randomBytes(4).toString('hex'), q: q.trim(), a: a.trim(), keywords: [], createdAt: new Date().toISOString() }); added++; }
      }
      writeJson(KB_FILE, list);
      return sendJson(res, 200, { ok: true, added });
    }
    const rec = { id: crypto.randomBytes(4).toString('hex'), q: String(b.q || '').slice(0, 200), a: String(b.a || '').slice(0, 1200), keywords: Array.isArray(b.keywords) ? b.keywords : String(b.keywords || '').split(/[,，\s]+/).filter(Boolean), createdAt: new Date().toISOString() };
    list.unshift(rec);
    writeJson(KB_FILE, list);
    return sendJson(res, 200, rec);
  }
  if (p.startsWith('/api/kb/') && req.method === 'DELETE') {
    const id = p.split('/').pop();
    writeJson(KB_FILE, readJson(KB_FILE, []).filter((x) => x.id !== id));
    return sendJson(res, 200, { ok: true });
  }

  // 客户提问 → 回复
  if (p === '/api/reply' && req.method === 'POST') {
    const b = JSON.parse((await readBody(req)) || '{}');
    const q = String(b.question || '').trim();
    if (!q) return sendJson(res, 400, { error: '请输入客户问题' });
    const kb = readJson(KB_FILE, []);
    const hits = search(q, kb, 3);
    const s = settings();
    let reply = '';
    let source = 'fallback';
    if (s.apiKey) {
      try {
        const ctx = hits.map((h, i) => `[${i + 1}] 问：${h.q}\n答：${h.a}`).join('\n');
        reply = await askModel([
          { role: 'system', content: `你是${s.shopName || '一家店'}的客服，语气${s.tone || '亲切专业'}。只依据提供的知识库回答；知识库没有的信息不要编造，改为说明会确认后回复。回复控制在 120 字内，可用 1-2 个 emoji，不要用"亲"以外的夸张称呼。` },
          { role: 'user', content: `知识库：\n${ctx || '（空）'}\n\n客户问题：${q}` },
        ], false);
        source = 'model';
      } catch (e) {
        reply = fallbackReply(q, hits, s) + `\n（模型调用失败：${String(e.message || e).slice(0, 60)}）`;
      }
    } else {
      reply = fallbackReply(q, hits, s);
    }
    return sendJson(res, 200, { question: q, reply: String(reply).trim(), hits: hits.map((h) => ({ q: h.q, a: h.a, score: h._s })), source });
  }

  // 生成常见问题（AI 或模板）
  if (p === '/api/suggest' && req.method === 'POST') {
    const b = JSON.parse((await readBody(req)) || '{}');
    const s = settings();
    const industry = String(b.industry || '实体门店');
    if (s.apiKey) {
      try {
        const out = await askModel([
          { role: 'system', content: '你是中国本地商家的客服培训师。输出 JSON：{"faq":[{"q":"客户常见问题","a":"标准回复（80字内，亲切专业）"}]}，共 10 条，覆盖价格、营业时间、位置、预约、退换、售后、优惠、停车、外卖、团购核销。' },
          { role: 'user', content: `行业：${industry}；店名：${s.shopName || '本店'}` },
        ], true);
        if (out && Array.isArray(out.faq)) return sendJson(res, 200, { faq: out.faq, source: 'model' });
      } catch {}
    }
    const faq = [
      { q: '你们几点开门？', a: '我们每天 9:00 开门，最后一单接单时间是 21:30，节假日不休息哦～' },
      { q: '价格多少？', a: '我们的价格从 ¥19.9 起，不同规格价格不同。您说下需求，我帮您推荐最合适的那款。' },
      { q: '位置在哪？', a: '我们地址是（填写你的地址），导航搜"（店名）"就能到，门口可以临时停车。' },
      { q: '需要预约吗？', a: '建议提前 1 天预约，当天也接待，但可能要等位。加我微信我把时间给您留出来～' },
      { q: '能退换吗？', a: '质量问题 7 天内可退换；非质量问题保持未使用可以换，具体可以到店沟通，我们尽量给您满意。' },
      { q: '有优惠吗？', a: '有的～现在新客立减 10 元，老客带朋友来双方各送一份小食。' },
      { q: '停车方便吗？', a: '门口有 3 个临时车位，满了可以停旁边（填写停车场），步行 2 分钟。' },
      { q: '可以外卖吗？', a: '支持的，我们入驻了（平台名），也可以微信下单我们安排配送。' },
      { q: '团购能核销吗？', a: '可以的，出示团购码直接核销，节假日也能用。' },
      { q: '能开发票吗？', a: '可以开电子发票，把开票信息发我，当天就能出。' },
    ];
    return sendJson(res, 200, { faq, source: 'template' });
  }

  res.writeHead(404).end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`智能客服已启动: http://127.0.0.1:${PORT}`);
  console.log(`数据目录: ${DATA_DIR}`);
});
