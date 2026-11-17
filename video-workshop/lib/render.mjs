// 本地视频合成：图片 + 中文配音 + 居中字幕 → mp4
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const ROOT = path.join(HERE, '..');
const FFMPEG = path.join(ROOT, 'bin', 'ffmpeg.exe');
const TTS_PS1 = path.join(HERE, 'tts.ps1');
const FONT = 'C\\:/Windows/Fonts/simhei.ttf';

const FPS = 30;
const SIZE = {
  vertical: { w: 1080, h: 1920 },
  horizontal: { w: 1920, h: 1080 },
  square: { w: 1080, h: 1080 },
};

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { windowsHide: true, ...opts });
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); if (opts.onStderr) opts.onStderr(err); });
    p.stdout.on('data', (d) => { if (opts.onStdout) opts.onStdout(d.toString()); });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(err) : reject(new Error(`exit ${code}: ${err.slice(-800)}`))));
  });
}

async function getDuration(file) {
  try {
    await run(FFMPEG, ['-hide_banner', '-i', file]);
    return 0;
  } catch (e) {
    const m = /Duration:\s*(\d+):(\d+):(\d+\.\d+)/.exec(e.message);
    if (!m) return 0;
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
}

async function tts(text, outFile, rate = 0) {
  await run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', TTS_PS1, '-Text', text, '-Out', outFile, '-Rate', String(rate)], { windowsHide: true });
  return outFile;
}

function esc(p) {
  return p.replace(/\\/g, '/').replace(/:/g, '\\:');
}

function wrapText(text, maxChars) {
  const t = (text || '').trim().replace(/\r/g, '');
  if (!t) return [];
  const out = [];
  for (const para of t.split('\n')) {
    let cur = '';
    for (const ch of para) {
      cur += ch;
      if (cur.length >= maxChars) { out.push(cur); cur = ''; }
    }
    if (cur) out.push(cur);
  }
  return out;
}

/**
 * 生成纯文字卡片（片头/片尾）
 */
async function makeCard(dir, name, title, subtitle, aspect, color) {
  const size = SIZE[aspect] || SIZE.vertical;
  const bg = color || '0x0B1A2A';
  const fsMain = Math.round(size.h * 0.052);
  const fsSub = Math.round(size.h * 0.032);
  const lines = wrapText(title, Math.max(6, Math.floor((size.w * 0.8) / fsMain)));
  const tf = path.join(dir, name + '_t.txt');
  const sf = path.join(dir, name + '_s.txt');
  fs.writeFileSync(tf, lines.join('\n'), 'utf8');
  fs.writeFileSync(sf, subtitle || '', 'utf8');
  const filters = [
    `drawtext=fontfile='${FONT}':textfile='${esc(tf)}':fontcolor=white:fontsize=${fsMain}:line_spacing=14:borderw=3:bordercolor=black@0.55:x=(w-text_w)/2:y=(h-text_h)/2-${Math.round(fsMain * 0.4)}`,
  ];
  if ((subtitle || '').trim()) {
    filters.push(`drawtext=fontfile='${FONT}':textfile='${esc(sf)}':fontcolor=0x9BE9FF:fontsize=${fsSub}:x=(w-text_w)/2:y=(h-text_h)/2+${Math.round(fsMain * 0.9)}`);
  }
  const file = path.join(dir, name + '.png');
  await run(FFMPEG, ['-hide_banner', '-y', '-f', 'lavfi', '-i', `color=c=${bg}:s=${size.w}x${size.h}:d=1`, '-vf', filters.join(','), '-frames:v', '1', file]);
  return file;
}

/**
 * @param {object} job { dir, slides:[{file,text}], opts:{aspect,rate,bgmPath,bgmName,intro,outro} }
 * @param {(p:number,msg:string)=>void} onProgress
 */
export async function renderVideo(job, onProgress = () => {}) {
  const { dir, opts = {} } = job;
  let slides = job.slides.slice();
  const size = SIZE[opts.aspect] || SIZE.vertical;
  const rate = Number(opts.rate || 0);
  const audioDir = path.join(dir, 'audio');
  const subDir = path.join(dir, 'subs');
  fs.mkdirSync(audioDir, { recursive: true });
  fs.mkdirSync(subDir, { recursive: true });

  // 片头 / 片尾卡片
  if (opts.intro && String(opts.intro.title || '').trim()) {
    const f = await makeCard(dir, 'card_intro', String(opts.intro.title).trim(), String(opts.intro.subtitle || '').trim(), opts.aspect, opts.intro.color);
    slides.unshift({ file: f, text: [opts.intro.title, opts.intro.subtitle].filter(Boolean).join(' ') });
  }
  if (opts.outro && String(opts.outro.title || '').trim()) {
    const f = await makeCard(dir, 'card_outro', String(opts.outro.title).trim(), String(opts.outro.subtitle || '').trim(), opts.aspect, opts.outro.color);
    slides.push({ file: f, text: [opts.outro.title, opts.outro.subtitle].filter(Boolean).join(' ') });
  }

  // BGM：优先自定义路径，其次内置曲库
  let bgmPath = opts.bgmPath || null;
  if (!bgmPath && opts.bgmName) {
    const p = path.join(ROOT, 'assets', 'bgm', String(opts.bgmName) + '.mp3');
    if (fs.existsSync(p)) bgmPath = p;
  }

  // 1) 配音
  const narrations = [];
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const wav = path.join(audioDir, `line_${String(i).padStart(2, '0')}.wav`);
    onProgress(2 + Math.round((i / slides.length) * 18), `合成第 ${i + 1}/${slides.length} 段配音`);
    if (s.text && s.text.trim()) {
      await tts(s.text.trim(), wav, rate);
      const d = await getDuration(wav);
      narrations.push({ wav, dur: d || 2.5 });
    } else {
      narrations.push({ wav: null, dur: 2.2 });
    }
  }

  // 2) 每段时长
  const PAD = 0.45;
  const durations = narrations.map((n) => Math.max(2.2, n.dur + PAD));
  const total = durations.reduce((a, b) => a + b, 0);

  // 3) 字幕：按宽度换行，逐行居中
  const subLayout = [];
  for (let i = 0; i < slides.length; i++) {
    let subFs = opts.aspect === 'horizontal' ? Math.round(size.h * 0.052) : Math.round(size.h * 0.038);
    let lines = [];
    for (let attempt = 0; attempt < 5; attempt++) {
      const maxChars = Math.max(6, Math.floor((size.w * 0.86) / subFs));
      lines = wrapText(slides[i].text, maxChars);
      if (lines.length <= 3) break;
      subFs = Math.round(subFs * 0.88);
    }
    const files = lines.map((line, j) => {
      const f = path.join(subDir, `s_${String(i).padStart(2, '0')}_${j}.txt`);
      fs.writeFileSync(f, line, 'utf8');
      return f;
    });
    subLayout.push({ fs: subFs, files });
  }

  // 4) 输入与滤镜
  const inputs = [];
  const filters = [];
  let idx = 0;
  const imgIdx = [];
  for (let i = 0; i < slides.length; i++) {
    inputs.push('-loop', '1', '-t', durations[i].toFixed(2), '-i', slides[i].file);
    imgIdx.push(idx++);
  }
  const audIdx = [];
  for (let i = 0; i < narrations.length; i++) {
    if (narrations[i].wav) { inputs.push('-i', narrations[i].wav); audIdx.push(idx++); }
    else audIdx.push(-1);
  }
  let bgmIdx = -1;
  if (bgmPath && fs.existsSync(bgmPath)) { inputs.push('-stream_loop', '-1', '-i', bgmPath); bgmIdx = idx++; }

  const marginBottom = Math.round(size.h * 0.10);
  for (let i = 0; i < slides.length; i++) {
    const dur = durations[i];
    const fadeOutStart = Math.max(0, dur - 0.3);
    const layout = subLayout[i];
    const lineHeight = Math.round(layout.fs * 1.32);
    const n = layout.files.length;
    const draws = layout.files.map((file, j) => {
      const y = size.h - marginBottom - (n - j) * lineHeight;
      return `drawtext=fontfile='${FONT}':textfile='${esc(file)}':fontcolor=white:fontsize=${layout.fs}:` +
        `borderw=3:bordercolor=black@0.75:shadowx=0:shadowy=2:shadowcolor=black@0.5:` +
        `x=(w-text_w)/2:y=${y}:enable='between(t,0.15,${(dur - 0.1).toFixed(2)})'`;
    }).join(',');
    const drawChain = draws ? ',' + draws : '';
    filters.push(
      `[${imgIdx[i]}:v]scale=${size.w}:${size.h}:force_original_aspect_ratio=increase,crop=${size.w}:${size.h},setsar=1,` +
      `zoompan=z='min(1+0.00055*on,1.09)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${size.w}x${size.h}:fps=${FPS}` +
      drawChain +
      `,fade=t=in:st=0:d=0.3,fade=t=out:st=${fadeOutStart.toFixed(2)}:d=0.3,` +
      `trim=duration=${dur.toFixed(2)},setpts=PTS-STARTPTS[v${i}]`
    );
  }
  filters.push(slides.map((_, i) => `[v${i}]`).join('') + `concat=n=${slides.length}:v=1:a=0[vout]`);

  // 音频
  const aParts = [];
  for (let i = 0; i < slides.length; i++) {
    const dur = durations[i];
    if (audIdx[i] >= 0) {
      const delayMs = 120;
      filters.push(`[${audIdx[i]}:a]adelay=${delayMs}|${delayMs},apad,atrim=duration=${dur.toFixed(2)},asetpts=PTS-STARTPTS[a${i}]`);
    } else {
      filters.push(`aevalsrc=0:d=${dur.toFixed(2)}:s=44100[a${i}]`);
    }
    aParts.push(`[a${i}]`);
  }
  filters.push(aParts.join('') + `concat=n=${slides.length}:v=0:a=1[aconcat]`);
  if (bgmIdx >= 0) {
    filters.push(`[${bgmIdx}:a]atrim=duration=${total.toFixed(2)},volume=0.16[bgm];[aconcat][bgm]amix=inputs=2:duration=first:dropout_transition=0,volume=1.8[aout]`);
  } else {
    filters.push(`[aconcat]volume=1.0[aout]`);
  }

  // 5) 执行
  const outFile = path.join(dir, 'output.mp4');
  const args = [
    '-hide_banner', '-y',
    ...inputs,
    '-filter_complex', filters.join(';'),
    '-map', '[vout]', '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100',
    '-movflags', '+faststart',
    '-progress', 'pipe:1', '-nostats',
    outFile,
  ];

  onProgress(24, '开始合成视频');
  let lastPct = 24;
  await run(FFMPEG, args, {
    onStdout: (chunk) => {
      const re = /out_time_ms=(\d+)/g;
      let g;
      while ((g = re.exec(chunk)) !== null) {
        const sec = Number(g[1]) / 1e6;
        const pct = Math.min(96, 24 + Math.round((sec / total) * 72));
        if (pct > lastPct) { lastPct = pct; onProgress(pct, `合成中 ${pct}%`); }
      }
    },
  });

  // 6) SRT
  let srt = '';
  let t = 0;
  const fmt = (x) => {
    const hh = String(Math.floor(x / 3600)).padStart(2, '0');
    const mm = String(Math.floor((x % 3600) / 60)).padStart(2, '0');
    const ss = String(Math.floor(x % 60)).padStart(2, '0');
    const ms = String(Math.round((x % 1) * 1000)).padStart(3, '0');
    return `${hh}:${mm}:${ss},${ms}`;
  };
  slides.forEach((s, i) => {
    const a = t, b = t + durations[i];
    srt += `${i + 1}\n${fmt(a)} --> ${fmt(b)}\n${(s.text || '').trim()}\n\n`;
    t = b;
  });
  fs.writeFileSync(path.join(dir, 'output.srt'), '\ufeff' + srt, 'utf8');

  onProgress(100, '完成');
  return { output: outFile, srt: path.join(dir, 'output.srt'), duration: total, size };
}

/**
 * 批量生成：同一套画面，多个不同的开场钩子
 * @param {object} job
 * @param {string[]} hooks
 */
export async function renderVideoBatch(job, hooks, onProgress = () => {}) {
  const list = (hooks || []).map((h) => String(h || '').trim()).filter(Boolean);
  const results = [];
  for (let i = 0; i < list.length; i++) {
    const hook = list[i];
    const dir = path.join(job.dir, 'v' + (i + 1));
    fs.mkdirSync(dir, { recursive: true });
    const slides = job.slides.map((s, idx) => (idx === 0 ? { ...s, text: hook } : s));
    onProgress((i / list.length) * 100, `第 ${i + 1}/${list.length} 条生成中`);
    const r = await renderVideo({ ...job, dir, slides }, (p, m) => {
      onProgress(((i + p / 100) / list.length) * 100, `第 ${i + 1}/${list.length} 条：${m}`);
    });
    results.push({ ...r, hook, index: i + 1 });
  }
  onProgress(100, '批量完成');
  return results;
}