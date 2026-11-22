// 门店/产品档案：驱动意向识别与话术生成（行业化配置）
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DIR = path.join(process.env.APPDATA || os.homedir(), 'WeDAO', 'huoke');
const FILE = path.join(DIR, 'profile.json');

export const DEFAULT_PROFILE = {
  industry: '民宿',
  storeName: '海埂大坝海景民宿',
  city: '昆明',
  location: '昆明市西山区海埂大坝旁，步行约 10 分钟到坝上',
  products: [
    { name: '独栋别墅整栋', price: '海鸥季 880-1280/晚', capacity: '6-8人', features: '独栋、厨房、停车、观海鸥' },
    { name: 'Loft 复式', price: '480-680/晚', capacity: '2-4人', features: '落地窗、可做饭' },
  ],
  services: { parking: true, cooking: true, airportPickup: true, pet: false, laundry: true },
  highlights: ['步行 10 分钟到海埂大坝看海鸥', '整栋独享，适合家庭/朋友团', '厨房齐全，可自己做饭', '门口可停车', '11月-次年3月海鸥季'],
  faq: [
    { q: '看海鸥多远', a: '步行约 10 分钟到海埂大坝，早上 8-10 点、傍晚 4-6 点海鸥最多' },
    { q: '能住几人', a: '整栋 6-8 人，Loft 2-4 人' },
  ],
  tone: '亲切自然，像民宿主人在回，不用"亲"，不夸大',
  banned: ['微信', 'VX', '手机号', '二维码', '最低价', '全网最便宜'],
};

export function loadProfile() {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return { ...DEFAULT_PROFILE, ...raw };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(patch) {
  const cur = loadProfile();
  const next = { ...cur, ...(patch || {}) };
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

export function profilePrompt() {
  const p = loadProfile();
  const svc = [];
  if (p.services?.parking) svc.push('可停车');
  if (p.services?.cooking) svc.push('可做饭');
  if (p.services?.airportPickup) svc.push('可接机（需提前约）');
  if (p.services?.pet) svc.push('可带宠物');
  if (p.services?.laundry) svc.push('有洗衣机');
  return [
    '行业：' + p.industry,
    '门店：' + p.storeName + '（' + p.city + '）',
    '位置：' + p.location,
    '房型/产品：' + (p.products || []).map((x) => x.name + ' ' + x.price + ' ' + (x.capacity || '')).join('；'),
    '服务：' + (svc.join('、') || '无'),
    '卖点：' + (p.highlights || []).join('、'),
    '常见问答：' + (p.faq || []).map((x) => x.q + '→' + x.a).join('；'),
    '语气：' + p.tone,
    '禁止出现：' + (p.banned || []).join('、'),
    '要求：只承诺上述服务范围内的事；不确定的用"具体私信沟通"',
  ].join('\n');
}
