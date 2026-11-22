// 获客助手 · 浏览器自动化（Playwright，有头扫码登录 + 读评论）
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const BASE_DIR = path.join(process.env.APPDATA || os.homedir(), 'WeDAO', 'browser');

export const PLATFORMS = {
  douyin: { name: '抖音', url: 'https://www.douyin.com/' },
  xiaohongshu: { name: '小红书', url: 'https://www.xiaohongshu.com/' },
  shipinhao: { name: '视频号', url: 'https://channels.weixin.qq.com/' },
};

let ctx = null;
let browser = null;
let current = null;

export async function openBrowser(platform = 'douyin') {
  const p = PLATFORMS[platform];
  if (!p) throw new Error('不支持的平台: ' + platform);
  const dir = path.join(BASE_DIR, platform);
  fs.mkdirSync(dir, { recursive: true });
  if (browser) await closeBrowser();
  ctx = await chromium.launchPersistentContext(dir, {
    headless: false,
    viewport: { width: 1280, height: 860 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  browser = ctx;
  const page = ctx.pages()[0] || (await ctx.newPage());
  current = page;
  await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  return { ok: true, platform, platformName: p.name, url: p.url };
}

export async function closeBrowser() {
  try { if (browser) await browser.close(); } catch {}
  browser = null; ctx = null; current = null;
  return { ok: true };
}

export async function openUrl(url) {
  if (!browser) await openBrowser(isXhs ? 'xiaohongshu' : 'douyin');
  const page = await browser.newPage();
  current = page;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  return { ok: true, url };
}

/** 通用评论抓取：多组选择器依次尝试 */
const XHS_SELECTORS = [
  '#noteContainer .comment-item .content',
  '.comment-item .content',
  '[class*="comment-item"] [class*="content"]',
  '.comments-container .content',
];
const DY_SELECTORS = [
  '[data-e2e="comment-item"]',
  '.comment-item',
  '[class*="comment-item"]',
];

export async function readComments(url, limit = 40, platform = '') {
  const isXhs = platform === 'xiaohongshu' || /xiaohongshu\.com/.test(url || '');
  const selectors = isXhs ? XHS_SELECTORS : DY_SELECTORS;
  if (!browser) await openBrowser('douyin');
  const page = current || browser.pages()[0];
  if (url) await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3500);

  // 尝试滚动加载评论
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 900).catch(() => {});
    await page.waitForTimeout(900);
  }


  let items = [];
  for (const sel of selectors) {
    const found = await page.$$eval(sel, (els) => els.map((el) => (el.innerText || '').trim()).filter(Boolean)).catch(() => []);
    if (found.length >= 3) { items = found; break; }
  }
  if (!items.length) {
    // 兜底：抓正文短文本
    items = await page.$eval(isXhs ? 'span,div' : 'span,div', (els) =>
      els.map((e) => (e.innerText || '').trim())
        .filter((t) => t && t.length >= 4 && t.length <= 80)
    ).catch(() => []);
  }
  const uniq = [...new Set(items)].slice(0, limit);
  return { ok: true, count: uniq.length, comments: uniq, title: await page.title().catch(() => '') };
}

export async function status() {
  return { ok: true, open: !!browser, url: current ? current.url() : '' };
}


/** 打开搜索页并返回第一条视频链接 */
export async function gotoAndFindVideo(url) {
  const page = current || (browser && browser.pages()[0]);
  if (!page) return { ok: false, reason: '浏览器未打开' };
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4000);
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 600).catch(() => {});
    await page.waitForTimeout(800);
  }
  const links = await page.$$eval('a[href]', (els) =>
    els.map((e) => e.getAttribute('href') || '')
      .filter((h) => /\/video\/\d+/.test(h))
  ).catch(() => []);
  const uniq = [...new Set(links)];
  const dbg = { title: await page.title().catch(() => ''), text: (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 300), hrefs: (await page.$$eval('a[href]', (els) => els.map((e) => e.getAttribute('href') || '')).catch(() => [])).slice(0, 15) };
  return { ok: uniq.length > 0, link: uniq[0] ? 'https://www.douyin.com' + uniq[0] : '', total: uniq.length, debug: dbg };
}


/** 通用：打开页面 → 找第一个匹配 pattern 的链接 */
export async function gotoAndFindLink(url, pattern) {
  const page = current || (browser && browser.pages()[0]);
  if (!page) return { ok: false, reason: '浏览器未打开' };
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4500);
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 700).catch(() => {});
    await page.waitForTimeout(900);
  }
  const re = new RegExp(pattern);
  const links = await page.$$eval('a[href]', (els) => els.map((e) => e.getAttribute('href') || '')).catch(() => []);
  const uniq = [...new Set(links)].filter((h) => re.test(h));
  const host = new URL(url).origin;
  return {
    ok: uniq.length > 0,
    link: uniq[0] ? (uniq[0].startsWith('http') ? uniq[0] : host + uniq[0]) : '',
    total: uniq.length,
    title: await page.title().catch(() => ''),
  };
}


/** 小红书：搜索后点击第一条笔记卡片（避免直接访问被防盗链拦截），返回详情页是否打开 */
export async function clickFirstXhsNote(url) {
  // XHS_DIRECT_HREF：从小红书搜索结果里取第一条笔记的完整链接（含 xsec_token），直接打开
  const page = current || (browser && browser.pages()[0]);
  if (!page) return { ok: false, reason: '浏览器未打开' };
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(5000);
  for (let i = 0; i < 2; i++) {
    await page.mouse.wheel(0, 500).catch(() => {});
    await page.waitForTimeout(800);
  }
  // 用坐标点击第一张卡片封面（小红书详情是 SPA 弹层，不会改 URL）
  const first = await page.$('a[href*="/explore/"] img, a[href*="/discovery/item/"] img, section img');
  let okClick = false;
  if (first) {
    const box = await first.boundingBox().catch(() => null);
    if (box) { await page.mouse.click(box.x + box.width / 2, box.y + box.height / 3).catch(() => {}); okClick = true; }
  }
  await page.waitForTimeout(6000);
  const urlNow = page.url();
  const title = await page.title().catch(() => '');
  try { await page.screenshot({ path: 'D:/Users/YC/Documents/deepseek-harness/default-workspace/build-out/xhs-detail.png' }); } catch (e) {}
  return { ok: okClick, url: urlNow, title, total: 1, tabs: browser.pages ? browser.pages().length : 1 };
}

