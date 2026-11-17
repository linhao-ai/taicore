// 客户端：静默增量更新器（方案 A：启动时自动检查 + 静默更新）
// 用法: node updater.mjs [--force] [--quiet]
// 行为: 读远端 manifest → 对比本地版本表 → 下载差异 zip → 校验 sha256 → 解压到用户目录
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const MANIFEST_URL = process.env.WEDAO_EXT_MANIFEST || 'https://dl.wedao.org.cn/assets/ext/manifest.json';
const EXT_ROOT = process.env.WEDAO_EXT_DIR || path.join(os.homedir(), 'AppData', 'Roaming', 'WeDAO', 'ext');
const VERSIONS_FILE = path.join(EXT_ROOT, 'versions.json');
const LOG_FILE = path.join(EXT_ROOT, 'update.log');
const quiet = process.argv.includes('--quiet');
const force = process.argv.includes('--force');

fs.mkdirSync(EXT_ROOT, { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  if (!quiet) console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n', 'utf8'); } catch {}
}
function readJson(f, def) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; } }
function writeJson(f, o) { fs.writeFileSync(f, JSON.stringify(o, null, 2), 'utf8'); }
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

// 比较版本：返回 true 表示需要更新
function needUpdate(local, remote) {
  if (!local) return true;
  if (force) return true;
  const a = String(local).split('.').map(Number);
  const b = String(remote).split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (y > x) return true;
    if (y < x) return false;
  }
  return false;
}

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'WeDAO-Updater' } });
  if (!res.ok) throw new Error(`下载失败 ${res.status} ${url}`);
  const len = Number(res.headers.get('content-length') || 0);
  const chunks = [];
  let got = 0;
  for await (const chunk of res.body) {
    chunks.push(chunk);
    got += chunk.length;
  }
  const buf = Buffer.concat(chunks);
  if (len && buf.length !== len) throw new Error(`下载不完整 ${buf.length}/${len}`);
  return buf;
}

function extract(zipPath, destDir) {
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });
  // Windows 10+ 自带 tar（bsdtar 支持 zip）
  let r = spawnSync('tar', ['-x', '-f', zipPath, '-C', destDir], { stdio: 'ignore' });
  if (!fs.existsSync(destDir) || fs.readdirSync(destDir).length === 0) {
    r = spawnSync('tar.exe', ['-x', '-f', zipPath, '-C', destDir], { stdio: 'ignore' });
  }
  // zip 内可能多一层同名目录，拍平
  const entries = fs.readdirSync(destDir);
  if (entries.length === 1) {
    const inner = path.join(destDir, entries[0]);
    if (fs.statSync(inner).isDirectory()) {
      for (const f of fs.readdirSync(inner)) fs.renameSync(path.join(inner, f), path.join(destDir, f));
      fs.rmdirSync(inner);
    }
  }
  return entries;
}

async function main() {
  log('检查更新…');
  let manifest;
  try {
    const res = await fetch(MANIFEST_URL, { headers: { 'User-Agent': 'WeDAO-Updater', 'Cache-Control': 'no-cache' } });
    if (!res.ok) throw new Error('manifest ' + res.status);
    manifest = await res.json();
  } catch (e) {
    log('获取 manifest 失败：' + (e.message || e));
    return 0;
  }
  const exts = manifest.extensions || {};
  const local = readJson(VERSIONS_FILE, {});
  const updated = [];
  for (const [key, info] of Object.entries(exts)) {
    if (!needUpdate(local[key], info.version)) continue;
    try {
      log(`更新 ${key} ${local[key] || '未安装'} → ${info.version}（${Math.round((info.size || 0) / 1024)}KB）`);
      const zipPath = path.join(EXT_ROOT, `${key}.download.zip`);
      const buf = await download(info.url);
      if (info.sha256 && sha256(buf) !== info.sha256) throw new Error('sha256 不匹配');
      fs.writeFileSync(zipPath, buf);
      const dest = path.join(EXT_ROOT, key);
      extract(zipPath, dest);
      fs.rmSync(zipPath, { force: true });
      local[key] = info.version;
      writeJson(VERSIONS_FILE, local);
      updated.push(key);
      log(`完成 ${key} → ${info.version}`);
    } catch (e) {
      log(`失败 ${key}: ${e.message || e}`);
    }
  }
  if (!updated.length) log('已是最新');
  return updated.length;
}

main().then((n) => { process.exitCode = 0; });
