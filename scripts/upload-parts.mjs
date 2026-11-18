// CI：把大安装包切成小片分别上传 COS（规避跨国大文件上传卡死）
// 用法: node scripts/upload-parts.mjs --file out/TAICORE-Setup.exe --version 1.2.2 [--part-mb 20]
import fs from 'node:fs';
import crypto from 'node:crypto';
import { putObject } from './cos.mjs';

const args = process.argv.slice(2);
function arg(name, def = null) {
  const i = args.indexOf('--' + name);
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1];
  return def;
}
const file = arg('file');
const version = arg('version');
const partMb = Number(arg('part-mb', '20'));
if (!file || !fs.existsSync(file)) { console.error('安装包不存在:', file); process.exit(1); }

const secretId = process.env.COS_SECRET_ID;
const secretKey = process.env.COS_SECRET_KEY;
if (!secretId || !secretKey) { console.error('缺少 COS 凭据'); process.exit(1); }

const base = { bucket: 'taicore-1453181681', region: 'ap-guangzhou', secretId, secretKey };
const buf = fs.readFileSync(file);
const sha = crypto.createHash('sha256').update(buf).digest('hex');
const chunkSize = Math.floor(partMb * 1024 * 1024);
const count = Math.ceil(buf.length / chunkSize);
console.log(`file=${buf.length} bytes sha=${sha} parts=${count} partSize=${chunkSize}`);

const parts = [];
for (let i = 0; i < count; i++) {
  const start = i * chunkSize;
  const end = Math.min(start + chunkSize, buf.length);
  const slice = buf.subarray(start, end);
  const key = `parts/WeDAO-Setup-${version}.exe.part${String(i).padStart(2, '0')}`;
  let ok = false;
  for (let attempt = 1; attempt <= 5 && !ok; attempt++) {
    try {
      await putObject({ ...base, key, body: slice, contentType: 'application/octet-stream', cacheControl: 'no-cache' });
      ok = true;
      console.log(`  part ${i} uploaded ${(slice.length / 1048576).toFixed(1)}MB attempt ${attempt}`);
    } catch (e) {
      console.log(`  part ${i} attempt ${attempt} failed: ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  if (!ok) { console.error('part upload failed:', i); process.exit(1); }
  parts.push({ index: i, key, size: slice.length, sha256: crypto.createHash('sha256').update(slice).digest('hex') });
}

const meta = { version, totalSize: buf.length, sha256: sha, partSize: chunkSize, parts, createdAt: new Date().toISOString() };
await putObject({
  ...base,
  key: `parts/WeDAO-Setup-${version}.exe.json`,
  body: Buffer.from(JSON.stringify(meta, null, 2), 'utf8'),
  contentType: 'application/json; charset=utf-8',
  cacheControl: 'no-cache',
});
console.log('parts.json published:', JSON.stringify({ version, totalSize: buf.length, sha256: sha, count }));
