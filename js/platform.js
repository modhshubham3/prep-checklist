/* Platform router + Home. Modes (body[data-mode]): home | learn | lab | logic | decide | interview.
   "interview" is the original prep app (tabs handled by shell.js). Hash routes: #/home  #/learn[/id]  #/lab[/id]  #/logic  #/decide[/id]  #/interview  #/<old tab>. */
(() => {
  const { el, btn, S } = P;
  const MODS = ["home", "learn", "lab", "logic", "decide"];
  const TABS = ["plan", "answers", "checklist", "practice", "cheat", "diary"];
  const root = id => document.getElementById("m-" + id);

  function parse(){
    if(/[?&](q|quiz|drill)=/.test(location.search)) return { mode: "interview" };       // notification deep links
    const m = /^#\/([a-z]+)(?:\/([a-z0-9-]+))?$/.exec(location.hash);
    if(!m) return { mode: "home" };
    if(MODS.includes(m[1])) return { mode: m[1], id: m[2] || "" };
    if(m[1] === "interview" || TABS.includes(m[1])) return { mode: "interview" };
    return { mode: "home" };
  }

  let lastKey = "";
  function route(){
    const r = parse(), key = r.mode + "/" + (r.id || "");
    document.body.dataset.mode = r.mode;
    document.querySelectorAll("#pnav button").forEach(b => { if(b.dataset.go === r.mode) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    document.querySelectorAll("#platform .mod").forEach(m => { m.classList.toggle("on", m.id === "m-" + r.mode); m.inert = m.id !== "m-" + r.mode; });
    if(r.mode === "interview"){
      if(!location.hash || location.hash === "#/interview"){ try{ history.replaceState(null, "", "#/answers" + location.search); }catch(e){} }
      if(window.prepShell) window.prepShell.fromHash();
      lastKey = key; paintMini(); return;
    }
    // Leaving the interview screens: close open overlays first (practice may ask "interview chhod rahe ho?").
    if(window.prepShell && !window.prepShell.closeAll()){ P.nav("#/interview"); return; }
    const host = root(r.mode);
    (r.mode === "home" ? renderHome : (P.mods[r.mode] || { render(h){ h.textContent = "Coming soon"; } }).render)(host, r.id);
    if(key !== lastKey) host.scrollTop = 0;
    lastKey = key; paintMini();
  }
  P.route = route;

  /* ---------------- Home: fitness-tracker style "Today" ---------------- */
  const NS = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs) => { const e = document.createElementNS(NS, tag); for(const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const KINDS = [["learn", "Seekho", "📖", "Predict, animation, playground"], ["code", "Code Lab", "🧩", "Code runs + solves"], ["mind", "Mind", "🧠", "Decisions, dry-run, drills"]];
  const DAY = ["R", "S", "M", "T", "W", "T", "F"];                         // getDay(): Sun=0 -> labelled below from the date itself
  const dayLetter = d => ["S", "M", "T", "W", "T", "F", "S"][new Date(d + "T12:00:00").getDay()];

  function ringsSvg(date){
    const root = svg("svg", { viewBox: "0 0 140 140", class: "rings", role: "img" });
    const parts = [];
    [["learn", 60], ["code", 46], ["mind", 32]].forEach(([k, r]) => {
      const C = 2 * Math.PI * r, p = P.ring(k, date);
      root.appendChild(svg("circle", { cx: 70, cy: 70, r, class: "ring-track" }));
      if(p > 0){
        const arc = svg("circle", { cx: 70, cy: 70, r, class: "ring-arc r-" + k, "stroke-dasharray": C + " " + C, "stroke-dashoffset": C, transform: "rotate(-90 70 70)" });
        requestAnimationFrame(() => requestAnimationFrame(() => arc.setAttribute("stroke-dashoffset", C * (1 - p))));
        root.appendChild(arc);
      }
      parts.push(k + " " + Math.round(p * 100) + "%");
    });
    root.setAttribute("aria-label", "Aaj ke goals: " + parts.join(", "));
    return root;
  }

  function badges(){
    const solved = (window.LAB || []).filter(x => (S.lab[x.id] || {}).solved).length, clean = (window.LAB || []).filter(x => (S.lab[x.id] || {}).clean).length;
    const lessons = (window.LEARN || []).filter(l => (S.learn[l.id] || {}).done).length, dec = (window.DECIDE || []).filter(d => S.decide[d.id]).length, sk = P.streak();
    const all3 = Object.keys(S.act).some(d => ["learn", "code", "mind"].every(k => P.ring(k, d) >= 1));
    return [["🌱", "Pehla kadam", "Koi bhi ek activity", S.days.length > 0], ["🔥", "3 din", "3 din ka streak", sk >= 3], ["⚡", "7 din", "7 din ka streak", sk >= 7],
      ["🧩", "5 solve", "5 problems solve karo", solved >= 5], ["🏆", "15 solve", "15 problems solve karo", solved >= 15], ["★", "Bina help", "3 problems bina hint ke", clean >= 3],
      ["📖", "5 lessons", "5 lessons complete", lessons >= 5], ["⚖️", "5 faisle", "5 decisions", dec >= 5], ["🎯", "Teeno rings", "Ek din mein teeno goals poore", all3]];
  }

  function renderHome(host){
    host.innerHTML = "";
    const t = P.today(), a = P.actOf(t), tot = KINDS.reduce((n, [k]) => n + P.ring(k, t), 0) / 3;

    const top = el("div", "tday");
    const when = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
    const tt = el("div"); tt.append(el("small", null, when.toUpperCase()), el("h1", null, "Aaj"));
    top.append(tt, el("span", "pill", "🔥 " + P.streak() + " din")); host.appendChild(top);

    // rings + legend
    const card = el("div", "ringcard"), figure = el("div", "ringfig");
    figure.appendChild(ringsSvg(t));
    const c = el("div", "ring-c"); c.append(el("b", null, Math.round(tot * 100) + "%"), el("small", null, "goal")); figure.appendChild(c);
    const legend = el("div", "ringleg");
    KINDS.forEach(([k, name, ic, sub]) => {
      const row = el("div", "leg"); const sw = el("span", "sw sw-" + k);
      const txt = el("div"); txt.append(el("strong", null, ic + " " + name), el("small", null, sub));
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

    // continue (music-player style)
    const L = S.last;
    const nl = (window.LEARN || []).find(l => !(S.learn[l.id] || {}).done);
    const cont = el("button", "cont"); cont.type = "button";
    if(L && !(L.kind === "learn" ? (S.learn[L.id] || {}).done : (S.lab[L.id] || {}).solved)){
      cont.appendChild(P.cover(L.hue || 200, L.icon || "▶", "sm"));
      const m = el("span", "cont-t"); m.append(el("small", null, "CONTINUE"), el("strong", null, L.title), el("small", null, L.kind === "learn" ? "Seekho · step " + L.pos + " / " + L.total : "Code Lab · " + (L.runs || 0) + " koshish"));
      cont.appendChild(m);
      if(L.kind === "learn"){ const bar = el("span", "cont-bar"); bar.style.setProperty("--p", (100 * L.pos / L.total) + "%"); cont.appendChild(bar); }
      cont.appendChild(el("span", "cont-play", "▶"));
      cont.addEventListener("click", () => P.nav("#/" + (L.kind === "learn" ? "learn/" : "lab/") + L.id));
    } else if(nl){
      cont.appendChild(P.cover(250, P.LESSON_ICON[nl.id] || "📘", "sm"));
      const m = el("span", "cont-t"); m.append(el("small", null, "UP NEXT"), el("strong", null, nl.title), el("small", null, "Seekho · " + nl.frames.length + " steps"));
      cont.append(m, el("span", "cont-play", "▶")); cont.addEventListener("click", () => P.nav("#/learn/" + nl.id));
    } else { cont.appendChild(el("strong", null, "Saare lessons ho gaye ✓")); cont.disabled = true; }
    host.appendChild(cont);

    // stat tiles
    const cnt = (arr, f) => (arr || []).filter(f).length;
    const tiles = el("div", "stats");
    [["🔥", P.streak(), "din streak"], ["🧩", cnt(window.LAB, x => (S.lab[x.id] || {}).solved), "problems solve"], ["📖", cnt(window.LEARN, l => (S.learn[l.id] || {}).done), "lessons"], ["⚖️", cnt(window.DECIDE, d => S.decide[d.id]), "faisle"]].forEach(([ic, v, lab]) => {
      const x = el("div", "stat"); x.append(el("span", "stat-i", ic), el("b", null, String(v)), el("small", null, lab)); tiles.appendChild(x);
    });
    host.appendChild(tiles);

    // weekly activity chart: one series (total points), today emphasised
    const days = P.lastDays(7), vals = days.map(d => { const o = P.actOf(d); return o.learn + o.code + o.mind; }), max = Math.max(6, ...vals);
    const chart = el("div", "wchart"); chart.appendChild(el("h3", null, "Is hafte ki activity"));
    const bars = el("div", "bars");
    days.forEach((d, i) => {
      const col = el("div", "bcol" + (d === t ? " today" : "")); col.title = d + ": " + vals[i] + " points";
      const bar = el("div", "bar"); bar.style.height = Math.max(vals[i] ? 6 : 3, 100 * vals[i] / max) + "%";
      const wrap = el("div", "barwrap"); wrap.appendChild(bar);
      col.append(el("small", "bv", d === t || vals[i] === max ? String(vals[i]) : ""), wrap, el("small", "bl", dayLetter(d))); bars.appendChild(col);
    });
    chart.appendChild(bars);
    const det = el("details", "tbl"); det.appendChild(el("summary", null, "Table dikhao"));
    const table = el("table"); days.forEach((d, i) => { const r = table.insertRow(); r.insertCell().textContent = d; r.insertCell().textContent = vals[i] + " points"; }); det.appendChild(table);
    chart.appendChild(det); host.appendChild(chart);

    // browse tiles
    host.appendChild(el("h3", "sec", "Browse"));
    const grid = el("div", "browse");
    [["learn", "📖", "Seekho", 265], ["lab", "🧩", "Code Lab", 150], ["logic", "🧠", "Logic Gym", 30], ["decide", "⚖️", "Decision Lab", 330], ["interview", "🎯", "Interview Prep", 200]].forEach(([go, ic, name, h]) => {
      const b = el("button", "btile"); b.type = "button"; b.style.background = "linear-gradient(135deg, hsl(" + h + " 65% 42%), hsl(" + ((h + 40) % 360) + " 70% 26%))";
      b.append(el("strong", null, name), el("span", "btile-i", ic)); b.addEventListener("click", () => P.nav("#/" + go)); grid.appendChild(b);
    });
    host.appendChild(grid);

    // achievements
    host.appendChild(el("h3", "sec", "Achievements"));
    const bd = el("div", "badges");
    badges().forEach(([ic, name, how, on]) => { const b = el("div", "badge" + (on ? " on" : "")); b.title = how; b.append(el("span", "badge-i", on ? ic : "🔒"), el("b", null, name), el("small", null, how)); bd.appendChild(b); });
    host.appendChild(bd);

    const rules = el("div", "callout");
    rules.innerHTML = "<b>Rules:</b> pehle khud likho · hint ek run ke baad · solution 5 koshish + 3 hints ke baad · office mein Claude ko dene se pehle 10 minute khud socho.";
    host.appendChild(rules);
  }

  /* ---------------- mini player: continue where you left off ---------------- */
  function paintMini(){
    const m = document.getElementById("mini"), L = S.last, mode = document.body.dataset.mode, r = parse();
    const finished = !L || (L.kind === "learn" ? (S.learn[L.id] || {}).done : (S.lab[L.id] || {}).solved);
    const here = L && r.id === L.id && r.mode === (L.kind === "learn" ? "learn" : "lab");
    if(!m || finished || mode === "interview" || mode === "home" || here){ if(m) m.hidden = true; return; }
    m.hidden = false; m.innerHTML = "";
    const bar = el("span", "mini-bar"); bar.style.setProperty("--p", L.kind === "learn" ? (100 * L.pos / L.total) + "%" : "0%");
    m.append(P.cover(L.hue || 200, L.icon || "▶", "xs"));
    const t = el("span", "mini-t"); t.append(el("strong", null, L.title), el("small", null, L.kind === "learn" ? "Seekho · step " + L.pos + " / " + L.total : "Code Lab · " + (L.runs || 0) + " koshish"));
    m.append(t, el("span", "cont-play sm", "▶"), bar);
    m.onclick = () => P.nav("#/" + (L.kind === "learn" ? "learn/" : "lab/") + L.id);
  }
  P.paintMini = paintMini;

  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", route);
  document.querySelectorAll("#pnav button").forEach(b => b.addEventListener("click", () => P.nav("#/" + b.dataset.go)));
  const brand = document.getElementById("brand"); if(brand) brand.addEventListener("click", e => { e.preventDefault(); P.nav("#/home"); });
  route();
})();
