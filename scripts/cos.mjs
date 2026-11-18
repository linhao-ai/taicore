// COS 上传：小文件用 fetch；大文件用 curl（避免 Node fetch 300MB PUT 头部超时）
import crypto from 'node:crypto';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function hmacHex(key, data) {
  return crypto.createHmac('sha1', key).update(data).digest('hex');
}

export function signedGetUrl(o) {
  const host = `${o.bucket}.cos.${o.region}.myqcloud.com`;
  const objPath = '/' + o.key.replace(/^\/+/, '');
  const now = Math.floor(Date.now() / 1000);
  const keyTime = `${now};${now + (o.ttlSeconds || 3600)}`;
  const signKey = hmacHex(o.secretKey, keyTime);
  const canonical = `get\n${objPath}\n\nhost=${host}\n`;
  const inner = crypto.createHash('sha1').update(canonical).digest('hex');
  const signature = hmacHex(signKey, `sha1\n${keyTime}\n${inner}\n`);
  const q = new URLSearchParams({
    'q-sign-algorithm': 'sha1',
    'q-ak': o.secretId,
    'q-sign-time': keyTime,
    'q-key-time': keyTime,
    'q-header-list': 'host',
    'q-url-param-list': '',
    'q-signature': signature,
  });
  return `https://${host}${objPath}?${q.toString()}`;
}

function authHeader(o) {
  const host = `${o.bucket}.cos.${o.region}.myqcloud.com`;
  const objPath = '/' + String(o.key).replace(/^\/+/, '');
  const now = Math.floor(Date.now() / 1000);
  const keyTime = `${now};${now + 3600}`;
  const signKey = hmacHex(o.secretKey, keyTime);
  const canonical = `put\n${objPath}\n\nhost=${host}\n`;
  const inner = crypto.createHash('sha1').update(canonical).digest('hex');
  const signature = hmacHex(signKey, `sha1\n${keyTime}\n${inner}\n`);
  const auth =
    `q-sign-algorithm=sha1&q-ak=${o.secretId}&q-sign-time=${keyTime}&q-key-time=${keyTime}` +
    `&q-header-list=host&q-url-param-list=&q-signature=${signature}`;
  return { host, objPath, auth };
}

export async function putObject(o) {
  const { host, objPath, auth } = authHeader(o);
  const headers = { Authorization: auth, 'Content-Type': o.contentType || 'application/octet-stream' };
  if (o.cacheControl) headers['Cache-Control'] = o.cacheControl;
  const res = await fetch(`https://${host}${objPath}`, { method: 'PUT', headers, body: o.body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`COS PUT ${res.status}: ${text.slice(0, 300)}`);
  }
  return { url: `https://${host}${objPath}`, status: res.status };
}

/** 大文件上传：用系统 curl，支持长时间、断点式重试 */
export function putFileWithCurl(o) {
  const { host, objPath, auth } = authHeader(o);
  const url = `https://${host}${objPath}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = spawnSync('curl.exe', [
      '-sS', '--fail', '--http1.1', '--max-time', '1800',
      '--speed-time', '60', '--speed-limit', '20000',
      '--retry', '2', '--retry-delay', '5',
      '-X', 'PUT',
      '-H', `Authorization: ${auth}`,
      '-H', `Content-Type: ${o.contentType || 'application/octet-stream'}`,
      ...(o.cacheControl ? ['-H', `Cache-Control: ${o.cacheControl}`] : []),
      '--data-binary', '@' + o.file,
      url,
    ], { stdio: 'inherit' });
    if (r.status === 0) return { url, status: 200 };
    console.log(`curl put attempt ${attempt} failed (exit ${r.status})`);
    spawnSync('powershell', ['-Command', 'Start-Sleep -Seconds 3']);
  }
  throw new Error('COS PUT via curl failed after retries');
}
