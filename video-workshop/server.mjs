// 钛核 · 视频工坊（本地）
// 启动：node server.mjs  然后浏览器打开 http://127.0.0.1:8790
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { renderVideo, renderVideoBatch } from './lib/render.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const PORT = Number(process.env.PORT || 8790);
const JOBS = path.join(HERE, 'jobs');
const OUT = path.join(HERE, 'output');
fs.mkdirSync(JOBS, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const state = new Map(); // id -> {status, progress, msg, dir, error, output}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req, limit = 60 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function saveDataUrl(dataUrl, dest) {
  const m = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/.exec(dataUrl || '');
  if (!m) throw new Error('图片格式不支持（请用 png/jpg/webp）');
  const ext = m[1].includes('png') ? 'png' : m[1].includes('webp') ? 'webp' : 'jpg';
  const file = dest + '.' + ext;
  fs.writeFileSync(file, Buffer.from(m[2], 'base64'));
  return file;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.mp4': 'video/mp4', '.srt': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

function serveFile(res, file) {
  if (!fs.existsSync(file)) { res.writeHead(404).end('not found'); return; }
  const ext = path.extname(file).toLowerCase();
  const stat = fs.statSync(file);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = url.pathname;

  if (p === '/' || p === '/index.html') return serveFile(res, path.join(HERE, 'public', 'index.html'));
  if (p.startsWith('/assets/')) return serveFile(res, path.join(HERE, 'public', p.replace('/assets/', '')));

  if (p === '/api/render' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const slides = Array.isArray(body.slides) ? body.slides : [];
      if (!slides.length) return sendJson(res, 400, { error: '请至少添加一张图片' });
      const id = crypto.randomBytes(4).toString('hex');
      const dir = path.join(JOBS, id);
      fs.mkdirSync(dir, { recursive: true });
      const prepared = slides.map((s, i) => ({ file: saveDataUrl(s.image, path.join(dir, 'img_' + i)), text: s.text || '' }));
      let bgmPath = null;
      if (body.opts && body.opts.bgm) {
        bgmPath = path.join(dir, 'bgm.mp3');
        fs.writeFileSync(bgmPath, Buffer.from(String(body.opts.bgm).split(',')[1] || '', 'base64'));
      }
      const rec = { status: 'running', progress: 0, msg: '准备中', dir, startedAt: Date.now(), videos: [] };
      state.set(id, rec);

      const opts = { ...(body.opts || {}), bgmPath };
      const hooks = Array.isArray(body.hooks) ? body.hooks.map((h) => String(h || '').trim()).filter(Boolean) : [];

      if (hooks.length > 1) {
        // 批量：同一套画面 + 多个开场钩子
        renderVideoBatch({ dir, slides: prepared, opts }, hooks, (progress, msg) => { rec.progress = progress; rec.msg = msg; })
          .then((rs) => {
            rec.status = 'done';
            rec.progress = 100;
            rec.msg = `完成 ${rs.length} 条`;
            rec.videos = rs.map((r) => {
              const name = `钛核视频_${id}_${r.index}.mp4`;
              fs.copyFileSync(r.output, path.join(OUT, name));
              fs.copyFileSync(r.srt, path.join(OUT, name.replace(/\.mp4$/, '.srt')));
              return { name, url: `/output/${encodeURIComponent(name)}`, hook: r.hook, duration: r.duration };
            });
          })
          .catch((e) => {
            rec.status = 'error'; rec.msg = '合成失败';
            rec.error = String(e.message || e).slice(0, 500);
            console.error('[batch error]', e);
          });
      } else {
        renderVideo({ dir, slides: prepared, opts }, (progress, msg) => { rec.progress = progress; rec.msg = msg; })
          .then((r) => {
            rec.status = 'done';
            rec.progress = 100;
            rec.msg = '完成';
            rec.output = r.output;
            rec.srt = r.srt;
            rec.duration = r.duration;
            const finalMp4 = path.join(OUT, `钛核视频_${id}.mp4`);
            fs.copyFileSync(r.output, finalMp4);
            fs.copyFileSync(r.srt, path.join(OUT, `钛核视频_${id}.srt`));
            rec.publicMp4 = finalMp4;
            rec.videos = [{ name: path.basename(finalMp4), url: `/files/${id}/output.mp4`, hook: '', duration: r.duration }];
          })
          .catch((e) => {
            rec.status = 'error';
            rec.msg = '合成失败';
            rec.error = String(e.message || e).slice(0, 500);
            console.error('[render error]', e);
          });
      }


      return sendJson(res, 200, { id });
    } catch (e) {
      return sendJson(res, 400, { error: String(e.message || e) });
    }
  }

  const mJob = /^\/api\/job\/([a-f0-9]+)$/.exec(p);
  if (mJob) {
    const rec = state.get(mJob[1]);
    if (!rec) return sendJson(res, 404, { error: 'not found' });
    return sendJson(res, 200, {
      status: rec.status, progress: rec.progress, msg: rec.msg, error: rec.error || null,
      video: rec.status === 'done' && (rec.videos || []).length === 1 ? rec.videos[0].url + '?v=' + rec.startedAt : null,
      videos: rec.status === 'done' ? (rec.videos || []).map((v) => ({ ...v, url: v.url + '?v=' + rec.startedAt })) : [],
      duration: rec.duration || null,
    });
  }

  const mFile = /^\/files\/([a-f0-9]+)\/([\w.]+)$/.exec(p);
  if (mFile) {
    const rec = state.get(mFile[1]);
    if (!rec) { res.writeHead(404).end(); return; }
    return serveFile(res, path.join(rec.dir, mFile[2]));
  }

  if (p === '/api/outputs') {
    const list = fs.readdirSync(OUT).filter((f) => f.endsWith('.mp4')).map((f) => {
      const st = fs.statSync(path.join(OUT, f));
      return { name: f, size: st.size, mtime: st.mtimeMs };
    }).sort((a, b) => b.mtime - a.mtime).slice(0, 30);
    return sendJson(res, 200, list);
  }

  if (p === '/api/open-output') {
    return sendJson(res, 200, { dir: OUT });
  }

  if (p.startsWith('/output/')) {
    const name = decodeURIComponent(p.replace('/output/', ''));
    if (name.includes('..') || name.includes('/') || name.includes('\\')) { res.writeHead(400).end(); return; }
    return serveFile(res, path.join(OUT, name));
  }

  res.writeHead(404).end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`视频工坊已启动: http://127.0.0.1:${PORT}`);
  console.log(`输出目录: ${OUT}`);
});
