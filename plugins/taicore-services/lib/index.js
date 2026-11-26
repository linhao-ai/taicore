// taicore-services：WeDAO 启动时自动拉起 service-manager（8799）
// 它再按需启动出图/视频/团队/获客/账号服务，避免常驻占用内存。
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = 'taicore-services';
export const inject = [];

const here = path.dirname(fileURLToPath(import.meta.url));        // .../assets/plugins/taicore-services/lib
const appDir = path.resolve(here, '../../../../');                 // <install>/dsh-desktop
const nodeExe = path.join(appDir, 'vendor', 'node', 'node.exe');
const serverFile = path.join(appDir, 'service-manager', 'server.mjs');

let started = false;

function start(ctx) {
  if (started) return;
  started = true;
  try {
    if (!existsSync(serverFile)) {
      ctx?.logger?.warn?.('[taicore-services] service-manager 不存在: ' + serverFile);
      return;
    }
    const exe = existsSync(nodeExe) ? nodeExe : process.execPath;
    const child = spawn(exe, [serverFile], {
      cwd: path.dirname(serverFile),
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    ctx?.logger?.info?.('[taicore-services] service-manager started pid=' + child.pid);
  } catch (e) {
    ctx?.logger?.warn?.('[taicore-services] 启动失败: ' + e.message);
  }
}

export function apply(ctx) {
  try { ctx?.on?.('ready', () => start(ctx)); } catch (e) {}
  setTimeout(() => start(ctx), 2000);
}

export default { name, inject, apply };
