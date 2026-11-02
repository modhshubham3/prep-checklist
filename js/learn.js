/* Seekho — styled like a music player.
   Playlist of lessons; each lesson is a "track": predict first, then a Now-Playing view with a scrubber, play/pause,
   speed, loop and the code shown like synced lyrics (the running line is highlighted) beside the variable chips.
   Data: window.LEARN (js/learn-data.js). */
(() => {
  const { el, btn, rich, S } = P;
  const LEARN = () => window.LEARN || [];
  const LAB = () => window.LAB || [];
  const st = id => S.learn[id] || (S.learn[id] = {});
  const icon = l => P.LESSON_ICON[l.id] || "📘";
  const hue = i => (i * 41 + 250) % 360;
  const eq = () => { const e = el("span", "eq"); for(let i = 0; i < 4; i++) e.appendChild(el("i")); return e; };

  /* ---------------- playlist ---------------- */
  function list(root){
    root.appendChild(P.header("", { label: "Home", hash: "#/home" }));
    const L = LEARN(), done = L.filter(l => st(l.id).done).length;
    const hero = el("div", "pl-hero");
    const mosaic = el("div", "mosaic"); L.slice(0, 4).forEach((l, i) => mosaic.appendChild(P.cover(hue(i), icon(l))));
    const info = el("div", "pl-info");
    info.append(el("small", null, "PLAYLIST"), el("h1", null, "Seekho"), el("p", null, L.length + " lessons · " + done + " poore · pehle predict, phir animation"));
    const next = L.find(l => !st(l.id).done) || L[0];
    const play = btn("▶  " + (done ? "Continue" : "Shuru karo"), "pbtn big", () => next && P.nav("#/learn/" + next.id));
    info.appendChild(play); hero.append(mosaic, info); root.appendChild(hero);

    const rows = el("div", "tracks");
    L.forEach((l, i) => {
      const s = st(l.id), cur = S.last && S.last.kind === "learn" && S.last.id === l.id && !s.done;
      const r = el("button", "track" + (s.done ? " done" : "") + (cur ? " cur" : "")); r.type = "button";
      const num = el("span", "track-n"); if(cur) num.appendChild(eq()); else num.textContent = String(i + 1);
      const meta = el("span", "track-t"); meta.append(el("strong", null, l.title), el("small", null, l.goal));
      const right = el("span", "track-r", s.done ? "✓" : l.frames.length + " steps");
      r.append(num, P.cover(hue(i), icon(l), "sm"), meta, right);
      r.addEventListener("click", () => P.nav("#/learn/" + l.id));
      rows.appendChild(r);
    });
    if(!L.length) rows.appendChild(el("p", "note", "Lessons load nahi hue."));
    root.appendChild(rows);
  }

  /* ---------------- Now Playing ---------------- */
  function detail(root, l, idx){
    const s = st(l.id), N = LEARN().length;
    root.appendChild(P.header("", { label: "Playlist", hash: "#/learn" }));
    const np = el("div", "np");
    const art = P.cover(hue(idx), icon(l), "xl"); const eqIcon = eq(); art.appendChild(eqIcon);
    const meta = el("div", "np-meta");
    meta.append(el("small", null, "LESSON " + (idx + 1) + " / " + N + " · LEVEL " + l.level), el("h1", null, l.title), el("p", null, l.goal));
    np.append(art, meta); root.appendChild(np);

    const why = el("div", "callout"); why.append(el("b", null, "Kyun zaroori hai: "), document.createTextNode(l.why)); root.appendChild(why);
    const concept = el("details", "concept"); concept.open = true; concept.appendChild(el("summary", null, "Concept — padho (2 min)"));
    l.parts.forEach(p => { const b = el("div", "lpart"); b.appendChild(el("h4", null, p.h)); const t = el("p"); t.innerHTML = rich(p.text); b.appendChild(t); concept.appendChild(b); });
    root.appendChild(concept);

    /* ---- 1. predict first ---- */
    const pr = el("div", "pbox"); pr.appendChild(el("h3", null, "1 · Pehle predict karo"));
    const listing0 = el("pre", "code-list");
    l.code.forEach((line, i) => { const d = el("div", "cl"); d.append(el("span", "cl-n", String(i + 1)), el("span", "cl-t", line || " ")); listing0.appendChild(d); });
    pr.appendChild(listing0); pr.appendChild(el("p", "pq", l.predict.q));
    const opts = el("div", "popts"), fb = el("div", "pfeedback");
    const player = el("div", "pbox player locked");
    function showAnswer(ix){
      [...opts.children].forEach((b, n) => { b.disabled = true; b.classList.toggle("right", n === l.predict.answer); b.classList.toggle("wrong", n === ix && ix !== l.predict.answer); });
      fb.innerHTML = ""; fb.className = "pfeedback " + (ix === l.predict.answer ? "ok" : "bad");
      fb.append(el("b", null, ix === l.predict.answer ? "Sahi! " : "Galat — yahi seekhna hai. "), document.createTextNode(l.predict.why));
      player.classList.remove("locked");
    }
    l.predict.options.forEach((o, n) => opts.appendChild(btn(o, "popt", () => {
      if(s.predicted == null) P.log("learn");
      s.predicted = n; s.right = n === l.predict.answer; P.save(); showAnswer(n);
    })));
    pr.append(opts, fb); root.appendChild(pr);

    /* ---- 2. the player ---- */
    player.appendChild(el("h3", null, "2 · Ab chalao"));
    player.appendChild(el("p", "locked-msg", "Pehle upar predict karo — phir player khulega."));
    const lyrics = el("div", "lyrics");
    l.code.forEach((line, i) => { const d = el("div", "lyr"); d.append(el("span", "cl-n", String(i + 1)), el("span", "cl-t", line || " ")); lyrics.appendChild(d); });
    const vars = el("div", "vars"), out = el("pre", "cons"), say = el("p", "say");
    const scrub = el("input", "scrub"); scrub.type = "range"; scrub.min = 0; scrub.max = l.frames.length; scrub.step = 1; scrub.value = Math.min(l.frames.length, s.pos || 0); scrub.setAttribute("aria-label", "Step");
    const time = el("div", "time"), tl = el("span"), tr = el("span", null, l.frames.length + " steps"); time.append(tl, tr);
    player.append(lyrics, el("h4", "vh", "Variables"), vars, el("h4", "vh", "Output"), out, say, scrub, time);

    let f = Math.min(l.frames.length, s.pos || 0) - 1, timer = null, speed = 1, loop = false;
    const SPEEDS = [1, 1.5, 2, 0.5];
    function paint(){
      [...lyrics.children].forEach((d, i) => d.classList.toggle("on", f >= 0 && l.frames[f].l === i));
      const on = lyrics.querySelector(".on"); if(on && on.scrollIntoView && timer) on.scrollIntoView({ block: "nearest", behavior: "smooth" });
      vars.innerHTML = ""; out.textContent = "";
      scrub.value = f + 1; tl.textContent = "Step " + (f + 1);
      scrub.style.setProperty("--p", (100 * (f + 1) / l.frames.length) + "%");
      if(f < 0){ say.textContent = "▶ dabao — code line-by-line chalega."; vars.appendChild(el("span", "vempty", "abhi koi variable nahi")); return; }
      const cur = l.frames[f].v || {}, prev = f > 0 ? (l.frames[f - 1].v || {}) : {};
      const keys = Object.keys(cur).filter(k => k !== "out");
      if(!keys.length) vars.appendChild(el("span", "vempty", "abhi koi variable nahi"));
      keys.forEach(k => { const v = JSON.stringify(cur[k]), ch = !(k in prev) || JSON.stringify(prev[k]) !== v; const b = el("div", "var" + (ch ? " changed" : "")); b.append(el("span", "var-n", k), el("b", "var-v", v)); vars.appendChild(b); });
      out.textContent = typeof cur.out === "string" ? cur.out : "";
      say.textContent = l.frames[f].s;
      s.pos = f + 1; P.save();
      P.setLast({ kind: "learn", id: l.id, title: l.title, icon: icon(l), hue: hue(idx), pos: f + 1, total: l.frames.length });
      if(f === l.frames.length - 1 && !s.finished){ s.finished = true; P.log("learn"); P.save(); }
    }
    const setPlaying = on => { playB.classList.toggle("playing", on); art.classList.toggle("playing", on); playB.setAttribute("aria-label", on ? "Pause" : "Play"); playB.firstChild.textContent = on ? "⏸" : "▶"; };
    const stop = () => { clearInterval(timer); timer = null; setPlaying(false); };
    const go = d => { stop(); f = Math.max(-1, Math.min(l.frames.length - 1, f + d)); paint(); };
    function start(){
      if(f >= l.frames.length - 1) f = -1;
      setPlaying(true);
      const tick = () => { if(f >= l.frames.length - 1){ if(loop){ f = -1; } else return stop(); } f++; paint(); };
      clearInterval(timer); timer = setInterval(tick, 1400 / speed); tick();
    }
    const playB = btn("", "ctl-play", () => timer ? stop() : start()); playB.appendChild(el("span", null, "▶"));
    const speedB = btn("1×", "ctl", () => { speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]; speedB.textContent = speed + "×"; if(timer){ clearInterval(timer); start(); } });
    const loopB = btn("🔁", "ctl", () => { loop = !loop; loopB.classList.toggle("on", loop); loopB.setAttribute("aria-pressed", loop ? "true" : "false"); });
    loopB.setAttribute("aria-label", "Loop"); speedB.setAttribute("aria-label", "Speed");
    const ctl = el("div", "controls");
    ctl.append(speedB, btn("⏮", "ctl", () => { stop(); f = -1; paint(); }), btn("‹", "ctl", () => go(-1)), playB, btn("›", "ctl", () => go(1)), loopB);
    player.appendChild(ctl);
    scrub.addEventListener("input", () => { stop(); f = +scrub.value - 1; paint(); });
    root.appendChild(player); paint(); setPlaying(false);
    if(s.predicted != null) showAnswer(s.predicted);
    root._cleanup = stop;

    /* ---- 3. playground ---- */
    const pg = el("div", "pbox"); pg.appendChild(el("h3", null, "3 · Khud chalao — badal ke dekho"));
    const ta = P.codeBox(l.tryIt, Math.min(14, l.tryIt.split("\n").length + 1)); const res = el("pre", "cons big");
    const run = btn("▶ Run karo", "pbtn", async () => {
      res.textContent = "chal raha hai…"; const r = await P.run(ta.value);
      res.className = "cons big" + (r.error ? " err" : "");
      res.textContent = (r.logs && r.logs.length ? r.logs.join("\n") : "") + (r.error ? (r.logs && r.logs.length ? "\n" : "") + "⚠ " + r.error : (r.logs && r.logs.length ? "" : "(kuch print nahi hua — console.log(...) use karo)"));
      P.log("learn");
    });
    const pgc = el("div", "pctl"); pgc.appendChild(run); pg.append(ta, pgc, res);
    pg.appendChild(el("p", "note", "Tip: pehle socho badalne se output kya hoga — phir Run karo. Andaza sahi aaya to samajh pakki."));
    root.appendChild(pg);

    /* ---- 4. practice + done ---- */
    const pp = el("div", "pbox"); pp.appendChild(el("h3", null, "4 · Ab khud likho"));
    const ex = (l.exercises || []).map(id => LAB().find(x => x.id === id)).filter(Boolean);
    if(ex.length){
      pp.appendChild(el("p", "note", "Samajh tab aati hai jab khud code likho — bina AI ke try karo:"));
      const row = el("div", "tracks");
      ex.forEach(x => { const t = el("button", "track" + ((S.lab[x.id] || {}).solved ? " done" : "")); t.type = "button"; const [h, ic] = P.TOPIC[x.topic] || [200, "🧩"];
        const m = el("span", "track-t"); m.append(el("strong", null, x.title), el("small", null, "Level " + x.level + " · " + x.topic));
        t.append(P.cover(h, ic, "sm"), m, el("span", "track-r", (S.lab[x.id] || {}).solved ? "✓" : "›")); t.addEventListener("click", () => P.nav("#/lab/" + x.id)); row.appendChild(t); });
      pp.appendChild(row);
    }
    const dn = btn(s.done ? "✓ Lesson complete" : "Lesson complete mark karo", "pbtn" + (s.done ? " ghost" : ""), () => {
      if(s.predicted == null){ P.toast("Pehle predict karo, phir complete mark hoga"); return; }
      if(!s.done){ s.done = true; P.save(); P.log("learn"); }
      dn.textContent = "✓ Lesson complete"; dn.classList.add("ghost"); P.toast("Lesson complete 🎉");
    });
    const ctl2 = el("div", "pctl"); ctl2.appendChild(dn);
    const nx = LEARN()[idx + 1]; if(nx) ctl2.appendChild(btn("Agla lesson ›", "pbtn ghost", () => P.nav("#/learn/" + nx.id)));
    pp.appendChild(ctl2); root.appendChild(pp);
  }

  P.mods.learn = {
    render(root, id){
      if(root._cleanup){ root._cleanup(); root._cleanup = null; }
      root.innerHTML = "";
      const idx = id ? LEARN().findIndex(x => x.id === id) : -1;
      if(idx >= 0) detail(root, LEARN()[idx], idx); else list(root);
    },
  };
})();
