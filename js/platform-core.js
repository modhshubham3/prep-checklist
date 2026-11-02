/* Learning platform core: progress store, helpers, hash navigation, and the in-browser code runner.
   Modules (learn.js, lab.js, decide.js) register themselves in P.mods; platform.js owns Home and the router. */
(() => {
  const KEY = "prep-platform-v1";
  const S = { learn: {}, lab: {}, decide: {}, dry: {}, days: [], act: {}, last: null, ledger: {}, dayq: null };
  const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
  // Stored data may be hand-edited, truncated or from an older build: every field is coerced to its expected type (or dropped).
  const SHAPE = {
    learn: { pos: "n", at: "n", predicted: "n", right: "b", finished: "b", done: "b" },
    lab: { runs: "n", hints: "n", ai: "n", aiTexts: "a", approach: "s", code: "s", lastRun: "s", solved: "b", clean: "b", shown: "b", t: "n" },
    decide: { choice: "n", reason: "s", t: "n", right: "b" },
    dry: { right: "b", d: "s", pick: "n" },
  };
  const fin = v => typeof v === "number" && isFinite(v);
  function cleanEntry(e, shape){
    const o = {};
    for(const k of Object.keys(e)){
      const t = shape[k], v = e[k];
      if(!t) continue;                                  // unknown field: drop
      if(t === "n" && fin(v)) o[k] = Math.max(0, Math.floor(v));
      else if(t === "s" && typeof v === "string") o[k] = v;
      else if(t === "b" && typeof v === "boolean") o[k] = v;
      else if(t === "a" && Array.isArray(v)) o[k] = v.filter(x => typeof x === "string");
    }
    return o;
  }
  function cleanMap(m, shape, need){
    const out = {};
    if(!isObj(m)) return out;
    for(const id of Object.keys(m)){ if(!isObj(m[id])) continue; const e = cleanEntry(m[id], shape); if(need && !need(e)) continue; out[id] = e; }
    return out;
  }
  function sanitize(r){
    const o = {};
    o.learn = cleanMap(r.learn, SHAPE.learn);
    o.lab = cleanMap(r.lab, SHAPE.lab); Object.values(o.lab).forEach(e => { if(e.hints > 3) e.hints = 3; });
    o.decide = cleanMap(r.decide, SHAPE.decide, e => fin(e.choice) && typeof e.reason === "string");
    o.dry = cleanMap(r.dry, SHAPE.dry);
    o.days = Array.isArray(r.days) ? r.days.filter(d => typeof d === "string" && /^\d{4}-\d\d-\d\d$/.test(d)).slice(-400) : [];
    o.act = {};
    if(isObj(r.act)) for(const d of Object.keys(r.act)){ if(!/^\d{4}-\d\d-\d\d$/.test(d) || !isObj(r.act[d])) continue; const a = r.act[d]; o.act[d] = { learn: fin(a.learn) ? Math.max(0, a.learn) : 0, code: fin(a.code) ? Math.max(0, a.code) : 0, mind: fin(a.mind) ? Math.max(0, a.mind) : 0 }; }
    const l = r.last;
    o.last = isObj(l) && (l.kind === "learn" || l.kind === "lab") && typeof l.id === "string" && l.id && typeof l.title === "string" && l.title ? {
      kind: l.kind, id: l.id, title: l.title, icon: typeof l.icon === "string" ? l.icon : "▶", hue: fin(l.hue) ? l.hue : 200,
      pos: fin(l.pos) ? Math.max(0, Math.floor(l.pos)) : 0, total: fin(l.total) && l.total >= 1 ? Math.floor(l.total) : 1, runs: fin(l.runs) ? Math.max(0, Math.floor(l.runs)) : 0, t: fin(l.t) ? l.t : 0,
    } : null;
    o.ledger = {};
    if(isObj(r.ledger)) for(const d of Object.keys(r.ledger)){ if(!isObj(r.ledger[d])) continue; const b = {}; for(const k of Object.keys(r.ledger[d])) if(fin(r.ledger[d][k])) b[k] = r.ledger[d][k]; o.ledger[d] = b; }
    o.dayq = isObj(r.dayq) && typeof r.dayq.d === "string" && typeof r.dayq.id === "string" ? { d: r.dayq.d, id: r.dayq.id, pick: fin(r.dayq.pick) ? r.dayq.pick : null, prev: typeof r.dayq.prev === "string" ? r.dayq.prev : "", drill: typeof r.dayq.drill === "string" ? r.dayq.drill : "" } : null;
    return o;
  }
  try{
    const r = JSON.parse(localStorage.getItem(KEY));
    if(isObj(r)) Object.assign(S, sanitize(r));
  }catch(e){}

  const P = window.P = { S, mods: {} };
  // Saving marks every hidden screen stale: it re-renders lazily when next shown. The visible one updates itself.
  // A failed write (storage full / blocked) warns once per session; every later save simply tries again.
  let warned = false;
  P.save = () => {
    try{ localStorage.setItem(KEY, JSON.stringify(S)); P.saveFailed = false; }
    catch(e){
      P.saveFailed = true;
      if(!warned){ warned = true; P.toast("Progress save nahi ho pa raha — storage bhar gayi ya band hai", 6000); }
    }
    document.querySelectorAll("#platform .mod:not(.on)").forEach(m => { m._dirty = true; });
  };
  P.today = () => new Date().toLocaleDateString("en-CA");
  P.touchDay = () => { const t = P.today(); if(!S.days.includes(t)) S.days.push(t); S.days = S.days.slice(-400); P.save(); };
  /* Daily activity, like a fitness tracker: three rings with a goal each (points: lesson step / code run / decision ...). */
  P.GOALS = { learn: 3, code: 4, mind: 2 };
  /* Ring points are earned once per item, not per click. A small ledger in S.ledger remembers what already paid out:
     keys that start with "!" pay at most `cap` times EVER (stored under "*"), other keys at most `cap` times per day.
     P.log(kind, n, key?, cap?) -> true when points were added. Without a key it always pays (old behaviour). */
  P.once = (key, cap = 1) => {
    const b = key[0] === "!" ? "*" : P.today(), L = S.ledger[b] || (S.ledger[b] = {});
    if((L[key] || 0) >= cap) return false;
    L[key] = (L[key] || 0) + 1;
    const ds = Object.keys(S.ledger).filter(k => k !== "*").sort(); if(ds.length > 8) ds.slice(0, ds.length - 8).forEach(k => delete S.ledger[k]);
    return true;
  };
  P.log = (kind, n = 1, key, cap = 1) => {
    const ok = key ? P.once(key, cap) : true;
    if(ok){
      const t = P.today(), a = S.act[t] || (S.act[t] = { learn: 0, code: 0, mind: 0 });
      a[kind] = (a[kind] || 0) + n;
      const keys = Object.keys(S.act).sort(); if(keys.length > 120) keys.slice(0, keys.length - 120).forEach(k => delete S.act[k]);
    }
    P.touchDay();
    return ok;
  };
  P.actOf = (date) => Object.assign({ learn: 0, code: 0, mind: 0 }, S.act[date] || {});
  P.ring = (kind, date) => Math.min(1, P.actOf(date)[kind] / P.GOALS[kind]);
  P.lastDays = (n) => { const out = []; for(let i = n - 1; i >= 0; i--){ const d = new Date(); d.setDate(d.getDate() - i); out.push(d.toLocaleDateString("en-CA")); } return out; };
  // "Continue where you left off" (shown in the mini player): { kind: "learn"|"lab", id, title, icon, pos, total }
  P.setLast = (o) => { S.last = Object.assign({ t: Date.now() }, o); P.save(); P.paintMini && P.paintMini(); };
  // Update fields of the current "continue" item (e.g. the run count after each run) without re-ordering anything.
  P.patchLast = (kind, id, patch) => { if(S.last && S.last.kind === kind && S.last.id === id){ Object.assign(S.last, patch); P.save(); P.paintMini && P.paintMini(); } };
  // Is this text real thinking and not "aaaaaaaa…" or 30 spaces? Needs `min` characters, >= minChars different letters and 3 different words (or 20+ non-space characters).
  P.thoughtOk = (text, min, minChars = 8) => {
    const t = String(text || "").trim(); if(t.length < min) return false;
    const flat = t.replace(/\s+/g, "").toLowerCase(), chars = new Set(flat).size, words = new Set(t.toLowerCase().split(/\s+/)).size;
    return chars >= minChars && (words >= 3 || flat.length >= 20);
  };

  // Cover art: a gradient from a hue plus an emoji — same idea as album art.
  // Cover art: a flat tile tinted by a hue (CSS reads --h) with an emoji; no gradient, no drop-shadow.
  P.cover = (hue, icon, cls) => { const c = P.el("div", "cover" + (cls ? " " + cls : "")); c.style.setProperty("--h", hue); c.appendChild(P.el("span", "cover-i", icon)); return c; };
  P.icon = (name, cls) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"), u = document.createElementNS("http://www.w3.org/2000/svg", "use"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); if(cls) s.setAttribute("class", cls); u.setAttribute("href", "#i-" + name); s.appendChild(u); return s; };
  P.TOPIC = { Strings: [265, "🔤"], Arrays: [200, "🧱"], Loops: [150, "🔁"], Conditions: [30, "🔀"], Maps: [320, "🗂️"], Recursion: [285, "🪆"], Math: [45, "➗"], Stacks: [8, "🥞"] };
  P.LESSON_ICON = { "variables-and-types": "📦", conditions: "🔀", loops: "🔁", arrays: "🧱", strings: "🔤", functions: "⚙️", "objects-and-maps": "🗂️", recursion: "🪆", "how-to-solve-a-problem": "🧭" };
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
  P.toast = (m, ms) => { const t = document.getElementById("toast"); if(!t) return; t.textContent = m; t.classList.add("on"); clearTimeout(P._tt); P._tt = setTimeout(() => t.classList.remove("on"), ms || 2200); };
  P.nav = (hash) => { if(location.hash !== hash){ P.pushed = (P.pushed || 0) + 1; try{ history.pushState(null, "", hash); }catch(e){ location.hash = hash; } } P.route && P.route({ nav: true }); };

  /* ---- Run learner code in a Web Worker: isolated from the page, killed after a timeout (infinite loops) ----
     The worker body is a real function (workerMain) so it can be linted/tested; it is stringified into a Blob.
     - Comparison is strict: ser() tags NaN / Infinity / undefined, so Math.max() of [] (-Infinity) is NOT null. -0 equals 0.
     - Syntax is checked on the learner's code alone, so the wrapper's "\n;return fn" can never blame the learner for a stray ')'.
     - Console output is capped per line / in total / in line count, with a visible "… (kat diya)" marker. */
  function workerMain(){
    const MAX_LINE = 500, MAX_TOTAL = 4000, MAX_LINES = 200, CUT = "… (kat diya)";
    const PROMISE = "Promise (async code is not supported — return a plain value)";
    let logs = [], total = 0, capped = false, asyncErr = null;
    const thenable = v => v !== null && (typeof v === "object" || typeof v === "function") && typeof v.then === "function";
    function ser(v, seen, depth){
      const t = typeof v;
      if(v === null) return "null";
      if(t === "undefined") return "undefined";
      if(t === "number") return Object.is(v, -0) ? "0" : String(v);
      if(t === "string") return JSON.stringify(v);
      if(t === "boolean") return String(v);
      if(t === "bigint") return v + "n";
      if(t === "function") return "[function]";
      if(t === "symbol") return v.toString();
      seen = seen || []; depth = depth || 0;
      if(seen.indexOf(v) >= 0) return "[Circular]";
      if(depth > 8) return "[…]";
      seen.push(v);
      try{
        if(v instanceof Error) return v.name + ": " + v.message;
        if(Array.isArray(v)){ const a = []; for(let i = 0; i < v.length; i++) a.push(ser(v[i], seen, depth + 1)); return "[" + a.join(",") + "]"; }
        if(v instanceof Map) return "Map(" + ser(Array.from(v), seen, depth + 1) + ")";
        if(v instanceof Set) return "Set(" + ser(Array.from(v), seen, depth + 1) + ")";
        if(v instanceof Date) return "Date(" + (isNaN(v) ? "Invalid" : v.toISOString()) + ")";
        return "{" + Object.keys(v).map(k => JSON.stringify(k) + ":" + ser(v[k], seen, depth + 1)).join(",") + "}";
      }catch(e){ return "[object]"; }
      finally{ seen.pop(); }
    }
    const fmt = v => typeof v === "string" ? v : ser(v);
    const log = (...a) => {
      if(capped) return;
      if(logs.length >= MAX_LINES){ capped = true; return; }
      let line = a.map(fmt).join(" ");
      if(line.length > MAX_LINE) line = line.slice(0, MAX_LINE) + CUT;
      if(total + line.length > MAX_TOTAL){ line = line.slice(0, Math.max(0, MAX_TOTAL - total)) + CUT; capped = true; }
      total += line.length; logs.push(line);
    };
    const nop = () => {};
    const con = { log, info: log, warn: log, error: log, debug: log, dir: log, table: log, group: nop, groupEnd: nop, time: nop, timeEnd: nop, clear: nop, trace: nop,
      assert: (c, ...a) => { if(!c) log("Assertion failed:", ...a); } };
    const collected = () => { const l = logs.slice(); if(capped && !(l.length && l[l.length - 1].endsWith(CUT))) l.push(CUT); return l; };
    const lineOf = (err, nLines) => {                      // learner code starts on line 3 of the generated function
      const m = /<anonymous>:(\d+):\d+/.exec(String(err && err.stack || "")); if(!m) return 0;
      const n = +m[1] - 2; return n >= 1 && n <= nLines ? n : 0;
    };
    const rtMsg = (err, nLines) => {
      const name = err && err.name && err.name !== "Error" ? err.name + ": " : "", msg = String((err && err.message) || err), ln = lineOf(err, nLines);
      return name + msg + (ln ? " (line " + ln + ")" : "");
    };
    const END = /end of input|Unterminated template/i;
    /* Small bracket / quote scanner. V8's Function constructor wraps the body in "(function anonymous(console\n) {\n ... \n})", so an
       unclosed { is reported as a confusing "Unexpected token ')'". The scanner finds the real problem and its line. */
    function scan(code){
      const OPEN = { "(": ")", "[": "]", "{": "}" }, st = [], info = {}, n = code.length;
      let mode = "code", line = 1, prev = "", issue = null;
      const bad = (ln, msg) => { if(!issue) issue = { line: ln, msg }; };
      const closers = () => st.some(t => !OPEN[t.c]) ? null : st.map(t => OPEN[t.c]).reverse().join("");   // what would close everything still open
      for(let i = 0; i < n; i++){
        const ch = code[i], nx = code[i + 1];
        if(ch === "\n"){
          if((mode === "sq" || mode === "dq") && code[i - 1] !== "\\"){ bad(line, "string ka quote band nahi hua — line ke end tak " + (mode === "sq" ? "'" : '"') + " lagana bhool gaye?"); mode = "code"; }
          if(mode === "line") mode = "code";
          info[line] = { plain: mode === "code", close: closers() }; line++; continue;
        }
        if(mode === "line") continue;
        if(mode === "block"){ if(ch === "*" && nx === "/"){ mode = "code"; i++; } continue; }
        if(mode === "sq" || mode === "dq"){ if(ch === "\\") i++; else if(ch === (mode === "sq" ? "'" : '"')){ mode = "code"; prev = ch; } continue; }
        if(mode === "tpl"){
          if(ch === "\\") i++; else if(ch === "`"){ mode = "code"; prev = ch; } else if(ch === "$" && nx === "{"){ st.push({ c: "${", line }); mode = "code"; i++; }
          continue;
        }
        if(ch === "/" && nx === "/"){ mode = "line"; i++; continue; }
        if(ch === "/" && nx === "*"){ mode = "block"; i++; continue; }
        if(ch === "'"){ mode = "sq"; continue; }
        if(ch === '"'){ mode = "dq"; continue; }
        if(ch === "`"){ mode = "tpl"; continue; }
        if(ch === "/" && (prev === "" || "(,=:[!&|?{};+-*%<>~^".indexOf(prev) >= 0)){        // regex literal
          let j = i + 1, cls = false;
          for(; j < n && code[j] !== "\n"; j++){ if(code[j] === "\\") j++; else if(code[j] === "[") cls = true; else if(code[j] === "]") cls = false; else if(code[j] === "/" && !cls) break; }
          i = j; prev = ")"; continue;
        }
        if(OPEN[ch]) st.push({ c: ch, line });
        else if(ch === ")" || ch === "]" || ch === "}"){
          const top = st[st.length - 1];
          if(ch === "}" && top && top.c === "${"){ st.pop(); mode = "tpl"; continue; }
          if(!top) bad(line, "'" + ch + "' band ho raha hai par kuch khula hi nahi tha — extra " + ch + " hata do");
          else { if(OPEN[top.c] !== ch) bad(line, "'" + ch + "' yahan mel nahi khata — line " + top.line + " ka '" + top.c + "' pehle band karna tha"); st.pop(); }
        }
        if(!/\s/.test(ch)) prev = ch;
      }
      info[line] = { plain: mode === "code" || mode === "line", close: closers() };
      if(mode === "block") bad(line, "/* comment */ band nahi hua — */ lagana bhool gaye?");
      if(mode === "tpl") bad(line, "template string ka ` band nahi hua");
      if((mode === "sq" || mode === "dq")) bad(line, "string ka quote band nahi hua");
      if(!issue && st.length){ const t = st[st.length - 1]; issue = { line: t.line, msg: "'" + t.c + "' khola tha par band nahi hua — closing " + (OPEN[t.c] || "}") + " lagana bhool gaye?" }; }
      return { issue, info, lines: line };
    }
    function syntaxMsg(code){
      try{ new Function("console", code); return null; }
      catch(e){
        if(!(e instanceof SyntaxError)) return null;
        const sc = scan(code);
        if(sc.issue) return "Syntax error (line " + sc.issue.line + "): " + sc.issue.msg;
        // brackets balance: ask V8 about the code up to each line (open brackets closed artificially) to find where it first breaks
        const lines = code.split("\n"); let at = 0;
        for(let k = 1; k <= Math.min(lines.length, 600) && !at; k++){
          const inf = sc.info[k]; if(!inf || !inf.plain || inf.close == null) continue;
          try{ new Function("console", lines.slice(0, k).join("\n") + "\n" + inf.close); }
          catch(e2){ if(e2 instanceof SyntaxError && !END.test(e2.message) && !/Unexpected token '[)}\]]'/.test(e2.message)) at = k; }
        }
        let tip = "quotes, commas aur spelling check karo";
        if(/await/.test(e.message)) tip = "await sirf async function ke andar chalta hai";
        else if(END.test(e.message)) tip = "code adhoora lag raha hai — kuch poora likhna reh gaya?";
        return "Syntax error" + (at ? " (line " + at + ")" : "") + ": " + e.message + " — " + tip;
      }
    }
    self.addEventListener("error", ev => { ev.preventDefault(); if(!asyncErr) asyncErr = rtMsg(ev.error || ev.message, 1e9); });
    self.addEventListener("unhandledrejection", ev => { ev.preventDefault(); if(!asyncErr) asyncErr = rtMsg(ev.reason, 1e9); });
    onmessage = e => {
      const { code, fn, tests, wait } = e.data, nLines = String(code).split("\n").length;
      const done = extra => postMessage(Object.assign({ logs: collected() }, asyncErr ? { error: asyncErr } : {}, extra));
      const syn = syntaxMsg(code);
      if(syn){ postMessage({ logs: [], error: syn, kind: "syntax" }); return; }
      let f;
      try{ f = new Function("console", code + "\n;return " + (fn ? "(typeof " + fn + " === 'function' ? " + fn + " : undefined)" : "undefined") + ";")(con); }
      catch(err){ done({ error: rtMsg(err, nLines), kind: "runtime" }); return; }
      if(!fn){ setTimeout(() => done(), wait || 0); return; }                 // playground: give setTimeout / Promise logs a moment
      if(!f){ done({ error: "Function " + fn + " define nahi hua — naam same rakho: " + fn }); return; }
      const results = tests.map(t => {
        try{
          const got = f(...JSON.parse(JSON.stringify(t.args)));
          if(thenable(got)){ try{ got.then(null, nop); }catch(_){} return { ok: false, got: PROMISE }; }
          return { ok: ser(got) === ser(t.expect), got: ser(got) };
        }catch(err){ return { ok: false, err: rtMsg(err, nLines) }; }
      });
      done({ results });
    };
  }
  const WORKER_SRC = "(" + workerMain.toString() + ")();";
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
    w.postMessage({ code: String(code), fn: opts.fn || null, tests: opts.tests || [], wait: opts.wait != null ? opts.wait : (opts.fn ? 0 : 300) });
  });

  /* ---- Code editor feel for a <textarea> ----
     All edits go through execCommand("insertText") so the browser's own Ctrl+Z history keeps working (setRangeText fallback).
     Tab indents (2 spaces; Shift+Tab dedents), but never traps a keyboard user: Esc, then Tab, moves focus on. Enter keeps the indent and
     splits {} () [] into an indented blank line; typing } ) ] at the start of a line dedents. */
  const insert = (ta, text, a, b) => {
    if(a != null) ta.setSelectionRange(a, b == null ? a : b);
    ta.focus();
    let ok = false;
    try{ ok = document.execCommand("insertText", false, text); }catch(e){}
    if(!ok){ ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, "end"); ta.dispatchEvent(new Event("input", { bubbles: true })); }
  };
  P.autosize = (ta, maxVh = 70) => {
    const fit = () => { if(!ta.offsetParent) return; ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight + 2, innerHeight * maxVh / 100) + "px"; };
    ta.addEventListener("input", fit);
    if(window.ResizeObserver){ let w = 0; new ResizeObserver(() => { if(ta.offsetWidth !== w){ w = ta.offsetWidth; fit(); } }).observe(ta); }
    requestAnimationFrame(fit); return fit;
  };
  let codeBoxId = 0;
  P.codeBox = (value, rows, label) => {
    const ta = P.el("textarea", "code-ta"); ta.value = value || ""; ta.rows = rows || 12; ta.spellcheck = false;
    ta.setAttribute("autocapitalize", "off"); ta.setAttribute("autocomplete", "off"); ta.setAttribute("autocorrect", "off");
    ta.setAttribute("aria-label", label || "Code editor");
    const hint = P.el("p", "note small code-hint", "Tab = 2 spaces · Tab se bahar nikalna ho to pehle Esc dabao, phir Tab"); hint.id = "codehint" + (++codeBoxId);
    ta.setAttribute("aria-describedby", hint.id); ta.hint = hint;
    let free = false;                                    // after Esc, Tab moves focus as usual
    ta.addEventListener("blur", () => { free = false; });
    ta.addEventListener("keydown", e => {
      if(e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
      if(e.key === "Escape"){ free = true; return; }
      if(e.key === "Tab"){
        if(free) return;
        e.preventDefault();
        const ls = v.lastIndexOf("\n", s - 1) + 1;
        if(e.shiftKey || (s !== en && v.slice(s, en).includes("\n"))){          // (de)indent every touched line
          let le = v.indexOf("\n", en > s && v[en - 1] === "\n" ? en - 1 : en); if(le < 0) le = v.length;
          const block = v.slice(ls, le), out = block.split("\n").map(l => e.shiftKey ? l.replace(/^ {1,2}/, "") : "  " + l).join("\n");
          if(out !== block) insert(ta, out, ls, le), ta.setSelectionRange(ls, ls + out.length);
        } else insert(ta, "  ");
        return;
      }
      if(e.key === "Enter"){
        const line = v.slice(v.lastIndexOf("\n", s - 1) + 1, s), base = (/^\s*/.exec(line) || [""])[0], open = /[{(\[]\s*$/.test(line);
        const pair = { "{": "}", "(": ")", "[": "]" }[v[s - 1]] === v[en];                // cursor sits between {} () []
        e.preventDefault();
        if(open && pair && s === en){ insert(ta, "\n" + base + "  \n" + base); const at = s + 1 + base.length + 2; ta.setSelectionRange(at, at); }
        else insert(ta, "\n" + base + (open ? "  " : ""));
        return;
      }
      if((e.key === "}" || e.key === ")" || e.key === "]") && s === en){
        const ls = v.lastIndexOf("\n", s - 1) + 1, pre = v.slice(ls, s);
        if(pre.length && /^ +$/.test(pre)){ e.preventDefault(); insert(ta, e.key, s - Math.min(2, pre.length), s); }
      }
    });
    return ta;
  };

  // Back navigation is the app bar's chevron on pushed screens; the page header is just a title.
  P.header = (title, back, sub) => {
    const h = P.el("div", "mod-head");
    if(title) h.appendChild(P.el("h2", null, title));
    if(sub) h.appendChild(P.el("p", "mod-sub", sub));
    return h;
  };
})();
