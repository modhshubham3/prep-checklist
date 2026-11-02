/* Platform router + Home (Aaj).
   Tabs: Aaj (home) · Seekho (learn) · Lab (lab / logic / decide, segmented) · Revise (answers practice cheat checklist plan, chips)
   · Career (diary + mock interview). body[data-mode] = home | learn | lab | logic | decide | interview (Revise) | career;
   body[data-nav] = the highlighted tab. Revise/Career screens are the old Interview-Prep views driven by shell.js.
   Hash routes: #/home #/learn[/id] #/lab[/id] #/logic #/decide[/id] #/answers #/plan #/checklist #/practice #/cheat #/diary #/career
   (+ #/interview, #/revise). Route changes run inside a View Transition (fade-through / shared-axis) with a CSS fallback. */
(() => {
  const { el, S } = P;
  const MODS = ["home", "learn", "lab", "logic", "decide"];
  const REV = ["plan", "answers", "checklist", "practice", "cheat"];
  const NAV = { home: "home", learn: "learn", lab: "lab", logic: "lab", decide: "lab", interview: "interview", career: "career" };
  const TITLES = { learn: "Seekho", lab: "Code Lab", decide: "Decision Lab" };
  const SCREEN = { plan: "plan", checklist: "allq", practice: "practice", cheat: "cheat", diary: "diary" };
  const $ = id => document.getElementById(id);
  const root = id => $("m-" + id);
  const body = document.body, de = document.documentElement;

  // Notification deep links (?q= ?quiz= ?drill=) count only on the very first route (cur is still null); notify.js
  // cleans them out of the URL right after, so they can never re-fire or leak into the hash.
  function parse(){
    if(!cur && /[?&](q|quiz|drill)=/.test(location.search)) return { mode: "interview", tab: "" };
    const m = /^#\/([a-z]+)(?:\/([a-z0-9-]+))?(?:\?.*)?$/.exec(location.hash);
    if(!m) return { mode: "home" };
    if(MODS.includes(m[1])) return { mode: m[1], id: m[2] || "" };
    if(m[1] === "interview" || m[1] === "revise") return { mode: "interview", tab: "" };
    if(REV.includes(m[1])) return { mode: "interview", tab: m[1] };
    if(m[1] === "career" || m[1] === "diary") return { mode: "career" };
    return { mode: "home" };
  }

  /* ---------------- scroll memory + screen helpers ---------------- */
  const memo = {};
  function scroller(c){
    if(!c) return null;
    if(c.mode === "interview" || c.mode === "career"){
      if(c.tab === "answers") return document.querySelector(".wrap");
      const v = $(SCREEN[c.tab]); return v && v.querySelector(".cheat-body");
    }
    return root(c.mode);
  }

  /* ---------------- View Transitions (with a CSS fallback) ---------------- */
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stage = $("stage");
  function swap(update, kind){
    if(typeof document.startViewTransition === "function"){
      de.dataset.vt = reduced() ? "fade" : kind;
      let vt;
      try{ vt = document.startViewTransition(() => { try{ update(); }catch(e){ console.error(e); } }); }
      catch(e){ delete de.dataset.vt; update(); return; }
      vt.ready.catch(() => {}); vt.updateCallbackDone.catch(() => {});
      vt.finished.catch(() => {}).then(() => { delete de.dataset.vt; });
    } else {
      update();
      const c = kind === "fwd" ? "entering-x" : kind === "back" ? "entering-b" : "entering";
      stage.classList.remove("entering", "entering-x", "entering-b"); void stage.offsetWidth; stage.classList.add(c);
      setTimeout(() => stage.classList.remove(c), 300);
    }
  }

  /* ---------------- router ---------------- */
  let cur = null, pendingHref = "", afterFns = [];
  P.after = fn => { afterFns.push(fn); };
  P.lastLab = "lab";

  // Home is keyed on today's date so it is rebuilt when the day changes (see checkDay).
  function keyOf(r){ return r.mode === "career" ? "career" : r.mode === "interview" ? "interview/" + (r.tab || "") : r.mode === "home" ? "home/" + P.today() : r.mode + "/" + (r.id || ""); }
  let applying = false, fixing = false, firstDone = false;
  const legacyOf = c => c && (c.mode === "interview" || c.mode === "career");
  const wantTab = c => c.mode === "career" ? "diary" : c.tab;
  // Is the screen the router thinks it is on really the one the user sees? (Esc, practice-over-plan, notifications ...)
  function visibleOk(c){
    const sh = window.prepShell; if(!c || !sh) return true;
    if(legacyOf(c)) return body.dataset.mode === c.mode && sh.current() === wantTab(c);
    const m = root(c.mode);
    return !!m && m.classList.contains("on") && !document.querySelector(".cheat.on");
  }
  // Safety net: exactly one screen must be visible after every route; if not, re-open the one we think we are on.
  function verify(){
    const sh = window.prepShell;
    if(!cur || !sh || applying || fixing || visibleOk(cur)) return;
    fixing = true;
    try{
      if(legacyOf(cur)){ body.dataset.mode = cur.mode; sh.show(wantTab(cur)); }
      else { sh.closeAll(); document.querySelectorAll("#platform .mod").forEach(m => { const on = m.id === "m-" + cur.mode; m.classList.toggle("on", on); m.inert = !on; }); }
    }finally{ fixing = false; }
  }
  // Called by shell.js whenever a Revise/Career screen opens or closes by any means: follow it.
  P.sync = () => {
    if(!cur || applying || fixing) return;
    if(cur.mode === "interview" && body.dataset.mode === "interview" && window.prepShell){
      const c = prepShell.current(); if(c !== cur.tab){ cur.tab = c; cur.key = "interview/" + c; }
    } else if(cur.mode === "career" && body.dataset.mode === "career") verify();
  };

  function route(o){
    o = o || {};
    if(o.evt){ if(location.href === pendingHref) return; P.pushed = Math.max(0, (P.pushed || 0) - 1); }
    pendingHref = location.href;
    const r = parse(), key = keyOf(r);
    if(!cur){ apply(false); done(); return; }
    let force = false;
    if(o.nav && cur.key === key && !(r.mode === "interview" && !r.tab)){        // tapped the screen we are on: back to top
      if(visibleOk(cur)){ const sc = scroller(cur); if(sc) sc.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" }); return; }
      force = true;                                                            // ... unless it is not actually showing (overlay on top, closed by Esc): open it again
    }
    const kind = cur.mode === r.mode && (r.id || "") !== (cur.id || "") ? (r.id ? "fwd" : "back") : "fade";
    const rerender = force || (!o.nav && !o.evt && cur.key === key);         // P.route() on the visible screen (e.g. decision reset)
    swap(() => { apply(rerender); done(); }, kind);
  }
  P.route = route;
  function done(){
    verify();
    if(!firstDone){ firstDone = true; if(window.prepShell) prepShell.ready(); }
  }
  // Sibling switches (Revise chips, Code | Logic | Decide) replace the history entry instead of stacking a new one.
  P.navReplace = hash => { if(location.hash !== hash){ try{ history.replaceState(null, "", hash); }catch(e){ location.hash = hash; } } route({ nav: true }); };

  function apply(rerender){
    applying = true;
    try{ applyInner(rerender); }finally{ applying = false; }
  }
  function applyInner(rerender){
    const r = parse(), prev = cur;
    if(prev){ const sc = scroller(prev); if(sc) memo[prev.key] = sc.scrollTop; }
    const legacy = r.mode === "interview" || r.mode === "career";
    let next;
    if(legacy){
      const was = body.dataset.mode, tab = r.mode === "career" ? "diary" : (r.tab || (window.prepShell ? prepShell.tabFromHash() : "answers"));
      body.dataset.mode = r.mode;
      // resolve "#/interview", "#/revise", empty and "#/answers?junk" to the real screen (the query string, if any, is left alone for notify.js)
      if(!location.hash || /^#\/(interview|revise)$/.test(location.hash) || location.hash.indexOf("?") > -1){ try{ history.replaceState(null, "", "#/" + tab); }catch(e){} }
      if(window.prepShell && !prepShell.show(tab)){          // practice asked "interview chhod rahe ho?" and the user said no
        body.dataset.mode = was; try{ history.replaceState(null, "", "#/" + prepShell.current()); }catch(e){}
        return;
      }
      next = { mode: r.mode, id: "", tab, key: r.mode === "career" ? "career" : "interview/" + tab };
    } else {
      if(window.prepShell && !prepShell.closeAll()){ try{ history.replaceState(null, "", "#/" + prepShell.current()); }catch(e){} return; }
      next = { mode: r.mode, id: r.id || "", key: keyOf(r) };
    }
    if(prev && !rerender && prev.key === next.key && !legacy) return;
    if(prev && prev.mode !== next.mode || (prev && prev.id !== next.id)){ const ph = prev.mode && root(prev.mode); if(ph && ph._cleanup) ph._cleanup(); }   // stop a lesson's timers when leaving it

    /* chrome */
    body.dataset.mode = r.mode; body.dataset.nav = NAV[r.mode];
    const pushed = !!r.id && !!TITLES[r.mode];
    if(pushed) body.dataset.pushed = "1"; else delete body.dataset.pushed;
    const word = $("brandword"); if(word){ if(pushed) word.textContent = TITLES[r.mode]; else if(!word.querySelector("i")) word.innerHTML = "prep<i>.</i>"; }
    const sub = (r.mode === "lab" || r.mode === "logic" || r.mode === "decide") && !r.id ? "lab" : r.mode === "interview" ? "rev" : "";
    if(sub) body.dataset.sub = sub; else delete body.dataset.sub;
    $("subbar").hidden = !sub;
    if(r.mode === "lab" || r.mode === "logic" || r.mode === "decide") P.lastLab = r.mode;
    document.querySelectorAll("#pnav [data-go]").forEach(b => { if(b.dataset.go === NAV[r.mode]) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    document.querySelectorAll("#labseg [data-go]").forEach(b => { const on = b.dataset.go === r.mode; b.setAttribute("aria-selected", on ? "true" : "false"); });
    document.querySelectorAll("#platform .mod").forEach(m => { const on = m.id === "m-" + r.mode; m.classList.toggle("on", on); m.inert = !on; });

    /* content */
    if(!legacy){
      const host = root(r.mode);
      if(rerender || host._key !== next.key || host._dirty){
        (r.mode === "home" ? renderHome : (P.mods[r.mode] || { render(h){ h.textContent = "Coming soon"; } }).render)(host, r.id);
        host._key = next.key; host._dirty = false;
      }
    }
    cur = next;
    if(!rerender){ const sc = scroller(cur); if(sc) sc.scrollTop = memo[cur.key] || 0; }
    $("appbar").dataset.scrolled = "false";
    paintMini();
    const fns = afterFns; afterFns = []; fns.forEach(f => { try{ f(); }catch(e){ console.error(e); } });
  }

  /* ---------------- Home: Aaj ---------------- */
  const NS = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs) => { const e = document.createElementNS(NS, tag); for(const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const KINDS = [["learn", "Seekho", "Predict, animation, playground"], ["code", "Code Lab", "Code runs + solves"], ["mind", "Mind", "Decisions, dry-run, drills"]];
  const dayLetter = d => ["S", "M", "T", "W", "T", "F", "S"][new Date(d + "T12:00:00").getDay()];
  const RS = "prep-ring-seen";
  const ringSeen = t => { try{ const o = JSON.parse(localStorage.getItem(RS)); if(o && o.d === t) return o.v || {}; }catch(e){} return {}; };

  // Rings animate only when their value changed since they were last shown today (first show of the day: from 0).
  function ringsSvg(date){
    const rs = svg("svg", { viewBox: "0 0 140 140", class: "rings", role: "img" }), parts = [], seen = ringSeen(date), now = {};
    [["learn", 60], ["code", 46], ["mind", 32]].forEach(([k, r]) => {
      const C = 2 * Math.PI * r, p = ringOf(k, date), from = typeof seen[k] === "number" && isFinite(seen[k]) ? Math.min(1, Math.max(0, seen[k])) : 0;
      rs.appendChild(svg("circle", { cx: 70, cy: 70, r, class: "ring-track" }));
      if(p > 0 || from > 0){
        const arc = svg("circle", { cx: 70, cy: 70, r, class: "ring-arc r-" + k, "stroke-dasharray": C + " " + C, "stroke-dashoffset": C * (1 - from), transform: "rotate(-90 70 70)" });
        if(from !== p) requestAnimationFrame(() => requestAnimationFrame(() => arc.setAttribute("stroke-dashoffset", C * (1 - p))));
        rs.appendChild(arc);
      }
      now[k] = p; parts.push(k + " " + Math.round(p * 100) + "%");
    });
    try{ localStorage.setItem(RS, JSON.stringify({ d: date, v: now })); }catch(e){}
    rs.setAttribute("aria-label", "Aaj ke goals: " + parts.join(", "));
    return rs;
  }

  function step(kind, icon, title, sub, done, hash){
    const b = el("button", "hstep " + kind + (done ? " done" : "")); b.type = "button";
    const i = el("span", "hs-i"); i.appendChild(P.icon(icon));
    const t = el("span", "hs-t"); t.append(el("b", null, title), el("small", null, sub));
    const ok = el("span", "hs-ok"); if(done) ok.appendChild(P.icon("check"));
    b.append(i, t, ok); b.addEventListener("click", () => P.nav(hash)); return b;
  }

  /* ---- saved progress can be edited/corrupted by hand: Home reads it defensively and never prints NaN / [object Object] ---- */
  const num = v => typeof v === "number" && isFinite(v) ? v : 0;
  const obj = v => v && typeof v === "object" ? v : {};
  const actOf = d => { const o = obj(obj(S.act)[d]), r = {}; KINDS.forEach(([k]) => { r[k] = Math.max(0, num(o[k])); }); return r; };
  const ringOf = (k, d) => Math.min(1, actOf(d)[k] / P.GOALS[k]);
  const doneL = id => !!obj(obj(S.learn)[id]).done, doneX = id => !!obj(obj(S.lab)[id]).solved, doneD = id => !!obj(S.decide)[id];
  function lastOf(){
    const L = S.last; if(!L || typeof L !== "object" || (L.kind !== "learn" && L.kind !== "lab")) return null;
    if(typeof L.id !== "string" || !/^[a-z0-9-]+$/.test(L.id) || typeof L.title !== "string" || !L.title.trim()) return null;
    if(!((L.kind === "learn" ? window.LEARN : window.LAB) || []).some(x => x.id === L.id)) return null;
    const total = Math.floor(num(L.total)) >= 1 ? Math.floor(num(L.total)) : 0, pos = total ? Math.min(total, Math.max(0, Math.floor(num(L.pos)))) : 0;     // total 0 = unknown: no "step x / y"
    const hue = num(L.hue) >= 0 && num(L.hue) <= 360 && typeof L.hue === "number" ? L.hue : 200;
    return { kind: L.kind, id: L.id, title: L.title.slice(0, 120), icon: typeof L.icon === "string" && L.icon && L.icon.length <= 8 ? L.icon : "▶", hue, pos, total, runs: Math.max(0, Math.floor(num(L.runs))) };
  }
  P.lastSane = lastOf;
  // One stable item per kind per day, chosen the first time Home is drawn that day (so a row does not change title when it is finished).
  const HP = "prep-home-pick";
  function picksFor(t){
    let o = null; try{ o = JSON.parse(localStorage.getItem(HP)); }catch(e){}
    if(!o || typeof o !== "object" || o.d !== t) o = { d: t };
    const lists = { learn: [window.LEARN || [], x => !doneL(x.id)], code: [window.LAB || [], x => !doneX(x.id)], mind: [window.DECIDE || [], x => !doneD(x.id)] };
    const out = {}; let changed = false;
    Object.keys(lists).forEach(k => {
      const [list, open] = lists[k];
      let it = typeof o[k] === "string" && o[k] ? list.find(x => x.id === o[k]) : null;
      if(!it && o[k] !== "" ){ it = list.find(open) || null; o[k] = it ? it.id : ""; changed = true; }
      out[k] = it || null;
    });
    if(changed){ try{ localStorage.setItem(HP, JSON.stringify(o)); }catch(e){} }
    return out;
  }

  function renderHome(host){
    host.replaceChildren();
    const t = P.today(), a = actOf(t), tot = KINDS.reduce((n, [k]) => n + ringOf(k, t), 0) / 3;
    const pk = picksFor(t), nl = pk.learn, nx = pk.code, nd = pk.mind;

    const top = el("div", "tday");
    const when = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
    const tt = el("div"); tt.append(el("small", null, when.toUpperCase()), el("h1", null, "Aaj"));
    const sp = el("span", "spill"); sp.append(P.icon("flame"), document.createTextNode(P.streak() + " din")); top.append(tt, sp);
    host.appendChild(top);

    // the one primary action: today's 30 minutes = a lesson, a problem, a decision
    const tasks = [
      ["learn", "book", nl ? String(nl.title) : "Saare lessons ho gaye", nl ? (doneL(nl.id) ? "Seekho · Done ✓" : "Seekho · ~8 min") : "Seekho · dobara dekh sakte ho", nl ? doneL(nl.id) : ringOf("learn", t) >= 1, nl ? "#/learn/" + nl.id : "#/learn"],
      ["code", "code", nx ? String(nx.title) : "Saare problems solve", nx ? (doneX(nx.id) ? "Code Lab · Done ✓" : "Code Lab · ~15 min") : "Code Lab · revision", nx ? doneX(nx.id) : ringOf("code", t) >= 1, nx ? "#/lab/" + nx.id : "#/lab"],
      ["mind", "scale", nd ? String(nd.title) : "Saare faisle ho gaye", nd ? (doneD(nd.id) ? "Decision Lab · Done ✓" : "Decision Lab · ~7 min") : "Decision Lab · revision", nd ? doneD(nd.id) : ringOf("mind", t) >= 1, nd ? "#/decide/" + nd.id : "#/decide"],
    ];
    const doneN = tasks.filter(x => x[4]).length, firstOpen = tasks.find(x => !x[4]);
    const hero = el("div", "hero"); hero.setAttribute("role", "region"); hero.setAttribute("aria-label", "Aaj ka plan");
    hero.append(el("div", "hero-k", doneN === 3 ? "Aaj ka kaam ho gaya" : "Aaj ka plan"), el("h2", null, "Aaj ka 30 min"),
      el("p", null, doneN === 3 ? "Teeno goals poore. Ek aur lesson ya Revise karke din band karo." : "Pehle khud socho, phir AI. Teen chhote kaam: lesson, code, faisla."));
    const steps = el("div", "hsteps"); tasks.forEach(x => steps.appendChild(step(x[0], x[1], x[2], x[3], x[4], x[5]))); hero.appendChild(steps);
    const go = el("button", "pbtn big"); go.type = "button"; go.id = "homego";
    go.textContent = doneN === 0 ? "Aaj ka 30 min — shuru karo" : doneN === 3 ? "Aaj ka 30 min poora ✓ — Revise karo" : "Aaj ka 30 min — jaari rakho";
    go.addEventListener("click", () => P.nav(doneN === 3 ? "#/answers" : firstOpen[5]));
    hero.appendChild(go); host.appendChild(hero);

    // rings + legend
    const card = el("div", "ringcard"), figure = el("div", "ringfig");
    figure.appendChild(ringsSvg(t));
    const c = el("div", "ring-c"); c.append(el("b", null, Math.round(tot * 100) + "%"), el("small", null, "goal")); figure.appendChild(c);
    const legend = el("div", "ringleg");
    KINDS.forEach(([k, name, sub]) => {
      const row = el("div", "leg"); const sw = el("span", "sw sw-" + k);
      const txt = el("div"); txt.append(el("strong", null, name), el("small", null, sub));
      row.append(sw, txt, el("b", "leg-v", Math.min(a[k], P.GOALS[k]) + " / " + P.GOALS[k]));
      legend.appendChild(row);
    });
    card.append(figure, legend); host.appendChild(card);

    // week strip
    const week = el("div", "week");
    P.lastDays(7).forEach(d => {
      const n = KINDS.filter(([k]) => ringOf(k, d) >= 1).length, any = KINDS.some(([k]) => actOf(d)[k] > 0);
      const b = el("div", "wd" + (d === t ? " today" : "") + (n === 3 ? " full" : any ? " some" : ""));
      b.title = d + ": " + n + "/3 goals"; b.append(el("span", "wd-c", n === 3 ? "✓" : any ? "•" : ""), el("small", null, dayLetter(d)));
      week.appendChild(b);
    });
    host.appendChild(week);

    // continue where you left off
    const L = lastOf();
    if(L && !(L.kind === "learn" ? doneL(L.id) : doneX(L.id))){
      const cont = el("button", "cont"); cont.type = "button";
      cont.appendChild(P.cover(L.hue, L.icon, "sm"));
      const m = el("span", "cont-t"); m.append(el("small", null, "CONTINUE"), el("strong", null, L.title), el("small", null, L.kind === "learn" ? "Seekho" + (L.total ? " · step " + L.pos + " / " + L.total : "") : "Code Lab · " + L.runs + " koshish"));
      const pl = el("span", "cont-play"); pl.appendChild(P.icon("play"));
      cont.append(m, pl);
      if(L.kind === "learn" && L.total){ const bar = el("span", "cont-bar"); bar.style.setProperty("--pn", L.pos / L.total); cont.appendChild(bar); }
      cont.addEventListener("click", () => P.nav("#/" + (L.kind === "learn" ? "learn/" : "lab/") + L.id));
      host.appendChild(cont);
    }

    const rules = el("div", "callout");
    rules.textContent = "Rules: pehle khud likho · hint ek run ke baad · solution 5 koshish + 3 hints ke baad · office mein Claude ko dene se pehle 10 minute khud socho.";
    host.appendChild(rules);
  }

  /* ---------------- mini player: continue where you left off ---------------- */
  function paintMini(){
    const m = $("mini"), L = lastOf(), mode = body.dataset.mode, r = parse();
    const finished = !L || (L.kind === "learn" ? doneL(L.id) : doneX(L.id));
    const here = L && r.id === L.id && r.mode === (L.kind === "learn" ? "learn" : "lab");
    if(!m || finished || mode === "interview" || mode === "career" || mode === "home" || here){ if(m) m.hidden = true; return; }
    m.hidden = false; m.replaceChildren();
    const bar = el("span", "mini-bar"); bar.style.setProperty("--pn", L.kind === "learn" && L.total ? L.pos / L.total : 0);
    m.append(P.cover(L.hue, L.icon, "xs"));
    const t = el("span", "mini-t"); t.append(el("strong", null, L.title), el("small", null, L.kind === "learn" ? "Seekho" + (L.total ? " · step " + L.pos + " / " + L.total : "") : "Code Lab · " + L.runs + " koshish"));
    const pl = el("span", "cont-play sm"); pl.appendChild(P.icon("play"));
    m.append(t, pl, bar);
    m.onclick = () => P.nav("#/" + (L.kind === "learn" ? "learn/" : "lab/") + L.id);
  }
  P.paintMini = paintMini;

  /* ---------------- wiring ---------------- */
  // Android fires popstate and hashchange for one Back: route() ignores the second (same href).
  window.addEventListener("popstate", () => route({ evt: true }));
  window.addEventListener("hashchange", () => route({ evt: true }));
  document.querySelectorAll("#pnav [data-go]").forEach(b => b.addEventListener("click", () => {
    const g = b.dataset.go, active = body.dataset.nav === g;
    let hash = { home: "#/home", learn: "#/learn", lab: "#/" + P.lastLab, interview: "#/" + (window.prepLastRev || "answers"), career: "#/career" }[g];
    if(active && cur && cur.id) hash = "#/" + cur.mode;
    P.nav(hash);
  }));
  document.querySelectorAll("#labseg [data-go]").forEach(b => b.addEventListener("click", () => P.navReplace("#/" + b.dataset.go)));
  // The date rolled over while the app stayed open: rebuild Home (hidden screens re-render when shown, their key has the date).
  const checkDay = () => { if(cur && cur.mode === "home" && cur.key !== keyOf(parse())) route(); };
  document.addEventListener("visibilitychange", () => { if(!document.hidden) checkDay(); });
  window.addEventListener("focus", checkDay);
  window.addEventListener("pageshow", checkDay);
  setInterval(checkDay, 60000);
  const brand = $("brand");
  if(brand) brand.addEventListener("click", e => {
    e.preventDefault();
    if(body.dataset.pushed){
      if((P.pushed || 0) > 0 && history.length > 1){ history.back(); return; }
      P.nav("#/" + (cur ? cur.mode : "home")); return;
    }
    P.nav("#/home");
  });
  route();
})();
