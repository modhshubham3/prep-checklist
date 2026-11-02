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
  const show = v => typeof v === "string" ? JSON.stringify(v) : JSON.stringify(v);

  /* ---------------- Code Lab: list ---------------- */
  let levelFilter = 0;
  function list(root){
    root.appendChild(P.header("Code Lab", { label: "Home", hash: "#/home" }, "Chhote problems, live code, bina AI ke. Pehle approach likho, phir code."));
    const solved = LAB().filter(x => lab(x.id).solved).length;
    root.appendChild(el("p", "note", solved + " / " + LAB().length + " solve kiye"));
    const chips = el("div", "pchips");
    [[0, "Sab"], [1, "Level 1 — Basics"], [2, "Level 2"], [3, "Level 3"]].forEach(([lv, t]) => {
      const b = btn(t, "pchip" + (levelFilter === lv ? " on" : ""), () => { levelFilter = lv; P.route(); }); chips.appendChild(b);
    });
    root.appendChild(chips);
    const grid = el("div", "pcards");
    LAB().filter(x => !levelFilter || x.level === levelFilter).forEach(x => {
      const s = lab(x.id), c = el("button", "pcard" + (s.solved ? " done" : "")); c.type = "button";
      c.append(el("span", "pcard-n", "L" + x.level), el("strong", null, x.title), el("span", "pcard-s", x.topic));
      if(s.solved) c.appendChild(el("span", "pcard-tick", s.clean ? "✓ Khud solve kiya" : "✓ Solve (help ke saath)"));
      else if(s.runs) c.appendChild(el("span", "pcard-tick warn", s.runs + " koshish"));
      c.addEventListener("click", () => P.nav("#/lab/" + x.id));
      grid.appendChild(c);
    });
    if(!LAB().length) grid.appendChild(el("p", "note", "Exercises load nahi hue."));
    root.appendChild(grid);
  }

  /* ---------------- Code Lab: one exercise ---------------- */
  function detail(root, x){
    const s = lab(x.id);
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
    const at = el("textarea", "note-ta"); at.rows = 4; at.value = s.approach || ""; at.placeholder = "Step 1: … Step 2: … (apni bhasha mein, galat ho to bhi chalega)";
    const cnt = el("p", "note small"); const go = btn("Approach ready — editor kholo", "pbtn");
    const editor = el("div", "pbox"); editor.hidden = true;
    const upd = () => { const n = at.value.trim().length; cnt.textContent = n >= MIN_APPROACH ? "Achha hai ✓" : n + " / " + MIN_APPROACH + " characters — thoda aur likho"; go.disabled = n < MIN_APPROACH; };
    at.addEventListener("input", () => { s.approach = at.value; P.save(); upd(); });
    go.addEventListener("click", () => { editor.hidden = false; go.hidden = true; editor.scrollIntoView({ behavior: "smooth", block: "start" }); });
    upd(); ap.append(at, cnt, go); root.appendChild(ap);
    if((s.approach || "").trim().length >= MIN_APPROACH){ editor.hidden = false; go.hidden = true; }

    /* Step 2: editor */
    editor.appendChild(el("h3", null, "2. Ab code likho"));
    const ta = P.codeBox(s.code || x.starter, 12);
    ta.addEventListener("input", () => { s.code = ta.value; P.save(); });
    const results = el("div", "results"); const hintsBox = el("div", "hints");
    const bar = el("div", "pctl");
    const runB = btn("▶ Run tests", "pbtn", doRun);
    const hintB = btn("", "pbtn ghost", doHint), aiB = btn("🤖 AI tutor se poochho", "pbtn ghost", doAI), solB = btn("Solution dekho", "pbtn ghost danger", doSolution);
    const resetB = btn("Reset", "pbtn ghost", () => { if(confirm("Code starter par wapas le jaayein?")){ ta.value = x.starter; s.code = x.starter; P.save(); } });
    bar.append(runB, hintB, aiB, solB, resetB);
    editor.append(ta, bar, results, hintsBox);
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
      if(r.error){ results.appendChild(el("div", "rerr", "⚠ " + r.error)); return; }
      if(r.logs && r.logs.length) results.appendChild(el("pre", "cons", r.logs.join("\n")));
      let pass = 0; lastFail = [];
      const table = el("div", "rtable");
      r.results.forEach((o, i) => {
        const t = x.tests[i]; if(o.ok) pass++;
        const row = el("div", "rrow " + (o.ok ? "ok" : "bad"));
        if(t.hidden){
          row.textContent = (o.ok ? "✓" : "✗") + " Hidden test " + (i + 1) + (o.ok ? "" : " — edge case chhoot raha hai: " + x.edge.join(" · "));
        } else {
          row.textContent = (o.ok ? "✓ " : "✗ ") + x.fn + "(" + t.args.map(show).join(", ") + ")  →  expected " + show(t.expect) + (o.ok ? "" : ", mila " + (o.err ? "error: " + o.err : o.got));
          if(!o.ok) lastFail.push({ args: t.args, expect: t.expect, got: o.err ? "error: " + o.err : o.got });
        }
        table.appendChild(row);
      });
      results.appendChild(el("p", "rsum " + (pass === r.results.length ? "ok" : "bad"), pass + " / " + r.results.length + " tests pass"));
      results.appendChild(table);
      return pass === r.results.length;
    }
    async function doRun(){
      runB.disabled = true; results.textContent = "chal raha hai…";
      const r = await P.run(ta.value, { fn: x.fn, tests: x.tests });
      runB.disabled = false;
      s.runs = (s.runs || 0) + 1; P.touchDay();
      const allPass = paintResults(r);
      if(allPass && !s.solved){
        s.solved = true; s.clean = !(s.hints || 0) && !s.shown && !(s.ai || 0); s.t = Date.now(); P.save();
        celebrate();
      } else P.save();
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
  const dayNum = () => Math.floor(Date.now() / 864e5);
  function nextProblem(){ return LAB().find(x => !lab(x.id).solved); }
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
    const pool = LEARN().filter(l => (S.dry[l.id] || {}).right !== true);
    const l = pool.length ? pool[dayNum() % pool.length] : LEARN()[dayNum() % Math.max(1, LEARN().length)];
    if(l){
      const pre = el("pre", "code-list"); l.code.forEach((line, i) => { const r = el("div", "cl"); r.append(el("span", "cl-n", String(i + 1)), el("span", "cl-t", line || " ")); pre.appendChild(r); });
      d2.appendChild(pre); d2.appendChild(el("p", "pq", l.predict.q));
      const opts = el("div", "popts"), fb = el("div", "pfeedback");
      l.predict.options.forEach((o, n) => opts.appendChild(btn(o, "popt", () => {
        const ok = n === l.predict.answer; S.dry[l.id] = { right: ok }; P.save(); P.touchDay();
        [...opts.children].forEach((b, k) => { b.disabled = true; b.classList.toggle("right", k === l.predict.answer); b.classList.toggle("wrong", k === n && !ok); });
        fb.className = "pfeedback " + (ok ? "ok" : "bad"); fb.append(el("b", null, ok ? "Sahi! " : "Galat. "), document.createTextNode(l.predict.why));
      })));
      d2.append(opts, fb);
      const right = LEARN().filter(y => (S.dry[y.id] || {}).right).length;
      d2.appendChild(el("p", "note small", "Dry-run sahi: " + right + " / " + LEARN().length + " · kal naya aayega"));
    }
    root.appendChild(d2);

    // 3. approach drill
    const d3 = el("div", "pbox"); d3.appendChild(el("h3", null, "3. Approach drill — sirf soch, code nahi"));
    const pickable = LAB().filter(x => x.level >= 1); const x = pickable[(dayNum() * 7 + 3) % Math.max(1, pickable.length)];
    if(x){
      const pp = el("p", "prompt"); pp.innerHTML = rich(x.prompt); d3.appendChild(pp);
      const ta = el("textarea", "note-ta"); ta.rows = 4; ta.placeholder = "Code mat likho. Sirf steps: pehle ye, phir ye… edge cases bhi.";
      const out = el("div", "pfeedback");
      const chk = btn("Apne steps check karo", "pbtn", () => {
        if(ta.value.trim().length < MIN_APPROACH){ P.toast("Thoda detail mein likho (kam se kam " + MIN_APPROACH + " characters)"); return; }
        out.innerHTML = ""; out.className = "pfeedback"; out.appendChild(el("b", null, "Khud se pucho — kya tumne ye socha?"));
        const ul = el("ul", "aqs"); x.approachQs.forEach(q => ul.appendChild(el("li", null, q))); out.appendChild(ul);
        out.appendChild(el("p", null, "Edge cases: " + x.edge.join(" · "))); out.appendChild(el("p", "hint", "Key idea: " + x.hints[1]));
        P.touchDay();
      });
      const c3 = el("div", "pctl"); c3.appendChild(chk);
      d3.append(ta, c3, out);
    }
    root.appendChild(d3);
  }

  P.mods.lab = { render(root, id){ root.innerHTML = ""; const x = id && LAB().find(y => y.id === id); if(x) detail(root, x); else list(root); } };
  P.mods.logic = { render(root){ root.innerHTML = ""; logic(root); } };
})();
