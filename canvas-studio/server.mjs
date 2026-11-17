// 钛核 · 一键出图（本地静态服务）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const PORT = Number(process.env.PORT || 8795);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };

http.createServer((req, res) => {
  const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = u.pathname === '/' ? '/index.html' : u.pathname;
  const file = path.join(HERE, 'public', p.replace(/^\/+/, ''));
  if (!file.startsWith(path.join(HERE, 'public'))) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(file)) { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`无限画布: http://127.0.0.1:${PORT}`));