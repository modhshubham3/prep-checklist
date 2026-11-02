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
      lastKey = key; return;
    }
    // Leaving the interview screens: close open overlays first (practice may ask "interview chhod rahe ho?").
    if(window.prepShell && !window.prepShell.closeAll()){ P.nav("#/interview"); return; }
    const host = root(r.mode);
    (r.mode === "home" ? renderHome : (P.mods[r.mode] || { render(h){ h.textContent = "Coming soon"; } }).render)(host, r.id);
    if(key !== lastKey) host.scrollTop = 0;
    lastKey = key;
  }
  P.route = route;

  /* ---------------- Home ---------------- */
  function nextLesson(){ return (window.LEARN || []).find(l => !(S.learn[l.id] || {}).done); }
  function nextProblem(){ return (window.LAB || []).find(x => !(S.lab[x.id] || {}).solved); }
  function nextScenario(){ return (window.DECIDE || []).find(d => !S.decide[d.id]); }

  function renderHome(host){
    host.innerHTML = "";
    const h = el("div", "home-hero");
    h.append(el("h1", null, "Khud likho. Khud socho."), el("p", "mod-sub", "Yahan AI jawab nahi deta — tumhara dimaag kaam karta hai. Roz 30 minute, chhote steps."));
    host.appendChild(h);
    host.appendChild(el("p", "streak", "🔥 " + P.streak() + " din ka streak"));

    const today = el("div", "pbox today"); today.appendChild(el("h3", null, "Aaj ka kaam (≈ 30 min)"));
    const rows = [
      ["📖", "Seekho · 10 min", nextLesson(), l => l.title, l => "#/learn/" + l.id, "Saare lessons ho gaye ✓"],
      ["🧩", "Code Lab · 15 min", nextProblem(), x => x.title, x => "#/lab/" + x.id, "Saare problems solve ✓"],
      ["⚖️", "Decision Lab · 5 min", nextScenario(), d => d.title, d => "#/decide/" + d.id, "Saare scenarios ho gaye ✓"],
    ];
    rows.forEach(([ic, label, item, title, hash, doneMsg]) => {
      const r = el("button", "trow"); r.type = "button";
      r.append(el("span", "trow-i", ic), el("span", "trow-t", ""), el("span", "co-n", "›"));
      r.children[1].append(el("small", null, label), el("strong", null, item ? title(item) : doneMsg));
      if(item) r.addEventListener("click", () => P.nav(hash(item))); else r.disabled = true;
      today.appendChild(r);
    });
    host.appendChild(today);

    const total = (arr, f) => (arr || []).filter(f).length;
    const stats = {
      learn: total(window.LEARN, l => (S.learn[l.id] || {}).done) + " / " + (window.LEARN || []).length + " lessons",
      lab: total(window.LAB, x => (S.lab[x.id] || {}).solved) + " / " + (window.LAB || []).length + " solve",
      logic: "Roz naya challenge",
      decide: total(window.DECIDE, d => S.decide[d.id]) + " / " + (window.DECIDE || []).length + " scenarios",
      interview: "Purana prep app — answers, practice, jobs",
    };
    const grid = el("div", "pcards big");
    [["learn", "📖", "Seekho", "Concepts animation ke saath"], ["lab", "🧩", "Code Lab", "Live code, tests, hints"], ["logic", "🧠", "Logic Gym", "Dry-run + approach drills"],
     ["decide", "⚖️", "Decision Lab", "Faisla lena seekho"], ["interview", "🎯", "Interview Prep", "Answers, mock, jobs tracker"]].forEach(([go, ic, t, s]) => {
      const c = el("button", "pcard"); c.type = "button";
      c.append(el("span", "pcard-ic", ic), el("strong", null, t), el("span", "pcard-s", s), el("span", "pcard-tick", stats[go]));
      c.addEventListener("click", () => P.nav("#/" + go));
      grid.appendChild(c);
    });
    host.appendChild(grid);

    const rules = el("div", "callout");
    rules.innerHTML = "<b>Rules (apne aap se):</b><br>1. Pehle khud likho — approach, phir code.<br>2. Hint tabhi jab ek baar run kar chuke ho.<br>3. Solution sirf 5 koshish + 3 hints ke baad.<br>4. Office mein bhi: Claude ko dene se pehle 10 minute khud soch ke kuch likho.";
    host.appendChild(rules);
  }

  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", route);
  document.querySelectorAll("#pnav button").forEach(b => b.addEventListener("click", () => P.nav("#/" + b.dataset.go)));
  const brand = document.getElementById("brand"); if(brand) brand.addEventListener("click", e => { e.preventDefault(); P.nav("#/home"); });
  route();
})();
