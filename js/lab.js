/* Code Lab + Logic Gym.
   Code Lab: approach first -> editor -> run tests (in a Web Worker) -> 3-level hint ladder -> solution only after real attempts.
   Logic Gym: a daily problem, dry-run (predict the output without running), and approach-only drills.
   Data: window.LAB (js/lab-data.js), window.LEARN (js/learn-data.js). */
(() => {
  const { el, btn, rich, S } = P;
  const LAB = () => window.LAB || [];
  const LEARN = () => window.LEARN || [];
  const lab = id => S.lab[id] || (S.lab[id] = {});
  const MIN_APPROACH = 30;                       // characters of own thinking before the editor opens
  const show = v => v === undefined ? "undefined" : JSON.stringify(v);
  const dayIdx = () => { const [y, m, d] = P.today().split("-").map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 864e5); };
  // Friendly dead-end for a bad link like #/lab/nope
  function missing(root, what, listHash, listLabel){
    const b = el("div", "pbox nf"); b.append(el("h3", null, "Ye " + what + " nahi mila"), el("p", "note", "Link purana ya galat lag raha hai. List se dobara chuno."));
    const r = el("div", "pctl"); r.appendChild(btn(listLabel + " ›", "pbtn", () => P.nav(listHash))); b.appendChild(r); root.appendChild(b);
  }
  P.notFound = missing;

  /* ---------------- Code Lab: list (playlist style) ---------------- */
  let levelFilter = 0;
  const topicArt = x => P.TOPIC[x.topic] || [200, "🧩"];
  function tile(x){
    const s = lab(x.id), [h, ic] = topicArt(x);
    const c = el("button", "tile" + (s.solved ? " done" : "")); c.type = "button";
    const art = P.cover(h, ic, "tilecover"); art.appendChild(el("span", "lvl", "L" + x.level));
    if(s.solved) art.appendChild(el("span", "tick", s.clean ? "★" : "✓"));
    c.append(art, el("strong", null, x.title), el("small", null, s.solved ? (s.clean ? "Khud solve kiya" : "Help ke saath") : s.runs ? s.runs + " koshish" : x.topic));
    c.addEventListener("click", () => P.nav("#/lab/" + x.id));
    return c;
  }
  function list(root){
    root.appendChild(P.header("", { label: "Home", hash: "#/home" }));
    const L = LAB(), solved = L.filter(x => lab(x.id).solved).length, clean = L.filter(x => lab(x.id).clean).length;
    const next = L.find(x => !lab(x.id).solved);
    const hero = el("div", "mix");
    const info = el("div", "mix-info");
    info.append(el("small", null, "DAILY MIX"), el("h1", null, next ? next.title : "Sab solve!"),
      el("p", null, next ? "Level " + next.level + " · " + next.topic + " · pehle approach, phir code" : "Ab inhe bina dekhe dobara likho"));
    if(next){ info.appendChild(btn("▶  Shuru karo", "pbtn big", () => P.nav("#/lab/" + next.id))); }
    const [h, ic] = next ? topicArt(next) : [150, "🏆"];
    hero.append(P.cover(h, ic, "mixcover"), info); root.appendChild(hero);
    root.appendChild(el("p", "note", solved + " / " + L.length + " solve · " + clean + " bina help ke ★"));

    const chips = el("div", "pchips");
    [[0, "Sab"], [1, "Level 1"], [2, "Level 2"], [3, "Level 3"]].forEach(([lv, t]) => chips.appendChild(btn(t, "pchip" + (levelFilter === lv ? " on" : ""), () => { levelFilter = lv; P.route(); })));
    root.appendChild(chips);

    const topics = []; L.filter(x => !levelFilter || x.level === levelFilter).forEach(x => { let g = topics.find(t => t.n === x.topic); if(!g) topics.push(g = { n: x.topic, items: [] }); g.items.push(x); });
    topics.forEach(g => {
      const sec = el("section", "shelf"), head = el("div", "shelf-h");
      head.append(el("h3", null, topicArt(g.items[0])[1] + " " + g.n), el("small", null, g.items.filter(x => lab(x.id).solved).length + " / " + g.items.length));
      const row = el("div", "shelf-row"); g.items.forEach(x => row.appendChild(tile(x)));
      sec.append(head, row); root.appendChild(sec);
    });
    if(!L.length) root.appendChild(el("p", "note", "Exercises load nahi hue."));
  }

  /* ---------------- Code Lab: one exercise ---------------- */
  function detail(root, x){
    const s = lab(x.id);
    if(!s.solved){ const [h, ic] = topicArt(x); P.setLast({ kind: "lab", id: x.id, title: x.title, icon: ic, hue: h, runs: s.runs || 0 }); }
    root.appendChild(P.header(x.title, { label: "Saare problems", hash: "#/lab" }, "Level " + x.level + " · " + x.topic));
    const pr = el("div", "pbox"); const p = el("p", "prompt"); p.innerHTML = rich(x.prompt); pr.appendChild(p);
    const vis = x.tests.filter(t => !t.hidden).slice(0, 3);
    const ex = el("div", "examples"); ex.appendChild(el("h4", null, "Examples"));
    vis.forEach(t => ex.appendChild(el("code", "ex-row", x.fn + "(" + t.args.map(show).join(", ") + ")  →  " + show(t.expect))));
    pr.appendChild(ex); root.appendChild(pr);

    /* Step 1: approach */
    const ap = el("div", "pbox"); ap.appendChild(el("h3", null, "1. Pehle socho — approach likho"));
    ap.appendChild(el("p", "note", "Code se pehle apne shabdon mein steps likho. Ye hi wo muscle hai jo office mein khud kaam karne mein kaam aayegi."));
    const qs = el("ul", "aqs"); x.approachQs.forEach(q => qs.appendChild(el("li", null, q))); ap.appendChild(qs);
    const at = el("textarea", "note-ta"); at.rows = 4; at.setAttribute("aria-label", "Apna approach likho"); at.value = s.approach || ""; at.placeholder = "Step 1: … Step 2: … (apni bhasha mein, galat ho to bhi chalega)";
    const cnt = el("p", "note small"); const go = btn("Approach ready — editor kholo", "pbtn");
    const editor = el("div", "pbox"); editor.hidden = true;
    const upd = () => {
      const n = at.value.trim().length, ok = P.thoughtOk(at.value, MIN_APPROACH);
      cnt.textContent = ok ? "Achha hai ✓" : n >= MIN_APPROACH ? "Alag-alag shabdon mein steps likho (ek hi akshar baar-baar nahi)" : n + " / " + MIN_APPROACH + " characters — thoda aur likho";
      go.disabled = !ok;
    };
    at.addEventListener("input", () => { s.approach = at.value; P.save(); upd(); });
    go.addEventListener("click", () => { editor.hidden = false; go.hidden = true; editor.scrollIntoView({ behavior: "smooth", block: "start" }); });
    upd(); ap.append(at, cnt, go); root.appendChild(ap);
    if(P.thoughtOk(s.approach, MIN_APPROACH)){ editor.hidden = false; go.hidden = true; }

    /* Step 2: editor */
    editor.appendChild(el("h3", null, "2. Ab code likho"));
    const ta = P.codeBox(s.code || x.starter, 12, "Code editor — " + x.title);
    ta.addEventListener("input", () => { s.code = ta.value; P.save(); });
    P.autosize(ta);
    const results = el("div", "results"); const hintsBox = el("div", "hints");
    const bar = el("div", "pctl");
    const runB = btn("▶ Run tests", "pbtn", doRun);
    const hintB = btn("", "pbtn ghost", doHint), aiB = btn("🤖 AI tutor se poochho", "pbtn ghost", doAI), solB = btn("Solution dekho", "pbtn ghost danger", doSolution);
    const resetB = btn("Reset", "pbtn ghost", () => { if(confirm("Code starter par wapas le jaayein?")){ ta.value = x.starter; s.code = x.starter; P.save(); ta.dispatchEvent(new Event("input")); } });
    bar.append(runB, hintB, aiB, solB, resetB);
    editor.append(ta, ta.hint, bar, results, hintsBox);
    root.appendChild(editor);

    let lastFail = [];
    function ladder(){
      const n = s.hints || 0, runs = s.runs || 0;
      hintB.hidden = n >= 3 || !!s.solved;
      hintB.textContent = "Hint " + (n + 1) + " / 3";
      hintB.disabled = runs <= n;                                   // need a real attempt before every hint
      hintB.title = runs <= n ? "Pehle code run karke dekho — phir hint" : "";
      aiB.hidden = n < 1 || (s.ai || 0) >= 3 || !!s.solved;
      solB.hidden = !!s.solved || s.shown;
      solB.disabled = !(runs >= 5 && n >= 3);
      solB.title = solB.disabled ? "Solution tab khulega jab 5 baar try kar loge aur teeno hints dekh loge" : "";
      hintsBox.innerHTML = "";
      x.hints.slice(0, n).forEach((h, i) => { const d = el("div", "hint"); d.append(el("b", null, "Hint " + (i + 1) + ": "), document.createTextNode(h)); hintsBox.appendChild(d); });
      if(s.aiTexts) s.aiTexts.forEach(t => { const d = el("div", "hint ai"); d.append(el("b", null, "AI tutor: "), document.createTextNode(t)); hintsBox.appendChild(d); });
    }
    function paintResults(r){
      results.innerHTML = "";
      if(r.logs && r.logs.length) results.appendChild(el("pre", "cons", r.logs.join("\n")));
      if(r.error){ results.appendChild(el("div", "rerr", "⚠ " + r.error)); return false; }
      let pass = 0; lastFail = [];
      const table = el("div", "rtable"); let hiddenFail = 0;
      r.results.forEach((o, i) => {
        const t = x.tests[i]; if(o.ok) pass++;
        const row = el("div", "rrow " + (o.ok ? "ok" : "bad"));
        if(t.hidden){
          if(!o.ok) hiddenFail++;
          row.textContent = (o.ok ? "✓" : "✗") + " Hidden test " + (i + 1) + (o.ok ? "" : " — ek edge case chhoot raha hai");
        } else {
          row.textContent = (o.ok ? "✓ " : "✗ ") + x.fn + "(" + t.args.map(show).join(", ") + ")  →  expected " + show(t.expect) + (o.ok ? "" : ", mila " + (o.err ? "error: " + o.err : o.got));
          if(!o.ok) lastFail.push({ args: t.args, expect: t.expect, got: o.err ? "error: " + o.err : o.got });
        }
        table.appendChild(row);
      });
      results.appendChild(el("p", "rsum " + (pass === r.results.length ? "ok" : "bad"), pass + " / " + r.results.length + " tests pass"));
      results.appendChild(table);
      if(hiddenFail >= 2) results.appendChild(el("p", "note small", "Ye edge cases socho: " + x.edge.join(" · ")));
      return pass === r.results.length;
    }
    const flat = c => String(c || "").replace(/\s+/g, "");
    async function doRun(){
      runB.disabled = true; results.textContent = "chal raha hai…";
      const code = ta.value, fresh = s.lastRun == null || flat(code) !== flat(s.lastRun);   // same code again is not a new attempt
      const r = await P.run(code, { fn: x.fn, tests: x.tests });
      runB.disabled = false;
      if(fresh){ s.runs = (s.runs || 0) + 1; s.lastRun = code; P.log("code", 1, "run:" + x.id, 2); }
      const allPass = paintResults(r);
      if(!fresh) results.insertBefore(el("p", "note small", "Code pichhli run jaisa hi hai — ye koshish mein nahi gina gaya. Kuch badlo, phir run karo."), results.firstChild);
      if(allPass && !s.solved){
        s.solved = true; s.clean = !(s.hints || 0) && !s.shown && !(s.ai || 0); s.t = Date.now(); P.log("code", 2, "!solve:" + x.id); P.save();
        celebrate();
      } else P.save();
      P.patchLast("lab", x.id, { runs: s.runs || 0 });
      ladder();
    }
    function doHint(){ s.hints = Math.min(3, (s.hints || 0) + 1); P.save(); ladder(); }
    async function doAI(){
      aiB.disabled = true; aiB.textContent = "soch raha hai…";
      try{
        const r = await fetch("/api/tutor", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: x.title, prompt: x.prompt, code: ta.value, approach: s.approach || "", failing: lastFail.slice(0, 3), level: s.hints || 1 }) });
        const j = await r.json().catch(() => ({}));
        if(!r.ok || !j.hint) throw new Error(j.error || r.status);
        s.ai = (s.ai || 0) + 1; (s.aiTexts = s.aiTexts || []).push(j.hint); P.save();
      }catch(e){ P.toast("AI tutor abhi available nahi — upar ke hints use karo"); }
      aiB.disabled = false; aiB.textContent = "🤖 AI tutor se poochho"; ladder();
    }
    function doSolution(){
      if(!confirm("Solution dekhne ke baad ye 'help ke saath' solve gina jayega. Pehle ek baar aur khud try nahi karoge?")) return;
      s.shown = true; P.save(); celebrate(true); ladder();
    }
    function celebrate(viaSolution){
      const box = el("div", "pbox win");
      if(window.Mascot && !viaSolution){ const m = Mascot.create({ size: 88, mood: "celebrate" }); m.classList.add("win-boltu"); box.appendChild(m); }
      box.appendChild(el("h3", null, viaSolution ? "Solution — isse padho, phir band karke KHUD dobara likho" : "✅ Solve ho gaya!" + (s.clean ? " Bina hint ke!" : "")));
      const why = el("p"); why.innerHTML = rich(x.why); box.appendChild(why);
      box.appendChild(el("p", "note", "Edge cases jo hamesha socho: " + x.edge.join(" · ")));
      const det = el("details", "sol"); det.open = !!viaSolution; det.appendChild(el("summary", null, "Reference solution — apne code se compare karo"));
      det.appendChild(el("pre", "cons big", x.solution)); box.appendChild(det);
      const row = el("div", "pctl");
      const i = LAB().findIndex(y => y.id === x.id), nx = LAB()[i + 1];
      if(nx) row.appendChild(btn("Agla problem ›", "pbtn", () => P.nav("#/lab/" + nx.id)));
      row.appendChild(btn("Saare problems", "pbtn ghost", () => P.nav("#/lab")));
      box.appendChild(row);
      const old = root.querySelector(".pbox.win"); if(old) old.remove();
      root.appendChild(box); if(!viaSolution) P.toast("Solve ho gaya 🎉"); box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    ladder();
    if(s.solved || s.shown) celebrate(!s.solved);
  }

  /* ---------------- Logic Gym ---------------- */
  function nextProblem(){ return LAB().find(x => !lab(x.id).solved); }
  // Today's dry-run question is chosen ONCE per day and remembered (S.dayq), so reloading shows the same question (and a wrong
  // answer stays answered). Tomorrow the day changes and a different lesson is picked.
  function todaysDry(){
    const t = P.today(), L = LEARN(); if(!L.length) return null;
    let q = S.dayq;
    if(q && q.d === t && L.some(l => l.id === q.id)) return q;
    const pool = L.filter(l => (S.dry[l.id] || {}).right !== true), arr = pool.length ? pool : L;
    let pick = arr[dayIdx() % arr.length];
    if(q && pick.id === q.id && arr.length > 1) pick = arr[(arr.indexOf(pick) + 1) % arr.length];
    S.dayq = { d: t, id: pick.id, pick: null, prev: q ? q.id : "", drill: "" }; P.save();
    return S.dayq;
  }
  function logic(root){
    root.appendChild(P.header("Logic Gym", { label: "Home", hash: "#/home" }, "Roz thoda dimaag ki kasrat. 20 minute, bina AI ke."));
    root.appendChild(el("p", "streak", "🔥 " + P.streak() + " din ka streak"));

    // 1. daily problem
    const d1 = el("div", "pbox"); d1.appendChild(el("h3", null, "1. Aaj ka problem"));
    const np = nextProblem();
    if(np){
      d1.appendChild(el("p", "note", "Level " + np.level + " · " + np.topic)); d1.appendChild(el("strong", null, np.title));
      const row = el("div", "pctl"); row.appendChild(btn("Shuru karo ›", "pbtn", () => P.nav("#/lab/" + np.id))); d1.appendChild(row);
    } else d1.appendChild(el("p", "note", "Saare problems solve! Ab inko bina dekhe dobara likhne ki koshish karo."));
    root.appendChild(d1);

    // 2. dry-run
    const d2 = el("div", "pbox"); d2.appendChild(el("h3", null, "2. Dry-run — bina chalaye output batao"));
    d2.appendChild(el("p", "note", "Code ko dimaag mein chalana hi asli logic hai. Compiler ka kaam khud karo."));
    const dq = todaysDry(), l = dq && LEARN().find(y => y.id === dq.id);
    if(l){
      const pre = el("pre", "code-list"); l.code.forEach((line, i) => { const r = el("div", "cl"); r.append(el("span", "cl-n", String(i + 1)), el("span", "cl-t", line || " ")); pre.appendChild(r); });
      d2.appendChild(pre);
      const pq = el("p", "pq"); pq.innerHTML = rich(l.predict.q); d2.appendChild(pq);
      const opts = el("div", "popts"), fb = el("div", "pfeedback");
      const reveal = n => {
        const ok = n === l.predict.answer;
        [...opts.children].forEach((b, k) => { b.disabled = true; b.classList.toggle("right", k === l.predict.answer); b.classList.toggle("wrong", k === n && !ok); });
        fb.className = "pfeedback " + (ok ? "ok" : "bad"); fb.innerHTML = "";
        const tx = el("div", "fb-text"); tx.appendChild(el("b", null, ok ? "Sahi! " : "Galat. ")); const w = el("span"); w.innerHTML = rich(l.predict.why); tx.appendChild(w); fb.appendChild(tx);
      };
      l.predict.options.forEach((o, n) => opts.appendChild(btn(o, "popt", () => {
        if(dq.pick != null) return;                                   // one attempt a day, reload does not give another
        const ok = n === l.predict.answer; dq.pick = n; S.dry[l.id] = { right: ok || !!(S.dry[l.id] || {}).right, d: dq.d, pick: n };
        P.save(); P.log("mind", 1, "dry:" + l.id); reveal(n);
        const right = LEARN().filter(y => (S.dry[y.id] || {}).right).length; cntNote.textContent = "Dry-run sahi: " + right + " / " + LEARN().length + " · kal naya aayega";
      })));
      d2.append(opts, fb);
      const right = LEARN().filter(y => (S.dry[y.id] || {}).right).length;
      const cntNote = el("p", "note small", "Dry-run sahi: " + right + " / " + LEARN().length + " · kal naya aayega"); d2.appendChild(cntNote);
      if(dq.pick != null && dq.pick < l.predict.options.length) reveal(dq.pick);
    }
    root.appendChild(d2);

    // 3. approach drill (the same drill all day)
    const d3 = el("div", "pbox"); d3.appendChild(el("h3", null, "3. Approach drill — sirf soch, code nahi"));
    const pickable = LAB().filter(x => x.level >= 1); const x = pickable[(dayIdx() * 5 + 3) % Math.max(1, pickable.length)];
    if(x){
      const pp = el("p", "prompt"); pp.innerHTML = rich(x.prompt); d3.appendChild(pp);
      const ta = el("textarea", "note-ta"); ta.rows = 4; ta.placeholder = "Code mat likho. Sirf steps: pehle ye, phir ye… edge cases bhi."; ta.setAttribute("aria-label", "Approach drill — apne steps likho");
      const out = el("div", "pfeedback blk");
      const showKey = () => {
        out.innerHTML = ""; out.className = "pfeedback blk"; out.appendChild(el("b", null, "Khud se pucho — kya tumne ye socha?"));
        const ul = el("ul", "aqs"); x.approachQs.forEach(q => ul.appendChild(el("li", null, q))); out.appendChild(ul);
        out.appendChild(el("p", null, "Edge cases: " + x.edge.join(" · "))); out.appendChild(el("p", "hint", "Key idea: " + x.hints[1]));
      };
      const chk = btn("Apne steps check karo", "pbtn", () => {
        if(!P.thoughtOk(ta.value, MIN_APPROACH)){ P.toast("Thoda detail mein likho — alag-alag shabdon mein, kam se kam " + MIN_APPROACH + " characters"); return; }
        showKey(); if(S.dayq) S.dayq.drill = x.id; P.save();
        P.log("mind", 1, "drill:" + x.id);
      });
      const c3 = el("div", "pctl"); c3.appendChild(chk);
      d3.append(ta, c3, out);
      if(S.dayq && S.dayq.d === P.today() && S.dayq.drill === x.id){ showKey(); out.insertBefore(el("p", "note small", "Aaj ka drill ho chuka ✓ — kal naya aayega"), out.firstChild); }
    }
    root.appendChild(d3);
  }

  P.mods.lab = { render(root, id){
    root.innerHTML = ""; const x = id && LAB().find(y => y.id === id);
    if(x) detail(root, x); else if(id) missing(root, "problem", "#/lab", "Saare problems"); else list(root);
  } };
  P.mods.logic = { render(root){ root.innerHTML = ""; logic(root); } };
})();
