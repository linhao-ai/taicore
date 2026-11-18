// 客户端：静默增量更新器
// 1) 扩展（8 个工具）热更新
// 2) 客户端本体（内核）自动更新：检测 → 后台下载 → 校验 → 下次登录静默安装
// 用法: node updater.mjs [--force] [--quiet] [--check-only]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const MANIFEST_URL = process.env.WEDAO_EXT_MANIFEST || 'https://dl.wedao.org.cn/assets/ext/manifest.json';
const APP_LATEST_URL = process.env.WEDAO_APP_LATEST || 'https://dl.wedao.org.cn/assets/app/latest.json';
const EXT_ROOT = process.env.WEDAO_EXT_DIR || path.join(os.homedir(), 'AppData', 'Roaming', 'WeDAO', 'ext');
const UPDATE_ROOT = path.join(path.dirname(EXT_ROOT), 'updates');
const VERSIONS_FILE = path.join(EXT_ROOT, 'versions.json');
const PENDING_FILE = path.join(EXT_ROOT, 'pending-app.json');
const LOG_FILE = path.join(EXT_ROOT, 'update.log');
const INSTALL_DIR = process.env.WEDAO_INSTALL_DIR || path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'WeDAO');
const DRYRUN = process.env.WEDAO_APP_UPDATE_DRYRUN === '1';
const quiet = process.argv.includes('--quiet');
const force = process.argv.includes('--force');
const checkOnly = process.argv.includes('--check-only');

fs.mkdirSync(EXT_ROOT, { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  if (!quiet) console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n', 'utf8'); } catch {}
}
function readJson(f, def) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; } }
function writeJson(f, o) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 2), 'utf8'); }
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function cmp(a, b) {
  const x = String(a || '0').split('.').map(Number);
  const y = String(b || '0').split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const p = x[i] || 0, q = y[i] || 0;
    if (q > p) return 1;
    if (q < p) return -1;
  }
  return 0;
}
function needUpdate(local, remote) {
  if (!local) return true;
  if (force) return true;
  return cmp(local, remote) > 0;
}

/* ---------------- 扩展热更新 ---------------- */
async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'WeDAO-Updater', 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}
function extract(zipPath, destDir) {
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });
  spawnSync('tar', ['-x', '-f', zipPath, '-C', destDir], { stdio: 'ignore' });
  const entries = fs.readdirSync(destDir);
  if (entries.length === 1) {
    const inner = path.join(destDir, entries[0]);
    if (fs.statSync(inner).isDirectory()) {
      for (const f of fs.readdirSync(inner)) fs.renameSync(path.join(inner, f), path.join(destDir, f));
      fs.rmdirSync(inner);
    }
  }
}

async function updateExtensions() {
  log('检查扩展更新…');
  let manifest;
  try { manifest = await fetchJson(MANIFEST_URL); }
  catch (e) { log('获取扩展 manifest 失败：' + (e.message || e)); return 0; }
  const exts = manifest.extensions || {};
  const local = readJson(VERSIONS_FILE, {});
  let updated = 0;
  for (const [key, info] of Object.entries(exts)) {
    if (!needUpdate(local[key], info.version)) continue;
    try {
      log(`更新扩展 ${key} ${local[key] || '未安装'} → ${info.version}（${Math.round((info.size || 0) / 1024)}KB）`);
      const buf = await downloadToBuffer(info.url);
      if (info.sha256 && sha256(buf) !== info.sha256) throw new Error('sha256 不匹配');
      const zipPath = path.join(EXT_ROOT, `${key}.download.zip`);
      fs.writeFileSync(zipPath, buf);
      extract(zipPath, path.join(EXT_ROOT, key));
      fs.rmSync(zipPath, { force: true });
      local[key] = info.version;
      writeJson(VERSIONS_FILE, local);
      updated++;
      log(`完成扩展 ${key} → ${info.version}`);
    } catch (e) { log(`扩展 ${key} 失败：${e.message || e}`); }
  }
  if (!updated) log('扩展已是最新');
  return updated;
}

async function downloadToBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'WeDAO-Updater' } });
  if (!res.ok) throw new Error(`下载失败 ${res.status}`);
  const chunks = [];
  for await (const c of res.body) chunks.push(c);
  return Buffer.concat(chunks);
}

/* ---------------- 客户端本体更新 ---------------- */
function installedVersion() {
  const pkgPath = path.join(INSTALL_DIR, 'dsh-desktop', 'package.json');
  const pkg = readJson(pkgPath, null);
  return (pkg && pkg.version) || null;
}

function downloadInstallerResumable(url, dest, size) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  for (let attempt = 1; attempt <= 30; attempt++) {
    const have = fs.existsSync(dest) ? fs.statSync(dest).size : 0;
    if (size && have >= size) return true;
    spawnSync('curl.exe', ['-sS', '-L', '--max-time', '1800', '-C', '-', '-o', dest, url], { stdio: 'ignore' });
    const now = fs.existsSync(dest) ? fs.statSync(dest).size : 0;
    if (size && now >= size) return true;
    if (now === have && attempt > 3) return false;
  }
  return fs.existsSync(dest) && (!size || fs.statSync(dest).size >= size);
}

function scheduleSilentInstall(installer) {
  const cmd = `"${installer}" /S`;
  spawnSync('reg', ['add', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce', '/v', 'WeDAO Apply Update', '/t', 'REG_SZ', '/d', cmd, '/f'], { stdio: 'ignore' });
  log('已登记下次登录静默安装：' + cmd);
}

async function updateApp() {
  const cur = installedVersion();
  if (!cur) { log('未找到已安装版本信息，跳过本体更新'); return 0; }
  let latest;
  try { latest = await fetchJson(APP_LATEST_URL); }
  catch (e) { log('获取本体版本失败：' + (e.message || e)); return 0; }

  // 上次已下载并挂起：如果已安装到该版本，清理
  const pending = readJson(PENDING_FILE, null);
  if (pending && cmp(cur, pending.version) >= 0) {
    try { fs.rmSync(pending.installer, { force: true }); } catch {}
    fs.rmSync(PENDING_FILE, { force: true });
    log(`本体已更新到 ${cur}，清理挂起包`);
  }

  if (cmp(cur, latest.version) <= 0) { log(`本体已是最新（${cur}）`); return 0; }
  if (checkOnly) { log(`发现本体新版本 ${latest.version}（当前 ${cur}）`); return 0; }
  log(`发现本体新版本 ${latest.version}（当前 ${cur}），开始后台下载 ${Math.round((latest.size || 0) / 1048576)}MB`);

  const dest = path.join(UPDATE_ROOT, `WeDAO-Setup-${latest.version}.exe`);
  if (pending && pending.installer === dest && fs.existsSync(dest)) {
    log('本体安装包已下载，沿用');
  } else {
    const ok = downloadInstallerResumable(latest.url, dest, latest.size);
    if (!ok) { log('本体下载未完成，下次重试'); return 0; }
    if (latest.sha256) {
      const hash = sha256(fs.readFileSync(dest));
      if (hash !== latest.sha256) { log('本体安装包 sha256 不匹配，删除重试'); fs.rmSync(dest, { force: true }); return 0; }
    }
  }
  writeJson(PENDING_FILE, { version: latest.version, installer: dest, downloadedAt: new Date().toISOString(), notes: latest.notes || '' });
  if (DRYRUN) { log('[dryrun] 跳过 RunOnce 登记'); return 1; }
  scheduleSilentInstall(dest);
  return 1;
}

async function main() {
  const extCount = await updateExtensions();
  const appUpdated = await updateApp();
  log(`完成：扩展更新 ${extCount} 个，本体${appUpdated ? '已排期安装' : '无更新'}`);
}

main().catch((e) => log('更新器异常：' + (e && e.message)));
