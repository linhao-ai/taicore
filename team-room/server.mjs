import { fileURLToPath } from 'node:url';
// 钛核 · AI 员工团队（本地）
// 员工（角色提示词）+ 单聊 + 群聊（多员工依次发言 + 主持人汇总）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8796);
const DATA_DIR = path.join(os.homedir(), '.dsh', 'taicore');
const STAFF_FILE = path.join(DATA_DIR, 'team-staff.json');
const SETTINGS = path.join(DATA_DIR, 'team-settings.json');
const SESSIONS = path.join(DATA_DIR, 'team-sessions.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

const readJson = (f, def) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; } };
const writeJson = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 2), 'utf8');
const settings = () => readJson(SETTINGS, { apiKey: '', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com', shopName: '', industry: '' });

const PRESET = [
  { key: 'boss', name: '店长阿May', role: '运营负责人', emoji: '🧭', color: 'cyan',
    prompt: '你是一家门店的运营负责人。擅长把模糊目标拆成可执行的周计划，关注客流、复购、成本。回答要先给结论，再给 3 条具体动作，每条带负责人和截止时间。不要空话。' },
  { key: 'copy', name: '文案小周', role: '文案策划', emoji: '✍️', color: 'violet',
    prompt: '你是本地生活文案高手。写文案要有画面感、口语化、不堆形容词。每次给 3 个版本（钩子型 / 利益型 / 故事型），每个不超过 80 字。' },
  { key: 'design', name: '设计阿哲', role: '视觉设计', emoji: '🎨', color: 'gold',
    prompt: '你是视觉设计师。给主图/海报的排版建议：文案层级、字体大小关系、配色、留白、视觉动线。用文字描述清楚到可以直接照着做。' },
  { key: 'cs', name: '客服小林', role: '客服主管', emoji: '💬', color: 'cyan',
    prompt: '你是客服主管。回复要亲切专业、不超过 100 字，先解决问题再解释。遇到投诉先共情再给方案，绝不推诿。' },
  { key: 'video', name: '导演老王', role: '短视频编导', emoji: '🎬', color: 'violet',
    prompt: '你是短视频编导。擅长 15 秒门店视频：3 秒钩子、中间展示、结尾引导。给出分镜脚本（镜头/画面/字幕/时长），可直接拍摄。' },
  { key: 'product', name: '选品阿凯', role: '选品与定价', emoji: '📦', color: 'gold',
    prompt: '你是选品与定价顾问。关注毛利、周转、复购、竞品价格带。给建议时列数据口径和假设，标注风险。' },
  { key: 'ads', name: '投流小陈', role: '流量投放', emoji: '📈', color: 'cyan',
    prompt: '你是本地投放优化师。给投放方案要有预算分配、素材方向、出价策略、止损线。明确说清哪些数字需要实测。' },
  { key: 'finance', name: '财务老李', role: '财务与成本', emoji: '🧮', color: 'violet',
    prompt: '你是门店财务。关注现金流、毛利结构、人力成本占比。给结论要带算式，指出哪些是可优化项。' },
  { key: 'host', name: '主持人', role: '会议主持', emoji: '🎙️', color: 'gold',
    prompt: '你是会议主持人。负责汇总团队发言，输出：共识、分歧、下一步行动（谁/做什么/何时）、需要老板拍板的事。简洁、可执行。' },
];

function seedStaff() {
  const cur = readJson(STAFF_FILE, null);
  if (Array.isArray(cur) && cur.length) return cur;
  const list = PRESET.map((p) => ({ ...p, id: crypto.randomBytes(4).toString('hex'), enabled: true }));
  writeJson(STAFF_FILE, list);
  return list;
}
const staff = () => seedStaff();

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

async function ask(messages, temperature = 0.6) {
  const s = settings();
  if (!s.apiKey) return null;
  const r = await fetch(`${(s.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.apiKey },
    body: JSON.stringify({ model: s.model || 'deepseek-chat', messages, temperature, max_tokens: 900 }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`模型接口 ${r.status}: ${t.slice(0, 160)}`);
  return JSON.parse(t).choices?.[0]?.message?.content || '';
}

const ctxOf = (s) => `当前商家：${s.shopName || '未填写店名'}；行业：${s.industry || '未填写'}。`;

/* 无 Key 时的示例回复 */
function demoReply(emp, topic) {
  const map = {
    boss: `结论：先把「${topic || '这件事'}」拆成 3 步，本周内做完。\n1) 今天：定一个可量化的目标（比如本周新增到店 20 人）— 你负责\n2) 明天：出 3 条内容 + 1 个到店礼 — 文案/设计配合\n3) 本周五：复盘数据，砍掉没效果的渠道 — 店长\n（配 DeepSeek API Key 后可得到针对你店的真实回答）`,
    copy: `版本1（钩子型）：${topic || '这家店'}，我为什么愿意排队 40 分钟？\n版本2（利益型）：周三到店报暗号，送招牌小菜一份。\n版本3（故事型）：老板凌晨四点起来熬汤，就为这一口。`,
    design: `排版建议：\n· 层级：主标题 > 价格 > 卖点 > 门店信息，字号比 3:2:1.2:1\n· 配色：主色不超过 2 个，用深底浅字提质感\n· 留白：四周留 8%，产品图占 55%\n· 动线：左上标签 → 中间产品 → 右下价格`,
    cs: `您好～您说的这个情况我记下了，先跟您道个歉。我这边马上帮您确认，10 分钟内给您明确答复，可以吗？`,
    video: `15 秒分镜：\n0-3s 特写热汤冒烟 + 字幕「4 点起来熬的汤」\n3-8s 拉面成品上桌 + 顾客第一口表情\n8-12s 环境/招牌 + 字幕「开了 20 年」\n12-15s 引导「来店报钛核，送小菜」`,
    product: `建议先上 2 个 SKU：引流款（毛利 30%，负责拉新）+ 利润款（毛利 65%，负责赚钱）。定价用 9.9/29.9 锚点，注意别把引流款做成主推，会拖垮毛利。`,
    ads: `预算分配建议：70% 投同城曝光、30% 投搜索意图词；素材先各测 2 条，3 天看 CTR，低于 3% 直接换；止损线：单客获取成本超过客单价 20% 就停。`,
    finance: `粗算：月流水 X，人力成本应控制在 18-22%，租金 12-15%，食材 30-35%，净利 10-15%。先算清这三项占比，再谈优化。`,
    host: `【共识】先把目标量化，再谈渠道。\n【分歧】预算给投放还是给内容，需要老板拍板。\n【行动】\n· 今日：定目标（店长）\n· 明日：出 3 条内容（文案+设计）\n· 周五：复盘（店长）\n【待定】本月投放预算上限。`,
  };
  return map[emp.key] || `${emp.name}（${emp.role}）：这个问题我的建议先明确目标和可投入的资源，再拆动作。配 API Key 后我会给出针对你店的完整方案。`;
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
    return sendJson(res, 200, { hasKey: !!s.apiKey, model: s.model, shopName: s.shopName, industry: s.industry });
  }
  if (p === '/api/settings' && req.method === 'POST') {
    const b = JSON.parse((await readBody(req)) || '{}');
    writeJson(SETTINGS, { ...settings(), ...b });
    return sendJson(res, 200, { ok: true });
  }

  // 员工 CRUD
  if (p === '/api/staff' && req.method === 'GET') return sendJson(res, 200, staff());
  if (p === '/api/staff' && req.method === 'POST') {
    const b = JSON.parse((await readBody(req)) || '{}');
    const list = staff();
    const rec = { id: crypto.randomBytes(4).toString('hex'), key: 'custom', name: String(b.name || '新员工'), role: String(b.role || '自定义'), emoji: b.emoji || '🧑', color: b.color || 'cyan', prompt: String(b.prompt || ''), enabled: true };
    list.push(rec); writeJson(STAFF_FILE, list);
    return sendJson(res, 200, rec);
  }
  if (p.startsWith('/api/staff/') && (req.method === 'PATCH' || req.method === 'PUT')) {
    const id = p.split('/').pop();
    const b = JSON.parse((await readBody(req)) || '{}');
    const list = staff();
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return sendJson(res, 404, { error: 'not found' });
    list[i] = { ...list[i], ...b, id };
    writeJson(STAFF_FILE, list);
    return sendJson(res, 200, list[i]);
  }
  if (p.startsWith('/api/staff/') && req.method === 'DELETE') {
    const id = p.split('/').pop();
    writeJson(STAFF_FILE, staff().filter((x) => x.id !== id));
    return sendJson(res, 200, { ok: true });
  }

  // 单聊
  if (p === '/api/chat' && req.method === 'POST') {
    const b = JSON.parse((await readBody(req)) || '{}');
    const emp = staff().find((x) => x.id === b.staffId);
    if (!emp) return sendJson(res, 404, { error: '员工不存在' });
    const history = Array.isArray(b.history) ? b.history.slice(-10) : [];
    const s = settings();
    try {
      const text = await ask([
        { role: 'system', content: `${emp.prompt}\n${ctxOf(s)}` },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: String(b.message || '') },
      ]);
      if (text) return sendJson(res, 200, { reply: text.trim(), source: 'model' });
    } catch (e) { /* 落到 demo */ }
    return sendJson(res, 200, { reply: demoReply(emp, b.message), source: 'demo' });
  }

  // 群聊
  if (p === '/api/group' && req.method === 'POST') {
    const b = JSON.parse((await readBody(req)) || '{}');
    const list = staff();
    const picked = (b.staffIds || []).map((id) => list.find((x) => x.id === id)).filter(Boolean);
    if (!picked.length) return sendJson(res, 400, { error: '请至少选择一名员工' });
    const hostEmp = list.find((x) => x.key === 'host');
    const s = settings();
    const topic = String(b.topic || '');
    const speeches = [];
    let modelOk = false;

    for (const emp of picked) {
      let text = '';
      try {
        text = await ask([
          { role: 'system', content: `${emp.prompt}\n${ctxOf(s)}你是团队里的${emp.role}。现在开圆桌会，围绕议题发言，发言控制在 150 字内，先给结论，再给 1-2 条可执行建议。不要重复别人的话。` },
          { role: 'user', content: `议题：${topic}\n\n前面同事的发言：\n${speeches.map((x) => `【${x.name}】${x.text}`).join('\n') || '（你是第一个发言）'}` },
        ], 0.65);
        if (text) modelOk = true;
      } catch {}
      if (!text) text = demoReply(emp, topic);
      speeches.push({ id: emp.id, name: emp.name, role: emp.role, emoji: emp.emoji, text: text.trim() });
    }

    let summary = '';
    try {
      summary = await ask([
        { role: 'system', content: `${hostEmp ? hostEmp.prompt : '你是会议主持人，汇总并给出行动项。'}\n${ctxOf(s)}` },
        { role: 'user', content: `议题：${topic}\n\n发言：\n${speeches.map((x) => `【${x.name}·${x.role}】${x.text}`).join('\n\n')}\n\n请输出：共识 / 分歧 / 下一步行动（谁做什么何时）/ 需要老板拍板的事。` },
      ], 0.4);
    } catch {}
    if (!summary) summary = demoReply(hostEmp || { key: 'host', name: '主持人', role: '会议主持' }, topic);

    const rec = { id: crypto.randomBytes(4).toString('hex'), topic, at: new Date().toISOString(), speeches, summary: summary.trim() };
    const all = readJson(SESSIONS, []);
    all.unshift(rec);
    writeJson(SESSIONS, all.slice(0, 100));
    return sendJson(res, 200, { ...rec, source: modelOk ? 'model' : 'demo' });
  }

  if (p === '/api/group/history' && req.method === 'GET') return sendJson(res, 200, readJson(SESSIONS, []).slice(0, 20));

  res.writeHead(404).end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`AI 员工团队已启动: http://127.0.0.1:${PORT}`);
  console.log(`数据目录: ${DATA_DIR}`);
});
