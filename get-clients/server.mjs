import { fileURLToPath } from 'node:url';
// 钛核 · 获客工作台（本地）
// 功能：生成获客方案 / 生成触达话术 / 线索管理 / 转化看板
// 模型：BYOK，调用用户自己的 DeepSeek API Key；无 Key 时用内置模板兜底
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { loadProfile, saveProfile, profilePrompt } from './lib/profile.mjs';
import os from 'node:os';
import crypto from 'node:crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8792);
const DATA_DIR = path.join(os.homedir(), '.dsh', 'taicore');
const SETTINGS = path.join(DATA_DIR, 'acquire-settings.json');
const LEADS = path.join(DATA_DIR, 'leads.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

const readJson = (f, def) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; } };
const writeJson = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 2), 'utf8');

function settings() { return readJson(SETTINGS, { apiKey: '', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com' }); }
function leads() { return readJson(LEADS, []); }

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

/* ---------------- 模型调用 ---------------- */
async function askModel(prompt, wantJson = true) {
  const s = settings();
  if (!s.apiKey) return null;
  const body = {
    model: s.model || 'deepseek-chat',
    messages: [
      { role: 'system', content: '你是中国市场一线的获客顾问，擅长本地生活、实体门店、电商与自由职业者。回答要具体、可执行，不说空话。' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 2600,
  };
  if (wantJson) body.response_format = { type: 'json_object' };
  const r = await fetch(`${(s.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.apiKey },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`模型接口 ${r.status}: ${t.slice(0, 200)}`);
  const j = JSON.parse(t);
  const content = j.choices?.[0]?.message?.content || '';
  if (!wantJson) return content;
  try { return JSON.parse(content); } catch { return { raw: content }; }
}

/* ---------------- 离线模板兜底 ---------------- */
function templatePlan(input) {
  const { industry = '实体门店', city = '本地', price = '300', audience = '' } = input;
  return {
    persona: [
      `${city}的${industry}从业者/老板，30-50 岁，时间紧、不熟悉线上运营`,
      `客单价 ${price} 元左右，决策快、看效果，最怕"花了钱没客流"`,
      audience ? `额外画像：${audience}` : '附近 3 公里内的精准客群',
    ],
    keywords: [
      `${city} ${industry} 推荐`,
      `${industry} 怎么选`,
      `${city} ${industry} 避坑`,
      `${industry} 价格 对比`,
      `${city} 周末 好去处 ${industry}`,
    ],
    channels: [
      { name: '大众点评 / 美团', why: '本地到店第一入口，评价和套餐直接带客', action: '优化前 20 条评价的回复 + 上一款引流套餐' },
      { name: '小红书同城', why: '年轻客群搜索"避坑/推荐"，转化路径短', action: '发 5 篇"店员视角"笔记，标题带城市和品类' },
      { name: '抖音同城', why: '短视频 + 团购，适合展示现场感', action: '用视频工坊把门店图做成 4 条 15 秒视频' },
      { name: '微信私域 / 老客群', why: '成本最低，复购和转介绍', action: '老客转介绍活动 + 每周 1 次朋友圈内容' },
      { name: '异业合作', why: '互换客群，零成本', action: '找 3 家不冲突的邻居店，互相放券' },
    ],
    scripts: {
      dm: `老板你好，我在${city}帮${industry}做线上获客。最近看到你家在${industry}这块做得不错，整理了一份同行的 5 个获客做法，需要的话我发你，不收费。`,
      moments: `很多人以为${industry}靠地段就够了。其实现在客人先搜手机，再看评价。\n我们把近 3 个月的获客动作整理成了一页纸，需要的老板私我。`,
      review: `谢谢您的反馈！您提到的这点我们记下了，已经调整。下次来可以试试我们的招牌，报"老客"给您留一份小菜。`,
      video: `（开头 3 秒）${city}这家${industry}，我为什么愿意反复来？`,
    },
    plan7: [
      '第 1 天：把点评/美团的评价回复全部补齐（用 AI 批量生成）',
      '第 2 天：拍 20 张门店/产品照片，用视频工坊做 4 条短视频',
      '第 3 天：小红书发 2 篇、抖音发 2 条，标题带城市+品类',
      '第 4 天：上一款引流套餐（低价高感知），只做线上',
      '第 5 天：老客群发一次转介绍活动（带人送菜/送券）',
      '第 6 天：找 3 家邻居店谈异业互推',
      '第 7 天：复盘数据：曝光/咨询/到店/成交，砍掉最差的两个动作',
    ],
    kpi: [
      { name: '内容产出', target: '每天 5 条（文案或视频）', how: 'AI 批量生成，10 分钟搞定' },
      { name: '咨询量', target: '每周 ≥ 20 条私信/电话', how: '短视频留钩子 + 评价区引导' },
      { name: '到店率', target: '咨询的 30% 到店', how: '发券 + 到店礼' },
      { name: '获客成本', target: '≤ 客单价的 15%', how: '先做零成本渠道，再投付费' },
    ],
    source: 'template',
  };
}

/* ---------------- HTTP ---------------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };


/* HUOKE_V2：浏览器 + 意向识别 + 草稿生成 */
async function readModelCfg2() {
  const p = path.join(process.env.APPDATA || os.homedir(), 'WeDAO', 'model.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
async function llm2(system, user, temp = 0.7) {
  const cfg = await readModelCfg2();
  const r = await fetch((cfg.baseUrl || 'https://api.deepseek.com') + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.apiKey },
    body: JSON.stringify({ model: cfg.model || 'deepseek-chat', messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: temp, max_tokens: 1200 }),
  });
  if (!r.ok) throw new Error('LLM ' + r.status);
  const j = await r.json();
  return (j.choices && j.choices[0] && j.choices[0].message.content) || '';
}

const huokeRoutes = {
  async '/api/huoke/open'(body) {
    const m = await import('./lib/browser.mjs');
    return await m.openBrowser(String(body.platform || 'douyin'));
  },
  async '/api/huoke/close'() {
    const m = await import('./lib/browser.mjs');
    return await m.closeBrowser();
  },
  // XHS_SEARCH_ROUTE：小红书按关键词找笔记 + 抓评论
  async '/api/huoke/xhs-search'(body) {
    const m = await import('./lib/browser.mjs');
    const kw = String(body.keyword || '').slice(0, 40);
    if (!kw) return { ok: false, reason: '缺少关键词' };
    const url = 'https://www.xiaohongshu.com/search_result?keyword=' + encodeURIComponent(kw) + '&source=web_search_result_notes';
    const found = await m.clickFirstXhsNote(url); // CLICK_XHS_NOTE
    if (!found.ok) return { ok: false, reason: found.reason || '没找到笔记', url, title: found.title, debug: found.debug };
    const data = await m.readComments('', Number(body.limit || 40), 'xiaohongshu');
    return { ok: true, keyword: kw, note: found.url, totalNotes: found.tabs || 1, title: data.title, count: data.count, comments: data.comments };
  },
  async '/api/huoke/search'(body) {
    const m = await import('./lib/browser.mjs');
    const kw = String(body.keyword || '').slice(0, 40);
    if (!kw) return { ok: false, reason: '缺少关键词' };
    const url = 'https://www.douyin.com/search/' + encodeURIComponent(kw) + '?type=video';
    const found = await m.gotoAndFindVideo(url);
    if (!found.ok) return { ok: false, reason: '没找到视频结果', url, debug: found.debug };
    const data = await m.readComments(found.link, Number(body.limit || 40), 'xiaohongshu');
    return { ok: true, keyword: kw, video: found.link, totalVideos: found.total, title: data.title, count: data.count, comments: data.comments };
  },
  async '/api/huoke/status'() {
    const m = await import('./lib/browser.mjs');
    return await m.status();
  },
  async '/api/huoke/comments'(body) {
    const m = await import('./lib/browser.mjs');
    return await m.readComments(String(body.url || ''), Number(body.limit || 40), String(body.platform || ''));
  },
  async '/api/huoke/intent'(body) {
    const list = Array.isArray(body.comments) ? body.comments.slice(0, 60) : [];
    if (!list.length) return { ok: false, reason: '没有评论' };
    const sys = '你是销售线索分析师。判断每条评论是否有购买意向（想买/问价/问购买方式=有；纯吐槽/无关=无）。只输出JSON数组：[{"i":序号,"intent":true/false,"score":0-100,"reason":"简短理由"}]，不要解释。' + '\\n【门店档案】\\n' + profilePrompt();
    const txt = await llm2(sys, list.map((c, i) => i + '. ' + c).join('\n'), 0.3);
    let arr = [];
    try { arr = JSON.parse(txt.replace(/```json|```/g, '').trim()); } catch (e) { arr = []; }
    const items = arr.map((x) => ({ comment: list[x.i] || '', intent: !!x.intent, score: Number(x.score || 0), reason: x.reason || '' }));
    return { ok: true, items: items.filter((x) => x.comment), total: list.length };
  },
  async '/api/huoke/draft'(body) {
    const comment = String(body.comment || '').slice(0, 300);
    const product = String(body.product || '').slice(0, 60);
    if (!comment) return { ok: false, reason: '缺少评论内容' };
    const sys = '你是销售客服。针对用户评论写一条自然、口语化的回复（40字内）。要求：1) 必须具体回应对方说的内容 2) 绝对不能出现微信/手机号/加V/二维码等联系方式 3) 不要像机器人 4) 结尾可引导对方私信或评论。只输出回复内容。';
    const ctx = '【门店档案】\n' + profilePrompt() + (product ? '\n补充产品：' + product : '');
  const txt = await llm2(sys, ctx + '\n对方评论：' + comment, 0.8); // PROFILE_DRAFT
    return { ok: true, draft: String(txt).trim().slice(0, 120) };
  },
};
const server = http.createServer(async (req, res) => {
  // PROFILE_ROUTE
  if (req.url === '/api/profile' || req.url.startsWith('/api/profile?')) {
    if (req.method === 'GET') return sendJson(res, 200, { ok: true, profile: loadProfile() });
    if (req.method === 'POST') {
      let body = {};
      try { body = JSON.parse((await readBody(req)) || '{}'); } catch (e) {}
      return sendJson(res, 200, { ok: true, profile: saveProfile(body) });
    }
  }
  if (req.url === '/profile' || req.url === '/profile.html') {
    try {
      const html = fs.readFileSync(new URL('./public/profile.html', import.meta.url), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('profile page missing: ' + e.message);
    }
  }
  const __u = new URL(req.url, 'http://127.0.0.1');
  if (huokeRoutes[__u.pathname] && req.method === 'POST') {
    let body = {};
    try { body = JSON.parse((await readBody(req)) || '{}'); } catch (e) {}
    try { return sendJson(res, 200, await huokeRoutes[__u.pathname](body)); }
    catch (e) { return sendJson(res, 200, { ok: false, reason: e.message }); }
  }

  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = url.pathname;

  if (p === '/' || p === '/index.html') {
    res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
    return fs.createReadStream(path.join(HERE, 'public', 'index.html')).pipe(res);
  }

  if (p === '/api/settings' && req.method === 'GET') {
    const s = settings();
    return sendJson(res, 200, { hasKey: !!s.apiKey, model: s.model, baseUrl: s.baseUrl });
  }
  if (p === '/api/settings' && req.method === 'POST') {
    const b = JSON.parse((await readBody(req)) || '{}');
    const s = settings();
    if (typeof b.apiKey === 'string') s.apiKey = b.apiKey.trim();
    if (b.model) s.model = b.model;
    if (b.baseUrl) s.baseUrl = b.baseUrl;
    writeJson(SETTINGS, s);
    return sendJson(res, 200, { ok: true, hasKey: !!s.apiKey });
  }

  if (p === '/api/plan' && req.method === 'POST') {
    const input = JSON.parse((await readBody(req)) || '{}');
    const prompt = `请为以下商家做一份"7 天自动获客方案"，输出 JSON：
{
 "persona": ["目标客户画像，3 条，具体到年龄/职业/消费习惯"],
 "keywords": ["5 个客户会搜的关键词"],
 "channels": [{"name":"渠道","why":"为什么适合他","action":"具体动作"}],
 "scripts": {"dm":"私信首条，80 字内，不提卖货","moments":"朋友圈文案，150 字内","review":"点评回复模板","video":"短视频开头 3 秒钩子"},
 "plan7": ["第 1 天...","第 2 天...", ... 共 7 条],
 "kpi": [{"name":"指标","target":"目标值","how":"怎么做到"}]
}
商家信息：行业=${input.industry || '实体门店'}；城市=${input.city || '本地'}；客单价=${input.price || '300'}元；补充=${input.audience || '无'}；主要痛点=${input.pain || '没客流'}`;
    try {
      const out = await askModel(prompt, true);
      if (!out) return sendJson(res, 200, templatePlan(input));
      return sendJson(res, 200, { ...out, source: 'model' });
    } catch (e) {
      const t = templatePlan(input);
      t.note = '模型调用失败，已用内置模板：' + String(e.message || e).slice(0, 120);
      return sendJson(res, 200, t);
    }
  }

  // 线索 CRUD
  if (p === '/api/leads' && req.method === 'GET') return sendJson(res, 200, leads());
  if (p === '/api/leads' && req.method === 'POST') {
    const b = JSON.parse((await readBody(req)) || '{}');
    const list = leads();
    const rec = {
      id: crypto.randomBytes(4).toString('hex'),
      name: String(b.name || '').slice(0, 60),
      channel: String(b.channel || '').slice(0, 40),
      contact: String(b.contact || '').slice(0, 80),
      status: b.status || 'new',
      note: String(b.note || '').slice(0, 300),
      createdAt: new Date().toISOString(),
      followUps: [],
    };
    list.unshift(rec);
    writeJson(LEADS, list);
    return sendJson(res, 200, rec);
  }
  if (p.startsWith('/api/leads/') && req.method === 'PATCH') {
    const id = p.split('/').pop();
    const b = JSON.parse((await readBody(req)) || '{}');
    const list = leads();
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return sendJson(res, 404, { error: 'not found' });
    if (b.status) list[i].status = b.status;
    if (typeof b.note === 'string') list[i].note = b.note.slice(0, 300);
    if (b.followUp) list[i].followUps.push({ text: String(b.followUp).slice(0, 500), at: new Date().toISOString() });
    writeJson(LEADS, list);
    return sendJson(res, 200, list[i]);
  }
  if (p.startsWith('/api/leads/') && req.method === 'DELETE') {
    const id = p.split('/').pop();
    writeJson(LEADS, leads().filter((x) => x.id !== id));
    return sendJson(res, 200, { ok: true });
  }

  // 跟进话术
  if (p === '/api/followup' && req.method === 'POST') {
    const b = JSON.parse((await readBody(req)) || '{}');
    const prompt = `给这个潜在客户写一条跟进消息（微信私信，80 字内，自然、不推销、给对方一个具体的价值点）。
客户：${b.name || '未知'}；来源渠道：${b.channel || '未知'}；当前状态：${b.status || 'new'}；备注：${b.note || '无'}
只输出消息正文，不要解释。`;
    try {
      const text = await askModel(prompt, false);
      if (text) return sendJson(res, 200, { text: String(text).trim() });
    } catch {}
    return sendJson(res, 200, { text: `${b.name || '老板'}你好，上次聊到的事我这边整理好了，方便的话发你看看？不合适也没关系。` });
  }

  res.writeHead(404).end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`获客工作台已启动: http://127.0.0.1:${PORT}`);
  console.log(`数据目录: ${DATA_DIR}`);
});
