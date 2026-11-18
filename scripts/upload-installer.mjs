// CI：把安装包直接上传到腾讯 COS，并生成 latest.json（客户端自更新用）
// 用法: node scripts/upload-installer.mjs --file out/TAICORE-Setup.exe --version 1.2.2
// 环境变量: COS_SECRET_ID / COS_SECRET_KEY
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { putObject } from './cos.mjs';

const args = process.argv.slice(2);
function arg(name, def = null) {
  const i = args.indexOf('--' + name);
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1];
  return def;
}
const file = arg('file');
const version = arg('version') || '0.0.0';
const notes = arg('notes', '');
if (!file || !fs.existsSync(file)) { console.error('安装包不存在:', file); process.exit(1); }

const secretId = process.env.COS_SECRET_ID;
const secretKey = process.env.COS_SECRET_KEY;
if (!secretId || !secretKey) { console.error('缺少 COS 凭据'); process.exit(1); }

const buf = fs.readFileSync(file);
const sha = crypto.createHash('sha256').update(buf).digest('hex');
const key = `WeDAO-Setup-${version}.exe`;
const base = { bucket: 'taicore-1453181681', region: 'ap-guangzhou', secretId, secretKey };

console.log(`uploading ${path.basename(file)} ${(buf.length / 1048576).toFixed(1)}MB -> ${key}`);
await putObject({ ...base, key, body: buf, contentType: 'application/octet-stream', cacheControl: 'no-cache' });
console.log('installer url: https://dl.wedao.org.cn/' + key);
console.log('sha256:', sha);

const latest = {
  schema: 1,
  version,
  url: 'https://dl.wedao.org.cn/' + key,
  sha256: sha,
  size: buf.length,
  notes,
  mandatory: false,
  publishedAt: new Date().toISOString(),
};
await putObject({
  ...base,
  key: 'assets/app/latest.json',
  body: Buffer.from(JSON.stringify(latest, null, 2), 'utf8'),
  contentType: 'application/json; charset=utf-8',
  cacheControl: 'no-cache',
});
console.log('latest.json published:', JSON.stringify(latest));
