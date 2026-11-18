// 腾讯云 COS：签名下载 URL + 上传对象
import crypto from 'node:crypto';

function hmacHex(key, data) {
  return crypto.createHmac('sha1', key).update(data).digest('hex');
}

/**
 * 生成带签名的下载 URL（GET，query 传签名）
 * @param {{bucket:string, region:string, secretId:string, secretKey:string, key:string, ttlSeconds:number}} o
 */
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

/** 上传对象（PUT） */
export async function putObject(o) {
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

  const headers = {
    Authorization: auth,
    'Content-Type': o.contentType || 'application/octet-stream',
  };
  if (o.cacheControl) headers['Cache-Control'] = o.cacheControl;

  const res = await fetch(`https://${host}${objPath}`, {
    method: 'PUT',
    headers,
    body: o.body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`COS PUT ${res.status}: ${text.slice(0, 300)}`);
  }
  return { url: `https://${host}${objPath}`, status: res.status };
}
