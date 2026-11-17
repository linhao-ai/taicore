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
        if (credEls.length) {
          const el = credEls[0];
          el.dataset.tcCred = "1";
          const tip = document.createElement("div");
          tip.className = "taicore-cred-tip";
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
