// 钛核 TAICORE 客户端授权（浏览器半边）
// 功能：读取本机保存的授权码 → WebCrypto 验签（RS256）→ 显示状态；提供粘贴激活的浮层。
window.__ModuleLoader__.load({
  id: "taicore-license",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    // 服务端公钥（SPKI base64）——只用于验签，泄露无害
    const PUBKEY_B64 = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu+ifY358Gb6miEa76trw4CzCu9EB8QGC8QjK8yZgpvvS5xTnvJVJywXlx+6lcKvrT4htNt0zKvQBx2ON6jVqQRW15raEZKO45kb6LnmPnVAwFXuMnVIuwOPnDP4ACzMouL7HYEmpoQfN1V+diiesRi+u28G8JiJ6nYkTezvqucThAecDrywGvXira4R1IjJIM7p2/4sMEYRRJPKrqGY4Nb2mlo9mMGnPSVDyBAuPD0NFu7YsEBEx56epQF9TqxrHN73bTuodk+LOeygqEGXFZJdhYtqBjwjAwp4PhD+wc+Oz+oJ+qRP4x+BKYXYf37OJ96K6ej9teeWQdNM+hq9rtwIDAQAB";
    const EC_PUBKEY_B64 = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAErFiQCpMXhQJwDOB2IU6qX2faECqPZoOEXFgNTp3dN2fEv2oUUG4QTUFGI4wLuEuQiE7zxdcyPybPvt7S6KWyfA==";
    const STORE_KEY = "taicore.license";
    const STYLE_ID = "taicore-license-style";

    function b64ToBytes(b64) {
      let s = String(b64 || "").replace(/-/g, "+").replace(/_/g, "/");
      while (s.length % 4) s += "=";
      const bin = atob(s);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    const PLAN_NAME = { 1: "个人版", 2: "商家版", 3: "企业版", 9: "授权版" };
    function normalizePayload(p) {
      if (p && typeof p.p === "number") return { plan: PLAN_NAME[p.p] || "授权版", exp: p.e, seats: p.s };
      return p || {};
    }
    function b64urlToJson(s) {
      return JSON.parse(new TextDecoder().decode(b64ToBytes(s)));
    }

    async function verify(token) {
      try {
        const raw = String(token || "").trim();
        if (!raw) return { ok: false, reason: "授权码为空" };

        // 新格式：TC1.<payload>.<sig>（ECDSA P-256）
        if (raw.slice(0, 4) === "TC1.") {
          const parts = raw.split(".");
          if (parts.length !== 3) return { ok: false, reason: "格式不正确" };
          const key = await crypto.subtle.importKey(
            "spki",
            b64ToBytes(EC_PUBKEY_B64),
            { name: "ECDSA", namedCurve: "P-256" },
            false,
            ["verify"]
          );
          const ok = await crypto.subtle.verify(
            { name: "ECDSA", hash: "SHA-256" },
            key,
            b64ToBytes(parts[2]),
            new TextEncoder().encode("TC1." + parts[1])
          );
          if (!ok) return { ok: false, reason: "签名无效" };
          const payload = normalizePayload(b64urlToJson(parts[1]));
          if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return { ok: false, reason: "已过期", payload };
          }
          return { ok: true, payload };
        }

        // 旧格式：JWT（RS256）
        const parts = raw.split(".");
        if (parts.length !== 3) return { ok: false, reason: "格式不正确" };
        const key = await crypto.subtle.importKey(
          "spki",
          b64ToBytes(PUBKEY_B64),
          { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
          false,
          ["verify"]
        );
        const ok = await crypto.subtle.verify(
          "RSASSA-PKCS1-v1_5",
          key,
          b64ToBytes(parts[2]),
          new TextEncoder().encode(parts[0] + "." + parts[1])
        );
        if (!ok) return { ok: false, reason: "签名无效" };
        const payload = b64urlToJson(parts[1]);
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
          return { ok: false, reason: "已过期", payload };
        }
        return { ok: true, payload };
      } catch (e) {
        return { ok: false, reason: "校验失败：" + e.message };
      }
    }

    function fmtDate(ts) {
      if (!ts) return "长期";
      const d = new Date(ts * 1000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    const CSS = `
      #tc-license-btn{position:fixed;right:6px;top:50%;transform:translateY(-50%);z-index:2147483000;display:flex;align-items:center;gap:6px;
        padding:7px 10px;border-radius:999px 0 0 999px;border:1px solid rgba(0,224,255,.35);background:rgba(10,16,28,.92);
        color:#E8EEF9;font:600 12px/1 "Segoe UI","Microsoft YaHei",sans-serif;cursor:pointer;
        box-shadow:0 8px 28px rgba(0,0,0,.45);backdrop-filter:blur(8px)}
      #tc-license-btn i{width:7px;height:7px;border-radius:50%;background:#FF4D5E;box-shadow:0 0 10px #FF4D5E}
      #tc-license-btn.on i{background:#22D3A5;box-shadow:0 0 10px #22D3A5}
      #tc-license-mask{position:fixed;inset:0;z-index:2147483001;background:rgba(3,6,12,.72);display:none;
        align-items:center;justify-content:center;backdrop-filter:blur(4px)}
      #tc-license-mask.show{display:flex}
      .tc-card{width:min(520px,92vw);background:#0E1422;border:1px solid #1E2A42;border-radius:18px;padding:26px;color:#E8EEF9;
        font:14px/1.7 "Segoe UI","Microsoft YaHei",sans-serif;box-shadow:0 30px 80px rgba(0,0,0,.6)}
      .tc-card h3{margin:0 0 6px;font-size:18px}
      .tc-card p{margin:0 0 14px;color:#9AA7BD;font-size:13px}
      .tc-card textarea{width:100%;height:96px;background:#080C15;border:1px solid #1C2740;border-radius:10px;
        color:#BFD8EA;padding:10px;font:12px/1.6 ui-monospace,Consolas,monospace;resize:vertical;box-sizing:border-box}
      .tc-row{display:flex;gap:10px;justify-content:flex-end;margin-top:14px}
      .tc-btn{padding:10px 16px;border-radius:10px;border:1px solid #26344F;background:rgba(255,255,255,.04);
        color:#E8EEF9;font-weight:600;cursor:pointer}
      .tc-btn.primary{background:linear-gradient(135deg,#00E0FF,#7A5CFF);color:#04121A;border:0}
      .tc-state{margin-top:12px;font-size:12.5px;color:#9AA7BD}
      .tc-state.err{color:#FF4D5E}
      .tc-state.ok{color:#22D3A5}`;

    function injectStyle() {
      if (document.getElementById(STYLE_ID)) return;
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = CSS;
      document.head.appendChild(s);
    }

    function buildUI() {
      if (document.getElementById("tc-license-btn")) return;
      const btn = document.createElement("button");
      btn.id = "tc-license-btn";
      btn.innerHTML = '<i></i><span>未授权</span>';
      btn.addEventListener("click", openModal);
      document.body.appendChild(btn);

      const mask = document.createElement("div");
      mask.id = "tc-license-mask";
      mask.innerHTML = `
        <div class="tc-card">
          <h3>钛核 TAICORE 授权</h3>
          <p>把购买后收到的授权码粘贴到下面，点击「激活」。授权码在本机离线校验，不会上传。</p>
          <textarea id="tc-license-input" placeholder="tc.eyJhbGciOi..."></textarea>
          <div class="tc-state" id="tc-license-state"></div>
          <div class="tc-row">
            <button class="tc-btn" id="tc-license-close">关闭</button>
            <button class="tc-btn primary" id="tc-license-save">激活</button>
          </div>
        </div>`;
      mask.addEventListener("click", (e) => {
        if (e.target === mask) mask.classList.remove("show");
      });
      document.body.appendChild(mask);

      mask.querySelector("#tc-license-close").addEventListener("click", () => mask.classList.remove("show"));
      mask.querySelector("#tc-license-save").addEventListener("click", onSave);
    }

    function openModal() {
      const mask = document.getElementById("tc-license-mask");
      const input = document.getElementById("tc-license-input");
      input.value = localStorage.getItem(STORE_KEY) || "";
      document.getElementById("tc-license-state").textContent = "";
      document.getElementById("tc-license-state").className = "tc-state";
      mask.classList.add("show");
    }

    async function onSave() {
      const input = document.getElementById("tc-license-input");
      const state = document.getElementById("tc-license-state");
      const token = input.value.trim();
      state.className = "tc-state";
      state.textContent = "校验中…";
      const r = await verify(token);
      if (!r.ok) {
        state.className = "tc-state err";
        state.textContent = "激活失败：" + r.reason;
        return;
      }
      localStorage.setItem(STORE_KEY, token);
      state.className = "tc-state ok";
      state.textContent = `激活成功：${r.payload.plan} 版，有效期至 ${fmtDate(r.payload.exp)}`;
      await refreshButton();
      setTimeout(() => document.getElementById("tc-license-mask").classList.remove("show"), 1200);
    }

    async function refreshButton() {
      const btn = document.getElementById("tc-license-btn");
      if (!btn) return;
      const token = localStorage.getItem(STORE_KEY);
      const label = btn.querySelector("span");
      if (!token) {
        btn.classList.remove("on");
        label.textContent = "未授权";
        return;
      }
      const r = await verify(token);
      if (r.ok) {
        btn.classList.add("on");
        label.textContent = `${r.payload.plan} · 至 ${fmtDate(r.payload.exp)}`;
      } else {
        btn.classList.remove("on");
        label.textContent = r.reason === "已过期" ? "授权已过期" : "授权无效";
      }
    }

    function apply(ctx) {
      injectStyle();
      buildUI();
      refreshButton();
      // 定期刷新（跨天过期提示）
      setInterval(refreshButton, 60 * 1000);
    }

    exports.apply = apply;
    exports.inject = [];
    exports.verify = verify;
    return module.exports;
  },
});
