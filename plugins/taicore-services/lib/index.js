// taicore-services：WeDAO 启动时自动拉起 service-manager（8799）
import { spawn } from 'node:child_process';
import { existsSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = 'taicore-services';
export const inject = [];

const here = path.dirname(fileURLToPath(import.meta.url));
const logFile = path.join(process.env.TEMP || '.', 'wedao-svc.log');

function log(msg) {
  try { appendFileSync(logFile, new Date().toISOString() + ' ' + msg + '\n'); } catch (e) {}
}

function candidates() {
  const list = [];
  // 1) 内核 node 一般在 <安装>/dsh-desktop/vendor/node/node.exe
  try {
    list.push(path.resolve(path.dirname(process.execPath), '..', '..'));
  } catch (e) {}
  // 2) 环境变量（安装器可写）
  if (process.env.WEDAO_HOME) list.push(process.env.WEDAO_HOME);
  // 3) 从本插件位置向上找 dsh-desktop
  let p = here;
  for (let i = 0; i < 8; i++) {
    p = path.dirname(p);
    list.push(p, path.join(p, 'dsh-desktop'));
  }
  return list;
}

function findAppDir() {
  for (const d of candidates()) {
    if (existsSync(path.join(d, 'service-manager', 'server.mjs'))) return d;
  }
  return '';
}

let started = false;

function start(ctx) {
  if (started) return;
  started = true;
  const appDir = findAppDir();
  const nodeExe = appDir && path.join(appDir, 'vendor', 'node', 'node.exe');
  const serverFile = appDir && path.join(appDir, 'service-manager', 'server.mjs');
  log('start appDir=[' + appDir + '] server=' + (serverFile && existsSync(serverFile)));
  try {
    if (!serverFile || !existsSync(serverFile)) { log('server missing'); return; }
    const exe = existsSync(nodeExe) ? nodeExe : process.execPath;
    const child = spawn(exe, [serverFile], {
      cwd: path.dirname(serverFile),
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: { ...process.env, SM_ROOT: appDir },
    });
    child.unref();
    log('spawned pid=' + child.pid);
  } catch (e) {
    log('spawn error ' + e.message);
  }
}

export function apply(ctx) {
  log('apply called execPath=' + process.execPath);
  try { ctx?.on?.('ready', () => start(ctx)); } catch (e) {}
  setTimeout(() => start(ctx), 1500);
}

export default { name, inject, apply };
