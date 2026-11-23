// 为道 WeDAO —— 品牌占位插件（客户端半边）
// 作用：① 侧栏标志/名称 ② 会话首屏品牌位 ③ 主题 token 注入（含暗色/浅色）
// 约束：只依赖 react / react/jsx-runtime（其它 require 会让整棵插件树加载失败）
window.__ModuleLoader__.load({
  id: "taicore-brand",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const h = React.createElement;

    const GRAD = "taicore-grad";
    const INK = "#E8EEF9";
    const SUB = "#9AA7BD";

    function gradientDefs() {
      return h(
        "defs",
        { key: "defs" },
        h(
          "linearGradient",
          { id: GRAD, x1: "0", y1: "0", x2: "1", y2: "1" },
          h("stop", { key: "a", offset: "0", stopColor: "#00E0FF" }),
          h("stop", { key: "b", offset: "1", stopColor: "#7A5CFF" })
        )
      );
    }

    function Mark(props) {
      const size = (props && props.size) || 26;
      return h(
        "svg",
        {
          width: size,
          height: size,
          viewBox: "0 0 96 96",
          style: { display: "block", filter: "drop-shadow(0 0 8px rgba(0,224,255,.5))" },
          "aria-hidden": "true",
        },
        [
          gradientDefs(),
          h("path", {
            key: "hex",
            d: "M88 48 L68 83 L28 83 L8 48 L28 13 L68 13 Z",
            fill: "none",
            stroke: "url(#" + GRAD + ")",
            strokeWidth: 5.5,
            strokeLinejoin: "round",
          }),
          h("path", {
            key: "core",
            d: "M70 48 L59 67 L37 67 L26 48 L37 29 L59 29 Z",
            fill: "url(#" + GRAD + ")",
            fillOpacity: 0.18,
            stroke: "url(#" + GRAD + ")",
            strokeOpacity: 0.55,
            strokeWidth: 1.2,
            strokeLinejoin: "round",
          }),
          h("path", {
            key: "bolt",
            d: "M54.5 24 L39.5 51 H48.5 L43.5 72 L60.5 43.5 H51 Z",
            fill: "#D9FBFF",
          }),
          h("circle", { key: "dot", cx: 86, cy: 26, r: 3.4, fill: "#00E0FF" }),
        ]
      );
    }

    function BrandName() {
      return h(
        "span",
        {
          style: {
            display: "inline-flex",
            alignItems: "baseline",
            gap: 8,
            color: INK,
            fontWeight: 750,
            fontSize: 16,
            letterSpacing: "0.01em",
            lineHeight: 1.1,
          },
        },
        "为道",
        h(
          "span",
          {
            style: {
              fontSize: 9,
              letterSpacing: "0.34em",
              fontWeight: 600,
              color: SUB,
            },
          },
          "WeDAO"
        )
      );
    }

    function Hero(props) {
      const size = (props && props.size) || 56;
      return h(
        "span",
        { style: { display: "inline-flex", alignItems: "center", gap: 14 } },
        h(Mark, { size }),
        h(
          "span",
          {
            style: {
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              background: "linear-gradient(135deg,#00E0FF 0%,#7A5CFF 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            },
          },
          "为道"
        )
      );
    }

    // ---- 主题 token：作为兜底注入，保证即使 theme 服务不可用也能换色 ----
    const CSS = [
      "html:root, html body[data-ds-dark-theme]{",
      "--dsw-alias-state-business-primary:#00E0FF;",
      "--dsw-alias-state-business-primary-hover:#4DEBFF;",
      "--dsw-alias-state-business-primary-active:#00B8D4;",
      "--dsw-focus-ring-color:#00E0FF;",
      "--dsw-alias-bg-document-selection:rgba(0,224,255,.22);",
      "--dsw-alias-state-done-primary:#22D3A5;",
      "--dsw-alias-bg-base:#070A12;",
      "--dsw-alias-bg-l1:#0E1422;",
      "--dsw-alias-bg-l2:#151C2E;",
      "--dsw-alias-bg-l3:#1B2438;",
      "--dsw-alias-border-l1:#25304A;",
      "--dsw-alias-border-l2:#2F3B58;",
      "--dsw-alias-label-primary:#E8EEF9;",
      "--dsw-alias-label-secondary:#9AA7BD;",
      "--dsw-font-family-brand:'Segoe UI','Microsoft YaHei',sans-serif;",
      "}",
      "html body:not([data-ds-dark-theme]){",
      "--dsw-alias-state-business-primary:#0B63F6;",
      "--dsw-focus-ring-color:#0B63F6;",
      "--dsw-alias-label-primary:#0B1220;",
      "--dsw-alias-label-secondary:#5B6B85;",
      "--dsw-alias-border-l1:#E2E8F2;",
      "}",
    ].join("");

    function injectTokens() {
      try {
        if (typeof document === "undefined") return;
        if (document.getElementById("taicore-tokens")) return;
        const s = document.createElement("style");
        s.id = "taicore-tokens";
        s.textContent = CSS;
        document.head.appendChild(s);
      } catch (e) {
        /* 样式注入失败不影响功能 */
      }
    }

    // ---- 欢迎页/通用文案与视觉的接管（DOM 层，可逆） ----
    const WELCOME_CSS = [
      ".taicore-hero{background:linear-gradient(135deg,#00E0FF 0%,#7A5CFF 100%);",
      "-webkit-background-clip:text;background-clip:text;color:transparent!important;}",
      ".taicore-cta{background:linear-gradient(135deg,#00E0FF 0%,#7A5CFF 100%)!important;",
      "color:#04121A!important;border:0!important;box-shadow:0 10px 30px rgba(0,224,255,.28)!important;}",
      ".taicore-wordmark{display:inline-flex;align-items:baseline;gap:8px;font-weight:750;",
      "font-size:14px;color:inherit;letter-spacing:.01em;}",
      ".taicore-wordmark small{font-size:9px;letter-spacing:.32em;opacity:.65;font-weight:600;}",
    ].join("");

    function rebrandNode(root) {
      try {
        if (!root || root.nodeType !== 1) return;
        // 1) 文案：DeepSeek Harness → 为道 WeDAO
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        const jobs = [];
        let n;
        while ((n = walker.nextNode())) {
          if (n.nodeValue && /DeepSeek Harness|DSH Pack|DSH Desktop/i.test(n.nodeValue)) jobs.push(n);
        }
        for (const node of jobs) {
          node.nodeValue = node.nodeValue
            .replace(/DeepSeek Harness/gi, "为道 WeDAO")
            .replace(/DSH Pack/gi, "为道 WeDAO")
            .replace(/DSH Desktop/gi, "为道 WeDAO");
        }
        // 2) 欢迎页标题渐变（标题可能带子 span，逐层上色）
        const heads = [...root.querySelectorAll("h1,h2,h3")].filter(
          (el) => (el.textContent || "").trim().startsWith("欢迎使用")
        );
        const hero = heads[0] || [...root.querySelectorAll("div,span")].find(
          (el) => el.childElementCount <= 2 && (el.textContent || "").trim().startsWith("欢迎使用")
        );
        if (hero) {
          [hero, ...hero.querySelectorAll("*")].forEach((el) => {
            el.style.background = "linear-gradient(135deg,#00E0FF 0%,#7A5CFF 100%)";
            el.style.webkitBackgroundClip = "text";
            el.style.backgroundClip = "text";
            el.style.color = "transparent";
          });
        }
        // 3) 主按钮换品牌色
        root.querySelectorAll("button").forEach((b) => {
          const t = (b.textContent || "").trim();
          if (t === "开始设置" || t === "开始使用") b.classList.add("taicore-cta");
        });
        // 4) 官方字标（SVG）替换为为道字标
        root.querySelectorAll('svg[aria-label*="eepSeek" i], svg[aria-label*="HARNESS" i]').forEach((svg) => {
          const parent = svg.parentElement;
          if (!parent || parent.querySelector(".taicore-wordmark")) return;
          svg.style.display = "none";
          const wm = document.createElement("span");
          wm.className = "taicore-wordmark";
          wm.innerHTML = "为道<small>WeDAO</small>";
          parent.insertBefore(wm, svg);
        });
        // 5) 文本型官方字标（如浮窗头部的 deepseek HARNESS）整体替换
        [...root.querySelectorAll("div,span,a,button,h1,h2")].forEach((el) => {
          if (el.dataset.tcReplaced === "1") return;
          const txt = (el.textContent || "").trim().toLowerCase().replace(/\s+/g, " ");
          if (txt !== "deepseek harness" && txt !== "dsh pack" && txt !== "dsh desktop") return;
          const r = el.getBoundingClientRect();
          if (!r.width || r.width > 320 || r.height > 72) return;
          el.dataset.tcReplaced = "1";
          el.innerHTML = '<span class="taicore-wordmark">为道<small>WeDAO</small></span>';
        });
        // 6) 未配置模型：中文引导
        const credEls = [...root.querySelectorAll("div,p,span,li")].filter((el) => {
          if (el.dataset.tcCred === "1") return false;
          const t = el.textContent || "";
          return t.length < 400 && /MISSING_CREDENTIAL|no API key/i.test(t);
        });
        if (credEls.length && !document.getElementById("taicore-cred-once")) {
          const el = credEls[0];
          el.dataset.tcCred = "1";
          const tip = document.createElement("div");
          tip.className = "taicore-cred-tip"; tip.id = "taicore-cred-once";
          tip.style.cssText = "margin:10px 0;padding:11px 13px;border-radius:10px;border:1px solid rgba(0,224,255,.3);background:rgba(0,224,255,.08);color:#BFEFFF;font-size:12.5px;line-height:1.75";
          tip.innerHTML = "💡 <b>还没有配置模型</b>：为道使用你自己的模型账号，不上传任何数据。<br>点右上角「设置 → 模型」，或下方「请选择模型」，填入 DeepSeek / 通义 / 豆包等 API Key 即可开始使用。";
          el.insertAdjacentElement("afterend", tip);
        }
      } catch (e) {
        /* DOM 接管失败不影响插件其余部分 */
      }
    }

    function observeDom() {
      try {
        if (typeof document === "undefined") return;
        if (document.getElementById("taicore-dom-css")) return;
        const s = document.createElement("style");
        s.id = "taicore-dom-css";
        s.textContent = WELCOME_CSS;
        document.head.appendChild(s);
        rebrandNode(document.body);
        let timer = null;
        const obs = new MutationObserver(() => {
          if (timer) return;
          timer = setTimeout(() => {
            timer = null;
            rebrandNode(document.body);
          }, 180);
        });
        obs.observe(document.body, { childList: true, subtree: true });
      } catch (e) {
        /* 忽略 */
      }
    }

    // 锁定浏览器/窗口标题（防被内核动态改回 DeepSeek Harness）
    const TC_TITLE = "为道 WeDAO";
    function lockTitle() {
      try { if (document.title !== TC_TITLE) document.title = TC_TITLE; } catch (e) {}
    }
    lockTitle();
    setInterval(lockTitle, 1500);
    function apply(ctx) {
      injectTokens();
      observeDom();

      // 主题注册（可选；失败不阻塞品牌占位）
      try {
        const theme = ctx.get ? ctx.get("theme") : ctx.theme;
        if (theme && typeof theme.register === "function") {
          theme.register({
            id: "taicore",
            colorScheme: "dark",
            tokens: {
              "--dsw-alias-state-business-primary": "#00E0FF",
              "--dsw-alias-state-business-primary-hover": "#4DEBFF",
              "--dsw-alias-state-done-primary": "#22D3A5",
              "--dsw-font-family-brand": "'Segoe UI','Microsoft YaHei',sans-serif",
            },
          });
        }
      } catch (e) {
        /* 主题服务缺失或签名不符时忽略 */
      }

      try {
        ctx.slots.inject("sidebar.brand.mark", () =>
          ctx.slots.inject("sidebar.brand.name", function* () {
            yield ctx.slots.register({ name: "sidebar.brand.mark", priority: -1 }, Mark);
            yield ctx.slots.register({ name: "sidebar.brand.name", priority: -1 }, BrandName);
          })
        );
      } catch (e) {
        /* 插槽未声明时忽略 */
      }

      try {
        ctx.slots.inject("conversation.hero.brand.mark", function* () {
          yield ctx.slots.register({ name: "conversation.hero.brand.mark", priority: -1 }, Hero);
        });
      } catch (e) {
        /* 插槽未声明时忽略 */
      }
    }

    exports.apply = apply;
    exports.inject = ["slots"];
    exports.Mark = Mark;
    return module.exports;
  },
});








/* WEDAO_WORKBENCH：侧边栏「AI 工作台」入口 + 功能面板 */
(function () {
  try {
    if (typeof document === 'undefined') return;
    var FEATURES = [
      { name: 'AI 一键出图', url: '/proposal.html', desc: '上传商品图 → 主图 + 详情页' },
      { name: '主图设计器', url: '/designer.html', desc: '拖拽排版 · 描边 · 导出 PNG' },
      { name: 'AI 员工团队', url: 'http://127.0.0.1:8796/', desc: '圆桌会议 · 单聊 · 团队任务流水线' },
      { name: '视频工坊', url: 'http://127.0.0.1:8790/', desc: 'AI 配图 + 文案 + 配音 + 自动成片' },
      { name: '获客助手', url: 'http://127.0.0.1:8792/', desc: '评论意向 · 回复草稿 · 线索' },
      { name: '获客设置', url: 'http://127.0.0.1:8792/profile', desc: '行业 · 门店 · 产品档案' },
      { name: '客服助手', url: 'http://127.0.0.1:8792/profile', desc: '话术库 · 售后处理（配置中）' },
      { name: '用量中心', url: '', desc: '即将上线' }
    ];
    var BASE = 'http://127.0.0.1:8793';

    function close() { var p = document.getElementById('wedao-wb'); if (p) p.remove(); }
    function openPage(url) {
      var f = document.getElementById('wedao-wb-frame');
      if (f) f.src = /^https?:/.test(url) ? url : (BASE + url);
      var t = document.getElementById('wedao-wb-title');
      if (t) t.textContent = (FEATURES.find(function (x) { return x.url === url; }) || {}).name || '';
    }
    function openPanel() {
      if (document.getElementById('wedao-wb')) return;
      var box = document.createElement('div');
      box.id = 'wedao-wb';
      box.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:92vw;height:88vh;z-index:2147483600;background:#0b1220;display:flex;flex-direction:column;border-radius:14px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6);border:1px solid #1c2740';
      var bar = document.createElement('div');
      bar.style.cssText = 'height:46px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;background:#0f1523;border-bottom:1px solid #1c2740;color:#dff6ff;font:700 13px "Microsoft YaHei",sans-serif;cursor:move';
      bar.innerHTML = '<span>✦ AI 工作台 · <span id="wedao-wb-title"></span></span><span><button id="wedao-wb-new" style="margin-right:8px;background:#1c2740;color:#cfe0ff;border:0;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:12px">浏览器打开</button><button id="wedao-wb-x" style="background:#ef4444;color:#fff;border:0;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:12px">关闭</button></span>';
      var bodyEl = document.createElement('div');
      bodyEl.style.cssText = 'flex:1;display:flex;overflow:hidden';
      var side = document.createElement('div');
      side.style.cssText = 'width:190px;background:#0d1522;border-right:1px solid #1c2740;padding:10px;overflow:auto';
      FEATURES.forEach(function (ft) {
        var it = document.createElement('div');
        it.textContent = ft.name;
        it.title = ft.desc;
        it.style.cssText = 'padding:9px 10px;border-radius:8px;color:' + (ft.url ? '#dff6ff' : '#5c6b85') + ';font:600 13px "Microsoft YaHei",sans-serif;cursor:' + (ft.url ? 'pointer' : 'default') + ';margin-bottom:4px';
        if (ft.url) {
          it.onmouseenter = function () { it.style.background = 'rgba(34,211,238,.14)'; };
          it.onmouseleave = function () { it.style.background = 'transparent'; };
          it.onclick = function () { openPage(ft.url); };
        }
        side.appendChild(it);
      });
      var fr = document.createElement('iframe');
      fr.id = 'wedao-wb-frame';
      fr.src = BASE + FEATURES[0].url;
      fr.style.cssText = 'flex:1;border:0;background:#fff';
      bodyEl.appendChild(side); bodyEl.appendChild(fr);
      box.appendChild(bar); box.appendChild(bodyEl);
      document.body.appendChild(box);
      document.getElementById('wedao-wb-x').onclick = close;
      document.getElementById('wedao-wb-new').onclick = function () {
        var x = new XMLHttpRequest(); x.open('GET', BASE + '/open', true); x.send();
      };
      document.getElementById('wedao-wb-title').textContent = FEATURES[0].name;
    }

    // 捕获点击（绕过前端拦截）
    document.addEventListener('pointerdown', function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('#wedao-wb-nav')) {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); openPanel();
      }
    }, true);

    function findText(txt) {
      var all = document.querySelectorAll('button,a,div,li,span');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el.children.length === 0 && (el.textContent || '').trim() === txt) return el;
      }
      return null;
    }
    function addNav() {
      if (document.getElementById('wedao-wb-nav')) return;
      var anchor = findText('工具箱');
      if (!anchor) return;
      var row = anchor.closest('button,a,li') || anchor.parentElement;
      if (!row || !row.parentElement) return;
      var clone = row.cloneNode(true);
      clone.id = 'wedao-wb-nav';
      var texts = clone.querySelectorAll('span,div,p');
      var done = false;
      for (var k = 0; k < texts.length; k++) {
        if (texts[k].children.length === 0 && texts[k].textContent.trim()) { texts[k].textContent = 'AI 工作台'; done = true; break; }
      }
      if (!done) clone.textContent = 'AI 工作台';
      clone.style.cursor = 'pointer';
      row.parentElement.insertBefore(clone, row);
    }
    addNav();
    setInterval(addNav, 800);
  } catch (e) {}
})();

/* WEDAO_HIDE_DEV：客户版隐藏开发者入口，Ctrl+Shift+Alt+D 切换显示 */
(function () {
  try {
    if (typeof document === 'undefined') return;
    var HIDE_TEXTS = ['Remote', '工具箱', '连接插件'];
    var HIDDEN = true;
    var style = document.createElement('style');
    style.id = 'wedao-hide-dev-style';
    style.textContent = '.wedao-dev-hidden{display:none !important}';
    document.head.appendChild(style);

    function findRow(txt) {
      var all = document.querySelectorAll('button,a,div,li,span');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el.children.length === 0 && (el.textContent || '').trim().indexOf(txt) === 0) {
          return el.closest('button,a,li') || el.parentElement;
        }
      }
      return null;
    }
    function apply() {
      HIDE_TEXTS.forEach(function (t) {
        var row = findRow(t);
        if (!row) return;
        if (HIDDEN) row.classList.add('wedao-dev-hidden');
        else row.classList.remove('wedao-dev-hidden');
      });
    }
    function start() {
      apply();
      setInterval(apply, 1200);
      document.addEventListener('keydown', function (e) {
        if (e.ctrlKey && e.shiftKey && e.altKey && (e.key === 'D' || e.key === 'd')) {
          HIDDEN = !HIDDEN;
          apply();
        }
      }, true);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  } catch (e) {}
})();

/* WEDAO_HIDE_DEV_V2：隐藏连接插件 + 右下角九宫格 */
(function () {
  try {
    if (typeof document === 'undefined') return;
    function hideByText(txt) {
      var all = document.querySelectorAll('button,a,div,li,span');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el.children.length === 0 && (el.textContent || '').indexOf(txt) >= 0) {
          var row = el.closest('button,a,li') || el.parentElement;
          if (row) row.classList.add('wedao-dev-hidden');
        }
      }
    }
    function hideGrid() {
      var nodes = document.querySelectorAll('button,div,a');
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (el.id === 'wedao-wb-nav' || (el.closest && el.closest('#wedao-wb'))) continue;
        var cs = getComputedStyle(el);
        if (cs.position !== 'fixed') continue;
        var r = el.getBoundingClientRect();
        if (r.width < 20 || r.width > 80) continue;
        if (r.height < 20 || r.height > 80) continue;
        if (window.innerWidth - r.right > 40) continue;
        if (window.innerHeight - r.bottom > 40) continue;
        el.classList.add('wedao-dev-hidden');
      }
    }
    function apply() { hideByText('连接插件'); hideGrid(); }
    apply();
    setInterval(apply, 1200);
  } catch (e) {}
})();

/* WEDAO_HIDE_DEV_V3：按宽度向上查找整行再隐藏 */
(function () {
  try {
    if (typeof document === 'undefined') return;
    function hideRow(txt) {
      var all = document.querySelectorAll('button,a,div,li,span');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el.children.length > 0) continue;
        if ((el.textContent || '').indexOf(txt) < 0) continue;
        var node = el;
        for (var up = 0; up < 6 && node && node !== document.body; up++) {
          var r = node.getBoundingClientRect();
          if (r.width > 120) { node.classList.add('wedao-dev-hidden'); break; }
          node = node.parentElement;
        }
      }
    }
    function apply() { hideRow('连接插件'); }
    apply();
    setInterval(apply, 1000);
  } catch (e) {}
})();


/* WEDAO_MASK_FIX：只遮「连接插件」单行，严禁盖到大块区域 */
(function () {
  try {
    if (typeof document === 'undefined') return;
    function findLeaf(txt) {
      var all = document.querySelectorAll('span,div,p,button,a,li');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el.children.length > 0) continue;
        if ((el.textContent || '').trim().indexOf(txt) === 0) return el;
      }
      return null;
    }
    function apply() {
      var leaf = findLeaf('连接插件');
      var m = document.getElementById('mask-conn');
      if (!leaf) { if (m) m.remove(); return; }
      var node = leaf;
      var rect = null;
      for (var up = 0; up < 6 && node && node !== document.body; up++) {
        var r = node.getBoundingClientRect();
        if (r.height > 60) break;              // 太高就不是单行，停止
        if (r.width > 120 && r.height <= 56) { rect = r; break; }
        node = node.parentElement;
      }
      if (!rect || rect.width > 340) { if (m) m.remove(); return; }
      if (!m) { m = document.createElement('div'); m.id = 'mask-conn'; document.body.appendChild(m); }
      m.style.cssText = 'position:fixed;z-index:2147482000;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;background:#0b1220;pointer-events:none';
    }
    apply();
    setInterval(apply, 600);
  } catch (e) {}
})();

/* WEDAO_FAVICON：为道品牌图标与标题 */
(function () {
  try {
    if (typeof document === 'undefined') return;
    var ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiMyMmQzZWUiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM2MzY2ZjEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgcng9IjI4IiBmaWxsPSIjMGIxMjIwIi8+PHJlY3QgeD0iNiIgeT0iNiIgd2lkdGg9IjExNiIgaGVpZ2h0PSIxMTYiIHJ4PSIyNCIgZmlsbD0idXJsKCNnKSIgb3BhY2l0eT0iMC4xOCIvPjx0ZXh0IHg9IjY0IiB5PSI4NiIgZm9udC1zaXplPSI2NCIgZm9udC1mYW1pbHk9Ik1pY3Jvc29mdCBZYUhlaSwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0idXJsKCNnKSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+5Li6PC90ZXh0Pjwvc3ZnPg==';
    function apply() {
      try {
        document.title = '为道 WeDAO';
        var links = document.querySelectorAll('link[rel*="icon"]');
        for (var i = 0; i < links.length; i++) links[i].remove();
        var l = document.createElement('link');
        l.rel = 'icon'; l.type = 'image/svg+xml'; l.href = ICON;
        document.head.appendChild(l);
        var a = document.createElement('link');
        a.rel = 'apple-touch-icon'; a.href = ICON;
        document.head.appendChild(a);
        var m = document.createElement('meta');
        m.name = 'apple-mobile-web-app-title'; m.content = '为道';
        document.head.appendChild(m);
      } catch (e) {}
    }
    apply();
    setInterval(apply, 2000);
  } catch (e) {}
})();

/* WEDAO_GLOBAL_TECH */
(function(){
  if (typeof document === 'undefined') return;
  function inject(){
    if (document.getElementById('wedao-tech-style')) return;
    var st = document.createElement('style');
    st.id = 'wedao-tech-style';
    st.textContent = `
      body{background:radial-gradient(1200px 700px at 50% -12%,rgba(34,211,238,.10),transparent 60%),radial-gradient(900px 600px at 85% 20%,rgba(99,102,241,.08),transparent 62%),#05070d !important;}
      [class*="sidebar"],[class*="Sidebar"]{background:linear-gradient(180deg,rgba(12,20,34,.92),rgba(8,12,22,.96)) !important;border-right:1px solid rgba(120,200,255,.10) !important;backdrop-filter:blur(14px)}
      [class*="sidebar"] [class*="item"]:hover{background:rgba(34,211,238,.08) !important}
      [class*="composer"],[class*="Composer"],[class*="input"]{border-color:rgba(120,200,255,.16) !important}
      ::selection{background:rgba(34,211,238,.28)}
      .wedao-tech-glow{position:fixed;inset:0;pointer-events:none;z-index:0;
        background:radial-gradient(700px 400px at 50% 0%,rgba(34,211,238,.10),transparent 70%)}
    `;
    document.head.appendChild(st);
    if (!document.querySelector('.wedao-tech-glow')) {
      var d = document.createElement('div'); d.className = 'wedao-tech-glow';
      document.body.appendChild(d);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
  setInterval(inject, 2000);
})();
/* TAICORE_UPDATE_CHECK：通过本地服务代查新版本，提示下载（不依赖 Tauri 签名） */
(function () {
  try {
    if (typeof window === 'undefined' || window.__tcUpdateCheck) return;
    window.__tcUpdateCheck = true;
    var KEY = 'wedao_seen_version';
    var CHECK_URL = 'http://127.0.0.1:8799/update/check';

    function show(latest) {
      if (document.getElementById('wedao-update-toast')) return;
      var d = document.createElement('div');
      d.id = 'wedao-update-toast';
      d.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483000;max-width:300px;' +
        'background:linear-gradient(165deg,rgba(18,28,46,.97),rgba(10,16,28,.98));color:#e9f1ff;' +
        'border:1px solid rgba(34,211,238,.35);border-radius:14px;padding:14px 16px;font-size:13px;' +
        'box-shadow:0 16px 40px rgba(0,0,0,.55);font-family:"Microsoft YaHei",system-ui';
      d.innerHTML = '<div style="font-weight:800;margin-bottom:6px">发现新版本 ' + latest.version + '</div>' +
        '<div style="color:#8ba0bf;font-size:12px;margin-bottom:10px;line-height:1.6">' +
        String(latest.notes || '').slice(0, 60) + '</div>' +
        '<a href="' + latest.url + '" target="_blank" style="display:inline-block;padding:8px 16px;border-radius:9px;' +
        'background:linear-gradient(135deg,#22d3ee,#6366f1);color:#04121a;font-weight:800;text-decoration:none">立即下载</a>' +
        '<button id="wedao-update-later" style="margin-left:8px;background:transparent;border:1px solid rgba(120,200,255,.25);' +
        'color:#bff3ff;border-radius:9px;padding:8px 12px;cursor:pointer">稍后</button>';
      document.body.appendChild(d);
      document.getElementById('wedao-update-later').onclick = function () {
        try { localStorage.setItem(KEY, latest.version); } catch (e) {}
        d.remove();
      };
    }

    function check() {
      fetch(CHECK_URL, { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j || !j.ok || !j.latest || !j.latest.version) return;
          var latest = j.latest;
          var seen = '';
          try { seen = localStorage.getItem(KEY) || ''; } catch (e) {}
          if (!seen) { try { localStorage.setItem(KEY, latest.version); } catch (e) {} return; }
          if (seen !== latest.version) show(latest);
        })
        .catch(function () {});
    }

    setTimeout(check, 4000);
  } catch (e) {}
})();
