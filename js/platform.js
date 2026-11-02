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

  function parse(){
    if(/[?&](q|quiz|drill)=/.test(location.search)) return { mode: "interview", tab: "" };       // notification deep links
    const m = /^#\/([a-z]+)(?:\/([a-z0-9-]+))?$/.exec(location.hash);
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

  function keyOf(r){ return r.mode === "career" ? "career" : r.mode === "interview" ? "interview/" + (r.tab || "") : r.mode + "/" + (r.id || ""); }

  function route(o){
    o = o || {};
    if(o.evt){ if(location.href === pendingHref) return; P.pushed = Math.max(0, (P.pushed || 0) - 1); }
    pendingHref = location.href;
    const r = parse(), key = keyOf(r);
    if(!cur){ apply(false); return; }
    if(o.nav && cur.key === key && !(r.mode === "interview" && !r.tab)){        // tapped the screen we are on: back to top
      const sc = scroller(cur); if(sc) sc.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
      return;
    }
    const kind = cur.mode === r.mode && (r.id || "") !== (cur.id || "") ? (r.id ? "fwd" : "back") : "fade";
    const rerender = !o.nav && !o.evt && cur.key === key;                    // P.route() on the visible screen (e.g. decision reset)
    swap(() => apply(rerender), kind);
  }
  P.route = route;

  function apply(rerender){
    const r = parse(), prev = cur;
    if(prev){ const sc = scroller(prev); if(sc) memo[prev.key] = sc.scrollTop; }
    const legacy = r.mode === "interview" || r.mode === "career";
    let next;
    if(legacy){
      const was = body.dataset.mode, tab = r.mode === "career" ? "diary" : (r.tab || (window.prepShell ? prepShell.tabFromHash() : "answers"));
      body.dataset.mode = r.mode;
      if(!location.hash || /^#\/(interview|revise)$/.test(location.hash)){ try{ history.replaceState(null, "", "#/" + tab + location.search); }catch(e){} }
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
      const C = 2 * Math.PI * r, p = P.ring(k, date), from = seen[k] == null ? 0 : seen[k];
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

  function renderHome(host){
    host.replaceChildren();
    const t = P.today(), a = P.actOf(t), tot = KINDS.reduce((n, [k]) => n + P.ring(k, t), 0) / 3;
    const nl = (window.LEARN || []).find(l => !(S.learn[l.id] || {}).done);
    const nx = (window.LAB || []).find(x => !(S.lab[x.id] || {}).solved);
    const nd = (window.DECIDE || []).find(d => !S.decide[d.id]);

    const top = el("div", "tday");
    const when = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
    const tt = el("div"); tt.append(el("small", null, when.toUpperCase()), el("h1", null, "Aaj"));
    const sp = el("span", "spill"); sp.append(P.icon("flame"), document.createTextNode(P.streak() + " din")); top.append(tt, sp);
    host.appendChild(top);

    // the one primary action: today's 30 minutes = a lesson, a problem, a decision
    const tasks = [
      ["learn", "book", nl ? nl.title : "Saare lessons ho gaye", nl ? "Seekho · ~8 min" : "Seekho · dobara dekh sakte ho", P.ring("learn", t) >= 1, nl ? "#/learn/" + nl.id : "#/learn"],
      ["code", "code", nx ? nx.title : "Saare problems solve", nx ? "Code Lab · ~15 min" : "Code Lab · revision", P.ring("code", t) >= 1, nx ? "#/lab/" + nx.id : "#/lab"],
      ["mind", "scale", nd ? nd.title : "Saare faisle ho gaye", nd ? "Decision Lab · ~7 min" : "Decision Lab · revision", P.ring("mind", t) >= 1, nd ? "#/decide/" + nd.id : "#/decide"],
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
      const n = KINDS.filter(([k]) => P.ring(k, d) >= 1).length, any = KINDS.some(([k]) => P.actOf(d)[k] > 0);
      const b = el("div", "wd" + (d === t ? " today" : "") + (n === 3 ? " full" : any ? " some" : ""));
      b.title = d + ": " + n + "/3 goals"; b.append(el("span", "wd-c", n === 3 ? "✓" : any ? "•" : ""), el("small", null, dayLetter(d)));
      week.appendChild(b);
    });
    host.appendChild(week);

    // continue where you left off
    const L = S.last;
    if(L && !(L.kind === "learn" ? (S.learn[L.id] || {}).done : (S.lab[L.id] || {}).solved)){
      const cont = el("button", "cont"); cont.type = "button";
      cont.appendChild(P.cover(L.hue || 200, L.icon || "▶", "sm"));
      const m = el("span", "cont-t"); m.append(el("small", null, "CONTINUE"), el("strong", null, L.title), el("small", null, L.kind === "learn" ? "Seekho · step " + L.pos + " / " + L.total : "Code Lab · " + (L.runs || 0) + " koshish"));
      const pl = el("span", "cont-play"); pl.appendChild(P.icon("play"));
      cont.append(m, pl);
      if(L.kind === "learn"){ const bar = el("span", "cont-bar"); bar.style.setProperty("--pn", L.pos / L.total); cont.appendChild(bar); }
      cont.addEventListener("click", () => P.nav("#/" + (L.kind === "learn" ? "learn/" : "lab/") + L.id));
      host.appendChild(cont);
    }

    const rules = el("div", "callout");
    rules.textContent = "Rules: pehle khud likho · hint ek run ke baad · solution 5 koshish + 3 hints ke baad · office mein Claude ko dene se pehle 10 minute khud socho.";
    host.appendChild(rules);
  }

  /* ---------------- mini player: continue where you left off ---------------- */
  function paintMini(){
    const m = $("mini"), L = S.last, mode = body.dataset.mode, r = parse();
    const finished = !L || (L.kind === "learn" ? (S.learn[L.id] || {}).done : (S.lab[L.id] || {}).solved);
    const here = L && r.id === L.id && r.mode === (L.kind === "learn" ? "learn" : "lab");
    if(!m || finished || mode === "interview" || mode === "career" || mode === "home" || here){ if(m) m.hidden = true; return; }
    m.hidden = false; m.replaceChildren();
    const bar = el("span", "mini-bar"); bar.style.setProperty("--pn", L.kind === "learn" ? L.pos / L.total : 0);
    m.append(P.cover(L.hue || 200, L.icon || "▶", "xs"));
    const t = el("span", "mini-t"); t.append(el("strong", null, L.title), el("small", null, L.kind === "learn" ? "Seekho · step " + L.pos + " / " + L.total : "Code Lab · " + (L.runs || 0) + " koshish"));
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
  document.querySelectorAll("#labseg [data-go]").forEach(b => b.addEventListener("click", () => P.nav("#/" + b.dataset.go)));
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
