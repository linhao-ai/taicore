# 钛核 TAICORE · 品牌构建种子仓库

这个仓库**不含** DSH Desktop 源码，只做三件事：
1. 在 CI 里拉取上游 `myYangyunfan/dsh_desktop`（MIT）；
2. 把钛核的品牌配置、图标、客户端插件注入进去；
3. 用 GitHub Actions 的 Windows 机器编出安装包并作为 artifact 上传。

## 三步出包

1. 在 GitHub 新建一个空仓库（Private 也行）。
2. 把本目录的**全部文件**拖进仓库根目录（网页端 Add file → Upload files，支持整文件夹拖拽）。
3. 进 **Actions → build-taicore → Run workflow**，等 20–40 分钟。

产物：`Actions → 本次运行 → Artifacts → TAICORE-windows`，里面是
`TAICORE-Setup-*.exe`（约 190 MB）和它的 sha256。

## 它会改上游的哪些文件

| 文件 | 改动 |
|---|---|
| `dsh-tauri/src-tauri/src/app/tauri.conf.json` | 产品名 `TAICORE`、标识 `com.taicore.desktop`、更新源占位 |
| `dsh-tauri/src-tauri/icons/icon.ico` / `icon.png` | 钛核六边形图标（多尺寸） |
| `dsh-desktop/assets/plugins/taicore-brand/` | 新增：客户端 slot 注册 + 主题 token + 文案接管的品牌插件 |
| `dsh-desktop/scripts/lib/companion-plugins.js` | 追加 `taicore-brand` 一行（首启自动同步进 profile） |
| `ui/index.html` / `dsh-desktop/assets/tray-icon.png` | 运行时标题与托盘图标 |

## 已知限制

- **窗口标题栏**：改 `productName` 后 exe 名称与任务栏名为 `TAICORE`；如果上游在 Rust 侧硬编码了
  标题文案，需要再改 `dsh-tauri/src-tauri/src/app/**` 里的 `title`——CI 日志会暴露编译错误，按提示改。
- **上游清单锚点**：`companion-plugins.js` 里的插入锚点写死在 `ds-harness-remote` 那一行，
  上游改动该文件时 CI 会打印 `[warn] companion anchor not found`，此时安装包仍能出来，
  但品牌插件需要在装好后手动跑一次 `branding/install-brand.ps1`。
- **Artifact 有 30 天保留期**，下载需要 GitHub 登录；拿到 exe 后建议放自己的对象存储/CDN，
  再用 `dist/stub` 里的 5.5 KB 下载器分发（微信单文件 ≤ 100 MB 的限制绕不过去）。
- **没有代码签名**：Windows 会弹 SmartScreen，需用户点「更多信息 → 仍要运行」。
  正式售卖前应购买 OV/EV 证书并对安装包签名。

## 品牌资产从哪来

全部来自本地 `brand/` 目录：`BRAND.md`（命名与色板）、`logo-*.svg`、`theme.tokens.css`、
`packages/taicore-brand`（Web 层品牌插件）。改色/改字后重新生成图标即可。

## License

上游 MIT；本仓库的品牌资产同样按 MIT 提供。注意：**DeepSeek / DSH 商标与鲸鱼标志不在 MIT 授权范围内**，
本方案已把它们全部替换为钛核资产；随包插件里 `dsh-pocket` 为 GPL-2.0，商用分发前需移除或开源。
