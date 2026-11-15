# taicore-brand · 钛核品牌包（PoC）

把 DSH Web 客户端改成「钛核 TAICORE」：侧栏标志与名称、会话首屏品牌位、主题 token。
不改内核、不改 `node_modules` 上游包，全部通过 Cordis 插件与 slot 占位实现。

## 文件

| 文件 | 作用 |
|---|---|
| `lib/client.js` | 浏览器半边：三个 slot 注册 + token 样式注入 + `ctx.theme.register` |
| `lib/index.mjs` | Node 半边：空 apply，仅作 bundle 挂载点 |
| `cordis.patch.yml` | bundle 挂载声明 |
| `install.ps1` / `uninstall.ps1` | 安装 / 回滚 |

## 安装

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -Restart
```

脚本会：备份 `package.json` 与 `cordis.patch.yml` → 复制包到
`%USERPROFILE%\.dsh\profiles\web\node_modules\taicore-brand` → 加入 `dsh.profile.bundles`
→ 按 id 停用其它品牌挂载（如 `brand-xingshu`）→ 可选重启客户端。

## 回滚

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\uninstall.ps1 -Restart
```

## 设计要点

- **优先级抢占**：三个 slot 均以 `priority: -1` 注册。slot 规则是"最低者渲染"，
  因此即使别的品牌包也注册同一位（默认 0）也不会报冲突，钛核会稳定盖住它。
- **样式兜底**：即使 `ctx.theme` 服务不可用，注入的 `#taicore-tokens` 样式表也能生效
  （实测 `--dsw-alias-state-business-primary` 已变成 `#00E0FF`）。
- **零依赖**：只 require `react` / `react/jsx-runtime`，不引入其它内核包，
  避免"残留 require 导致整棵插件树加载失败"。
- **可回滚**：不删除任何既有包；停用只改 patch 的 `disabled` 标记。

## 已知边界（PoC 阶段）

- 只覆盖 Web UI 层；安装包产品名、图标、安装器文案、更新源仍指向 DSH Desktop，
  需要在 Tauri 壳层（`tauri.conf.json` + `icons/`）另做一轮。
- 当前未替换首屏插画与设置页 About 文案，属于 L3/L4 的下一批工作。
