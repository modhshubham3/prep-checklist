/* Learning platform core: progress store, helpers, hash navigation, and the in-browser code runner.
   Modules (learn.js, lab.js, decide.js) register themselves in P.mods; platform.js owns Home and the router. */
(() => {
  const KEY = "prep-platform-v1";
  const S = { learn: {}, lab: {}, decide: {}, dry: {}, days: [] };
  try{
    const r = JSON.parse(localStorage.getItem(KEY));
    if(r && typeof r === "object") for(const k of Object.keys(S)) if(r[k] && typeof r[k] === (Array.isArray(S[k]) ? "object" : "object")) S[k] = r[k];
  }catch(e){}
  if(!Array.isArray(S.days)) S.days = [];

  const P = window.P = { S, mods: {} };
  P.save = () => { try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} };
  P.today = () => new Date().toLocaleDateString("en-CA");
  P.touchDay = () => { const t = P.today(); if(!S.days.includes(t)) S.days.push(t); S.days = S.days.slice(-400); P.save(); };
  P.streak = () => {
    const set = new Set(S.days), d = new Date(); let n = 0;
    if(!set.has(d.toLocaleDateString("en-CA"))) d.setDate(d.getDate() - 1);   // today not done yet doesn't break the streak
    while(set.has(d.toLocaleDateString("en-CA"))){ n++; d.setDate(d.getDate() - 1); }
    return n;
  };

  P.el = (tag, cls, text) => { const e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; };
  P.btn = (text, cls, fn) => { const b = P.el("button", cls || "pbtn", text); b.type = "button"; if(fn) b.addEventListener("click", fn); return b; };
  // Inline `code` and **bold** in lesson text — escaped first.
  P.rich = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  P.toast = m => { const t = document.getElementById("toast"); if(!t) return; t.textContent = m; t.classList.add("on"); clearTimeout(P._tt); P._tt = setTimeout(() => t.classList.remove("on"), 2200); };
  P.nav = (hash) => { if(location.hash !== hash){ try{ history.pushState(null, "", hash); }catch(e){ location.hash = hash; } } P.route && P.route(); };

  /* ---- Run learner code in a Web Worker: isolated from the page, killed after a timeout (infinite loops) ---- */
  const WORKER_SRC = `
    const fmt = v => { try{ if(typeof v === "string") return v; if(v === undefined) return "undefined"; if(typeof v === "function") return "[function]"; return JSON.stringify(v); }catch(e){ return String(v); } };
    onmessage = e => {
      const { code, fn, tests } = e.data, logs = [];
      const log = (...a) => { logs.push(a.map(fmt).join(" ")); if(logs.length > 200) logs.length = 200; };
      const con = { log, info: log, warn: log, error: log };
      try{
        const f = new Function("console", code + "\\n;return " + (fn ? "(typeof " + fn + " === 'function' ? " + fn + " : undefined)" : "undefined") + ";")(con);
        if(!fn){ postMessage({ logs }); return; }
        if(!f){ postMessage({ logs, error: "Function " + fn + " define nahi hua — naam same rakho: " + fn }); return; }
        const results = tests.map(t => {
          try{
            const got = f(...JSON.parse(JSON.stringify(t.args)));
            return { ok: JSON.stringify(got) === JSON.stringify(t.expect), got: fmt(got) };
          }catch(err){ return { ok: false, err: String((err && err.message) || err) }; }
        });
        postMessage({ logs, results });
      }catch(err){ postMessage({ logs, error: String((err && err.message) || err) }); }
    };`;
  P.run = (code, opts = {}) => new Promise(resolve => {
    let w, url, done = false, timer;
    const finish = r => { if(done) return; done = true; clearTimeout(timer); try{ w.terminate(); }catch(e){} try{ URL.revokeObjectURL(url); }catch(e){} resolve(r); };
    try{
      url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
      w = new Worker(url);
    }catch(e){ return resolve({ logs: [], error: "Is browser mein code chalane ki suvidha nahi hai (Web Worker band hai)." }); }
    timer = setTimeout(() => finish({ logs: [], error: "Time out (3 sec) — kya koi loop kabhi khatam nahi ho raha? Loop ki condition dekho." }), opts.ms || 3000);
    w.onmessage = e => finish(e.data);
    w.onerror = e => finish({ logs: [], error: e.message || "Code mein error hai" });
    w.postMessage({ code, fn: opts.fn || null, tests: opts.tests || [] });
  });

  // Textarea that behaves like a code editor: Tab inserts 2 spaces, Enter keeps indentation.
  P.codeBox = (value, rows) => {
    const ta = P.el("textarea", "code-ta"); ta.value = value || ""; ta.rows = rows || 12; ta.spellcheck = false;
    ta.setAttribute("autocapitalize", "off"); ta.setAttribute("autocomplete", "off"); ta.setAttribute("autocorrect", "off");
    ta.addEventListener("keydown", e => {
      if(e.key === "Tab"){ e.preventDefault(); const s = ta.selectionStart; ta.value = ta.value.slice(0, s) + "  " + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 2; ta.dispatchEvent(new Event("input")); }
      else if(e.key === "Enter"){
        const s = ta.selectionStart, line = ta.value.slice(0, s).split("\n").pop(), ind = (/^\s*/.exec(line) || [""])[0] + (/[{(\[]\s*$/.test(line) ? "  " : "");
        e.preventDefault(); ta.value = ta.value.slice(0, s) + "\n" + ind + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 1 + ind.length; ta.dispatchEvent(new Event("input"));
      }
    });
    return ta;
  };

  P.header = (title, back, sub) => {
    const h = P.el("div", "mod-head");
    if(back) h.appendChild(P.btn("‹ " + back.label, "pback", () => P.nav(back.hash)));
    h.appendChild(P.el("h2", null, title));
    if(sub) h.appendChild(P.el("p", "mod-sub", sub));
    return h;
  };
})();
