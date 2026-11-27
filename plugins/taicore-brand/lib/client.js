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
      { name: 'AI 一键出图', url: 'http://127.0.0.1:8793/', desc: '上传商品图 → 主图 + 详情页' },
      { name: '主图设计器', url: 'http://127.0.0.1:8793/', desc: '拖拽排版 · 描边 · 导出 PNG' },
      { name: 'AI 员工团队', url: 'http://127.0.0.1:8796/', desc: '圆桌会议 · 单聊 · 团队任务流水线' },
      { name: '视频工坊', url: 'http://127.0.0.1:8790/', desc: 'AI 配图 + 文案 + 配音 + 自动成片' },
      { name: '获客助手', url: 'http://127.0.0.1:8792/', desc: '评论意向 · 回复草稿 · 线索' },
      { name: '获客设置', url: 'http://127.0.0.1:8792/profile', desc: '行业 · 门店 · 产品档案' },
      { name: '客服助手', url: 'http://127.0.0.1:8792/profile', desc: '话术库 · 售后处理（配置中）' },
      { name: '用量中心', url: '', desc: '即将上线' }
    ];
    var BASE = 'http://127.0.0.1:8793';

    function close() { var p = document.getElementById('wedao-wb'); if (p) p.remove(); }
    // TAICORE_ENSURE_SVC：打开工具前先确保对应服务已启动
    var SVC_BY_PORT = { '8793': 'img', '8790': 'video', '8796': 'team', '8792': 'huoke', '8800': 'account', '8799': 'account' };
    function ensureSvc(url, cb) {
      var m = /:(\d{4})/.exec(url || '');
      var name = m && SVC_BY_PORT[m[1]];
      if (!name) { cb(); return; }
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; cb(); } }, 4000);
      fetch('http://127.0.0.1:8799/ensure?name=' + name, { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function () { setTimeout(function () { if (!done) { done = true; clearTimeout(t); cb(); } }, 700); })
        .catch(function () { if (!done) { done = true; clearTimeout(t); cb(); } });
    }

    function openPage(url) {
      var f = document.getElementById('wedao-wb-frame');
      var real = /^https?:/.test(url) ? url : (BASE + url);
      if (f) f.src = 'about:blank';
      ensureSvc(real, function () { if (f) f.src = real; });
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
      fr.src = /^https?:/.test(FEATURES[0].url) ? FEATURES[0].url : (BASE + FEATURES[0].url);
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

/* TAICORE_TECH_V2：强制深色 + 科技感主题（不改 DOM，只改渲染模式与配色） */
(function () {
  try {
    if (typeof window === 'undefined' || window.__tcTechV1) return;
    window.__tcTechV1 = true;

    /* ① 强制深色：拦截 prefers-color-scheme，让应用按深色调色板渲染 */
    try {
      var native = window.matchMedia ? window.matchMedia.bind(window) : null;
      if (native) {
        var fake = function (q) {
          var mql = null;
          try { mql = native(q); } catch (e) {}
          return {
            media: q, matches: true, onchange: null,
            addEventListener: function (t, fn) { if (mql && mql.addEventListener) mql.addEventListener(t, fn); },
            removeEventListener: function (t, fn) { if (mql && mql.removeEventListener) mql.removeEventListener(t, fn); },
            addListener: function (fn) { if (mql && mql.addListener) mql.addListener(fn); },
            removeListener: function (fn) { if (mql && mql.removeListener) mql.removeListener(fn); },
            dispatchEvent: function () { return true; },
          };
        };
        window.matchMedia = function (q) {
          var s = String(q || '');
          if (/prefers-color-scheme\s*:\s*dark/i.test(s)) return fake(s);
          if (/prefers-color-scheme\s*:\s*light/i.test(s)) return fake(s.replace(/light/i, 'dark'));
          return native(q);
        };
      }
    } catch (e) {}

    /* ② 科技感配色（只改颜色/背景/圆角阴影，不动布局与控件尺寸） */
    var CSS = [
      ':root{--tc-cyan:#22d3ee;--tc-gold:#f3c04a;--tc-line:rgba(120,200,255,.10);--tc-card:rgba(13,21,36,.72)}',
      'html{color-scheme:dark !important}',
      'body{background:radial-gradient(1200px 700px at 18% -10%,rgba(34,211,238,.10),transparent 60%),radial-gradient(900px 600px at 90% 0%,rgba(99,102,241,.10),transparent 55%),linear-gradient(180deg,#05070d,#070b14 60%,#05070d) !important}',
      '[class*="topbar"],[class*="titlebar"],[class*="toolbar"]{background:rgba(6,10,18,.72) !important;border-bottom:1px solid var(--tc-line) !important;backdrop-filter:blur(10px)}',
      '[class*="sidebar"],[class*="Sidebar"]{background:linear-gradient(180deg,rgba(10,18,32,.86),rgba(6,10,18,.92)) !important;border-right:1px solid var(--tc-line) !important;backdrop-filter:blur(12px)}',
      '[class*="card"],[class*="Card"],[class*="panel"],[class*="Panel"]{background:var(--tc-card) !important;border:1px solid var(--tc-line) !important;box-shadow:0 10px 30px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.03) !important}',
      '[class*="sidebar"] a:hover,[class*="sidebar"] button:hover{background:rgba(34,211,238,.08) !important}',
      '::selection{background:rgba(34,211,238,.25)}',
      '*::-webkit-scrollbar{width:8px;height:8px}',
      '*::-webkit-scrollbar-thumb{background:rgba(120,200,255,.18);border-radius:8px}',
      '*::-webkit-scrollbar-thumb:hover{background:rgba(34,211,238,.35)}',
      '*::-webkit-scrollbar-track{background:transparent}',
      'body::before{content:"";position:fixed;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(34,211,238,.55),rgba(243,192,74,.35),transparent);z-index:9999;pointer-events:none}',
    ].join('\n');

    function applyCss() {
      if (document.getElementById('tc-tech-v1')) return;
      var st = document.createElement('style');
      st.id = 'tc-tech-v1';
      st.textContent = CSS;
      (document.head || document.documentElement).appendChild(st);
    }
    applyCss();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyCss);
  } catch (e) {}
})();

/* TAICORE_MOBILE_FRESH：手机端独立启动（不继承桌面“上次会话”，避免连到已释放会话导致回退） */
(function () {
  try {
    if (typeof window === 'undefined' || window.__tcMobileFresh) return;
    var ua = String(navigator.userAgent || '');
    if (!/Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(ua)) return;  // 仅手机
    window.__tcMobileFresh = true;

    // 每次页面加载清掉“上次会话”指针，让手机从工作区选择开始（独立于电脑）
    try {
      var KEY = 'dsh.sessions.current';
      if (localStorage.getItem(KEY) !== null) localStorage.removeItem(KEY);
    } catch (e) {}

    // 若仍进入“选择工作区”，自动打开侧栏并选中第一个会话（尽力而为）
    var tries = 0;
    function nudge() {
      tries++;
      var body = document.body ? document.body.innerText : '';
      if (!/Choose a workspace|选择一个工作区/i.test(body)) return;
      var sidebarBtn = document.querySelector('button[aria-label="Open sidebar"]');
      if (sidebarBtn) {
        sidebarBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', nudge); else nudge();
    var iv = setInterval(function () { nudge(); if (tries > 12) clearInterval(iv); }, 1200);
  } catch (e) {}
})();


/* TAICORE_LICENSE_ALWAYS：我们的发行版默认已授权（避免显示"未授权"） */
(function () {
  try {
    if (typeof document === 'undefined') return;
    function fix() {
      var btn = document.getElementById('tc-license-btn');
      if (!btn) return;
      var sp = btn.querySelector('span');
      if (sp && sp.textContent.trim() !== '已授权') {
        sp.textContent = '已授权';
        btn.style.background = 'rgba(34,211,238,.14)';
        btn.style.color = '#8ff0ff';
        btn.style.border = '1px solid rgba(34,211,238,.4)';
      }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fix); else fix();
    setInterval(fix, 1200);
  } catch (e) {}
})();

/* TAICORE_LOGIN_GATE：发行版启动先登录（手机号+验证码），替代授权码
   仅在 WeDAO 安装版生效（通过 service-manager /whoami 判断，cwd 含 WeDAO） */
(function () {
  try {
    if (typeof window === 'undefined' || window.__wedaoGateV2) return;
    window.__wedaoGateV2 = true;
    var KEY = 'wedao_token';
    var ACC = 'http://127.0.0.1:8800';

    function token() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }

    function overlay() {
      if (document.getElementById('wedao-login-layer')) return;
      var d = document.createElement('div');
      d.id = 'wedao-login-layer';
      d.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#05070d;display:flex;align-items:center;justify-content:center';
      var f = document.createElement('iframe');
      f.src = ACC + '/';
      f.style.cssText = 'width:100%;height:100%;border:0;background:#05070d';
      d.appendChild(f);
      document.body.appendChild(d);
      window.addEventListener('message', function (e) {
        var m = e.data || {};
        if (m.type === 'wedao-login' && m.token) {
          try { localStorage.setItem(KEY, m.token); } catch (err) {}
          d.remove();
        }
      });
    }

    async function verify() {
      var t = token();
      if (!t) { overlay(); return; }
      try {
        var r = await fetch(ACC + '/api/auth/me', { headers: { Authorization: 'Bearer ' + t } });
        var j = await r.json();
        if (!j.ok) { try { localStorage.removeItem(KEY); } catch (e) {} overlay(); }
      } catch (e) {
        // 账号服务未起：先放行，避免打不开
      }
    }

    fetch('http://127.0.0.1:8799/whoami', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.product === 'wedao') setTimeout(verify, 1200);
      })
      .catch(function () {});
  } catch (e) {}
})();

/* TAICORE_AVATAR_BRAND：把所有"鲸鱼"形状的头像/图标替换成品牌 ∞ */
(function () {
  try {
    if (window.__tcAvatarBrand) return;
    window.__tcAvatarBrand = true;
    var BRAND = 'data:image/png;base64,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';
    var WHALE_PREFIX = 'M65.3 20.9';

    function swap() {
      var paths = document.querySelectorAll('svg path');
      for (var i = 0; i < paths.length; i++) {
        var d = paths[i].getAttribute('d') || '';
        if (d.indexOf(WHALE_PREFIX) !== 0) continue;
        var svg = paths[i].ownerSVGElement || paths[i].parentNode;
        if (!svg || svg.dataset.tcBrand) continue;
        svg.dataset.tcBrand = '1';
        var img = document.createElement('img');
        img.src = BRAND;
        img.alt = '为道';
        img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;border-radius:24%';
        try { svg.parentNode.replaceChild(img, svg); } catch (e) {}
      }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', swap);
    else swap();
    setInterval(swap, 700);
  } catch (e) {}
})();

/* TAICORE_AVATAR_BRAND2：把所有"角色形状"头像替换成品牌 ∞ */
(function () {
  try {
    if (window.__tcAvatarBrand2) return;
    window.__tcAvatarBrand2 = true;
    var BRAND = 'data:image/png;base64,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';
    // ds-bot CHARACTERS 各形状的 path 前缀
    var PREFIXES = ['M65.3 20.9', 'M40.1 4.4', 'M45.8 4.2', 'M46.1 4l', 'M54.5 4.2', 'M77 4.4', 'M38.8 4.2'];

    function isAvatarPath(d) {
      for (var i = 0; i < PREFIXES.length; i++) {
        if (d.indexOf(PREFIXES[i]) === 0) return true;
      }
      return false;
    }

    function swap() {
      var paths = document.querySelectorAll('svg path');
      for (var i = 0; i < paths.length; i++) {
        var d = paths[i].getAttribute('d') || '';
        if (!isAvatarPath(d)) continue;
        var svg = paths[i].ownerSVGElement || paths[i].parentNode;
        if (!svg || svg.dataset.tcBrand) continue;
        // 只替换头像尺寸的 svg（避免误伤正文图标）
        var vb = (svg.getAttribute('viewBox') || '').split(/\s+/);
        var w = parseFloat(vb[2] || '0');
        var size = svg.getBoundingClientRect ? svg.getBoundingClientRect().width : 0;
        if (w && w < 40) continue;
        if (size && size < 18) continue;
        svg.dataset.tcBrand = '1';
        var img = document.createElement('img');
        img.src = BRAND;
        img.alt = '为道';
        img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;border-radius:24%';
        try { svg.parentNode.replaceChild(img, svg); } catch (e) {}
      }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', swap);
    else swap();
    setInterval(swap, 700);
  } catch (e) {}
})();

/* TAICORE_BRAND3：头像/账户/小图标统一金色 ∞（透明底，适配深色界面） */
(function () {
  try {
    if (window.__tcBrand3) return;
    window.__tcBrand3 = true;
    var BRAND = 'data:image/png;base64,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';
    var PREFIXES = ['M65.3 20.9', 'M40.1 4.4', 'M45.8 4.2', 'M46.1 4l', 'M54.5 4.2', 'M77 4.4', 'M38.8 4.2'];

    function markImg(size) {
      var img = document.createElement('img');
      img.src = BRAND;
      img.alt = '为道';
      img.style.cssText = 'width:' + (size || '100%') + ';height:' + (size || '100%') + ';object-fit:contain;display:block;background:transparent';
      return img;
    }

    function swap() {
      // 1) 角色形状 svg → 透明 ∞
      var paths = document.querySelectorAll('svg path');
      for (var i = 0; i < paths.length; i++) {
        var d = paths[i].getAttribute('d') || '';
        var hit = false;
        for (var k = 0; k < PREFIXES.length; k++) if (d.indexOf(PREFIXES[k]) === 0) { hit = true; break; }
        if (!hit) continue;
        var svg = paths[i].ownerSVGElement || paths[i].parentNode;
        if (!svg || svg.dataset.tcBrand3) continue;
        var vb = (svg.getAttribute('viewBox') || '').split(/\s+/);
        var vw = parseFloat(vb[2] || '0');
        var box = svg.getBoundingClientRect();
        if ((vw && vw < 40) || (box.width && box.width < 14)) continue;
        svg.dataset.tcBrand3 = '1';
        try { svg.parentNode.replaceChild(markImg('100%'), svg); } catch (e) {}
      }

      // 2) 账户头像容器：去掉深色底 + 中心显示 ∞
      document.querySelectorAll('.bt-you, .bt-mark').forEach(function (el) {
        if (el.dataset.tcBrand3) return;
        el.dataset.tcBrand3 = '1';
        el.style.background = 'transparent';
        el.style.boxShadow = 'none';
        if (el.classList.contains('bt-you') && !el.querySelector('img[data-tc]')) {
          el.innerHTML = '';
          var im = markImg('28px');
          im.setAttribute('data-tc', '1');
          el.appendChild(im);
        }
      });

      // 3) 所有 bt-mark 里的 img 缩放到容器
      document.querySelectorAll('.bt-mark img').forEach(function (im) {
        im.style.width = '100%'; im.style.height = '100%'; im.style.objectFit = 'contain';
      });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', swap); else swap();
    setInterval(swap, 600);
  } catch (e) {}
})();

/* TAICORE_TITLEBAR_ICON：标题栏左上角图标也换成 ∞ */
(function () {
  try {
    var BRAND = 'data:image/png;base64,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';
    function fix() {
      document.querySelectorAll('svg').forEach(function (s) {
        var r = s.getBoundingClientRect();
        if (!r.width || r.width > 32 || r.width < 12) return;
        if (r.top > 40 || r.left > 80) return;
        if (s.dataset.tcTitle) return;
        s.dataset.tcTitle = '1';
        var im = document.createElement('img');
        im.src = BRAND; im.alt = '为道';
        im.style.cssText = 'width:18px;height:18px;object-fit:contain;display:block';
        try { s.parentNode.replaceChild(im, s); } catch (e) {}
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fix); else fix();
    setInterval(fix, 800);
  } catch (e) {}
})();
/* TAICORE_AGENT_AVA：DSH Agent 头像换成 ∞ */
(function () {
  try {
    var BRAND = 'data:image/png;base64,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';
    function fix() {
      document.querySelectorAll('.bt-agent-ava').forEach(function (box) {
        if (box.dataset.tcAva) return;
        box.dataset.tcAva = '1';
        box.innerHTML = '';
        var im = document.createElement('img');
        im.src = BRAND; im.alt = '为道';
        im.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;background:transparent';
        box.appendChild(im);
        box.style.background = 'transparent';
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fix); else fix();
    setInterval(fix, 700);
  } catch (e) {}
})();
/* TAICORE_HIDE_REMOTE：隐藏残留的 Remote 黑块 */
(function () {
  try {
    if (document.getElementById('tc-hide-remote')) return;
    var st = document.createElement('style');
    st.id = 'tc-hide-remote';
    st.textContent = '.dshRemoteSidebarEntry{display:none !important}';
    (document.head || document.documentElement).appendChild(st);
    setInterval(function () {
      if (!document.getElementById('tc-hide-remote')) (document.head || document.documentElement).appendChild(st);
    }, 2000);
  } catch (e) {}
})();