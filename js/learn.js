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
    // Mid-lesson? Then the big button continues THAT lesson, not the first unfinished one.
    const lastL = S.last && S.last.kind === "learn" ? L.find(l => l.id === S.last.id && !st(l.id).done) : null;
    const next = lastL || L.find(l => !st(l.id).done) || L[0];
    if(lastL) info.appendChild(el("p", "pl-now", "Abhi: " + lastL.title.split(" — ")[0] + " · step " + Math.min(lastL.frames.length, S.last.pos || 0) + " / " + lastL.frames.length));
    const play = btn("▶  " + (lastL || done ? "Continue" : "Shuru karo"), "pbtn big", () => next && P.nav("#/learn/" + next.id));
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
  const codeLines = (host, cls, code) => code.forEach((line, i) => { const d = el("div", cls); d.append(el("span", "cl-n", String(i + 1)), el("span", "cl-t", line || " ")); host.appendChild(d); });
  const richP = (cls, text) => { const p = el("p", cls); p.innerHTML = rich(text); return p; };

  function detail(root, l, idx){
    const s = st(l.id), N = LEARN().length, T = l.frames.length;
    root.appendChild(P.header("", { label: "Playlist", hash: "#/learn" }));
    const np = el("div", "np");
    const art = P.cover(hue(idx), icon(l), "xl"); const eqIcon = eq(); art.appendChild(eqIcon);
    const meta = el("div", "np-meta");
    meta.append(el("small", null, "LESSON " + (idx + 1) + " / " + N + " · LEVEL " + l.level), el("h1", null, l.title), el("p", null, l.goal));
    np.append(art, meta); root.appendChild(np);
    const toStory = btn("Neeche kahani hai ⬇", "story-hint", () => { const b = root.querySelector(".scene-box"); if(b) b.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); });
    toStory.hidden = true; root.appendChild(toStory);

    const why = el("div", "callout"); why.append(el("b", null, "Kyun zaroori hai: "), document.createTextNode(l.why)); root.appendChild(why);
    const concept = el("details", "concept"); concept.open = true; concept.appendChild(el("summary", null, "Concept — padho (2 min)"));
    l.parts.forEach(p => { const b = el("div", "lpart"); b.appendChild(el("h4", null, p.h)); const t = el("p"); t.innerHTML = rich(p.text); b.appendChild(t); concept.appendChild(b); });
    root.appendChild(concept);

    /* ---- 0. concept story: a cartoon scene with Boltu (js/scenes.js), driven by our own play/scrubber ---- */
    let sc = null;
    if(window.Scenes && Scenes.has(l.id)){
      const sb = el("div", "pbox scene-box"); sb.appendChild(el("h3", null, "Pehle kahani dekho"));
      const stage = el("div", "scene-stage"); sb.appendChild(stage);
      const bar = el("div", "scene-ctl"), lab = el("span", "scene-n"), sk = el("input", "scrub"); sk.type = "range"; sk.min = 0; sk.value = 0; sk.setAttribute("aria-label", "Kahani ka step");
      const pb = btn("▶ Chalao", "pbtn ghost", () => { if(!sc) return; if(sc.playing){ sc.pause(); pb.textContent = "▶ Chalao"; } else { sc.play(); pb.textContent = "⏸ Roko"; } });
      bar.append(pb, sk, lab); sb.appendChild(bar); root.appendChild(sb);
      sc = Scenes.play(l.id, stage, { autoplay: false, onStep: (i, st2) => { sk.value = i; sk.style.setProperty("--p", (100 * i / Math.max(1, st2.total - 1)) + "%"); lab.textContent = (i + 1) + " / " + st2.total; } });
      sk.max = sc.steps.length - 1; lab.textContent = "1 / " + sc.steps.length;
      sk.addEventListener("input", () => { sc.pause(); pb.textContent = "▶ Chalao"; sc.seek(+sk.value); });
      sc.onEnd = () => { pb.textContent = "▶ Dobara"; };
      // Only point at the story when it is not already on screen (the concept text above usually pushes it below the fold).
      requestAnimationFrame(() => { const rr = root.getBoundingClientRect(), br = sb.getBoundingClientRect(); toStory.hidden = !(rr.height > 0 && br.top > rr.bottom - 120); });
    }

    /* ---- 1. predict first ---- */
    const pr = el("div", "pbox"); pr.appendChild(el("h3", null, "1 · Pehle predict karo"));
    const listing0 = el("pre", "code-list"); codeLines(listing0, "cl", l.code);
    pr.appendChild(listing0); pr.appendChild(richP("pq", l.predict.q));
    const opts = el("div", "popts"), fb = el("div", "pfeedback");
    const player = el("div", "pbox player locked");
    function showAnswer(ix){
      [...opts.children].forEach((b, n) => { b.disabled = true; b.classList.toggle("right", n === l.predict.answer); b.classList.toggle("wrong", n === ix && ix !== l.predict.answer); });
      fb.innerHTML = ""; fb.className = "pfeedback " + (ix === l.predict.answer ? "ok" : "bad");
      const good = ix === l.predict.answer;
      if(window.Mascot){ const m = Mascot.create({ size: 52, mood: good ? "cheer" : "oops" }); m.classList.add("fb-boltu"); fb.appendChild(m); }
      const tx = el("div", "fb-text"); const w = el("span"); w.innerHTML = rich(l.predict.why); tx.append(el("b", null, good ? "Sahi! " : "Galat — yahi seekhna hai. "), w); fb.appendChild(tx);
      player.classList.remove("locked");
      fit();
    }
    l.predict.options.forEach((o, n) => opts.appendChild(btn(o, "popt", () => {
      if(s.predicted != null) return;                                 // the first answer is final
      s.predicted = n; s.right = n === l.predict.answer; P.save(); P.log("learn", 1, "pred:" + l.id); showAnswer(n);
    })));
    pr.append(opts, fb); root.appendChild(pr);

    /* ---- 2. the player ---- */
    player.appendChild(el("h3", null, "2 · Ab chalao"));
    player.appendChild(el("p", "locked-msg", "Pehle upar predict karo — phir player khulega."));
    const lyrics = el("div", "lyrics"); lyrics.setAttribute("role", "group"); lyrics.setAttribute("aria-label", "Code");
    codeLines(lyrics, "lyr", l.code);
    const vars = el("div", "vars"), out = el("pre", "cons"), say = el("p", "say");
    vars.setAttribute("aria-live", "polite"); say.setAttribute("aria-live", "polite");
    const scrub = el("input", "scrub"); scrub.type = "range"; scrub.min = 0; scrub.max = T; scrub.step = 1; scrub.setAttribute("aria-label", "Step");
    const time = el("div", "time"), tl = el("span"), tr = el("span", null, T + " steps"); time.append(tl, tr);
    const bar = el("div", "pbar");
    player.append(lyrics, el("h4", "vh", "Variables"), vars, el("h4", "vh", "Output"), out, say, bar);

    // `at` = where the learner is now, `s.pos` = the furthest step ever reached (that is what Continue reports; replaying never lowers it)
    let f = Math.min(T, s.at != null ? s.at : (s.pos || 0)) - 1, timer = null, speed = 1, loop = false;
    scrub.value = f + 1;
    const SPEEDS = [1, 1.5, 2, 0.5];
    const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
    function fill(i, host){                                        // draw frame i into {vars,out,say}; used for the live view and for measuring
      host.vars.innerHTML = "";
      if(i < 0){ host.say.textContent = "▶ dabao — code line-by-line chalega."; host.vars.appendChild(el("span", "vempty", "abhi koi variable nahi")); host.out.textContent = ""; return; }
      const cur = l.frames[i].v || {}, prev = i > 0 ? (l.frames[i - 1].v || {}) : {};
      const keys = Object.keys(cur).filter(k => k !== "out");
      if(!keys.length) host.vars.appendChild(el("span", "vempty", "abhi koi variable nahi"));
      keys.forEach(k => { const v = JSON.stringify(cur[k]), ch = !(k in prev) || JSON.stringify(prev[k]) !== v; const b = el("div", "var" + (ch ? " changed" : "")); b.append(el("span", "var-n", k), el("b", "var-v", v)); host.vars.appendChild(b); });
      host.out.textContent = typeof cur.out === "string" ? cur.out : "";
      host.say.textContent = l.frames[i].s;
    }
    function scrollLyrics(){
      const on = lyrics.querySelector(".on"); if(!on) return;
      const want = on.offsetTop - (lyrics.clientHeight - on.offsetHeight) / 2;
      lyrics.scrollTo({ top: Math.max(0, want), behavior: reduce() || !timer ? "auto" : "smooth" });   // scrolls the code box only, never the page
    }
    function paint(persist){
      [...lyrics.children].forEach((d, i) => d.classList.toggle("on", f >= 0 && l.frames[f].l === i));
      scrollLyrics();
      fill(f, { vars, out, say });
      scrub.value = f + 1; tl.textContent = "Step " + (f + 1) + " / " + T;
      scrub.style.setProperty("--p", (100 * (f + 1) / T) + "%");
      if(!persist) return;
      s.at = f + 1;
      if(f >= 0){
        s.pos = Math.max(s.pos || 0, f + 1);
        P.setLast({ kind: "learn", id: l.id, title: l.title, icon: icon(l), hue: hue(idx), pos: s.pos, total: T });
        if(f === T - 1 && !s.finished){ s.finished = true; P.log("learn", 1, "!fin:" + l.id); }
      }
      P.save();
    }
    /* Keep the variables / output / narration boxes as tall as the tallest step of THIS lesson, so the controls below never jump. */
    function fit(){
      if(player.classList.contains("locked") || !vars.offsetWidth) return;
      bar.style.bottom = -(parseFloat(getComputedStyle(root).paddingBottom) || 0) + "px";   // sticky is measured from the scroller's content box: reach down to its real edge (just above the tab bar)
      const mk = (c, tag, w) => { const g = el(tag, c); g.style.cssText = "position:absolute;left:0;top:0;visibility:hidden;pointer-events:none;box-sizing:border-box;width:" + w + "px;min-height:0"; player.appendChild(g); return g; };
      const g = { vars: mk("vars", "div", vars.offsetWidth), out: mk("cons", "pre", out.offsetWidth), say: mk("say", "p", say.offsetWidth) };
      g.vars.style.minHeight = "44px";
      let mv = 44, mo = 0, ms = 0;
      for(let i = -1; i < T; i++){ fill(i, g); mv = Math.max(mv, g.vars.offsetHeight); mo = Math.max(mo, g.out.offsetHeight); ms = Math.max(ms, g.say.offsetHeight); }
      Object.values(g).forEach(n => n.remove());
      vars.style.minHeight = mv + "px"; out.style.minHeight = Math.max(38, mo) + "px"; say.style.minHeight = ms + "px";
    }
    const setPlaying = on => { playB.classList.toggle("playing", on); art.classList.toggle("playing", on); playB.setAttribute("aria-label", on ? "Pause" : "Play"); playB.firstChild.textContent = on ? "⏸" : "▶"; };
    const stop = () => { clearInterval(timer); timer = null; setPlaying(false); };
    const go = d => { stop(); f = Math.max(-1, Math.min(T - 1, f + d)); paint(true); };
    const tick = () => { if(f >= T - 1){ if(loop){ f = -1; } else return stop(); } f++; paint(true); };
    const startTimer = () => { clearInterval(timer); timer = setInterval(tick, 1400 / speed); };      // a new speed re-times the interval; it does not step
    function start(){
      if(f >= T - 1) f = -1;                                         // replay from the top (s.pos keeps the furthest step)
      setPlaying(true); startTimer(); tick();
    }
    const playB = btn("", "ctl-play", () => timer ? stop() : start()); playB.appendChild(el("span", null, "▶"));
    const speedB = btn("1×", "ctl", () => { speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]; speedB.textContent = speed + "×"; if(timer) startTimer(); });
    const loopB = btn("🔁", "ctl", () => { loop = !loop; loopB.classList.toggle("on", loop); loopB.setAttribute("aria-pressed", loop ? "true" : "false"); });
    loopB.setAttribute("aria-label", "Loop"); loopB.setAttribute("aria-pressed", "false"); speedB.setAttribute("aria-label", "Speed");
    const back = btn("⏮", "ctl", () => { stop(); f = -1; paint(true); }); back.setAttribute("aria-label", "Shuru se");
    const prevB = btn("‹", "ctl", () => go(-1)); prevB.setAttribute("aria-label", "Pichhla step");
    const nextB = btn("›", "ctl", () => go(1)); nextB.setAttribute("aria-label", "Agla step");
    const ctl = el("div", "controls");
    ctl.append(speedB, back, prevB, playB, nextB, loopB);
    bar.append(scrub, time, ctl);
    scrub.addEventListener("input", () => { stop(); f = +scrub.value - 1; paint(true); });
    root.appendChild(player); paint(false); setPlaying(false);
    if(s.predicted != null) showAnswer(s.predicted);
    let ro = null;
    if(window.ResizeObserver){ let w = 0; ro = new ResizeObserver(() => { if(player.offsetWidth !== w){ w = player.offsetWidth; fit(); scrollLyrics(); } }); ro.observe(player); }
    root._cleanup = () => { stop(); if(ro){ ro.disconnect(); ro = null; } if(sc){ sc.destroy(); sc = null; } };

    /* ---- 3. playground ---- */
    const pg = el("div", "pbox"); pg.appendChild(el("h3", null, "3 · Khud chalao — badal ke dekho"));
    const ta = P.codeBox(l.tryIt, 3, "Playground code: " + l.title); P.autosize(ta); const res = el("pre", "cons big"); res.setAttribute("aria-live", "polite");
    const run = btn("▶ Run karo", "pbtn", async () => {
      res.className = "cons big"; res.textContent = "chal raha hai…"; run.disabled = true;
      const r = await P.run(ta.value);
      run.disabled = false;
      const lg = r.logs && r.logs.length ? r.logs.join("\n") : "";
      res.className = "cons big" + (r.error ? " err" : "");
      res.textContent = lg + (r.error ? (lg ? "\n" : "") + "⚠ " + r.error : (lg ? "" : "(kuch print nahi hua — console.log(...) use karo)"));
      if(s.predicted != null) P.log("learn", 1, "pg:" + l.id);         // +1 a day per lesson, and only once you have predicted
    });
    const pgc = el("div", "pctl"); pgc.appendChild(run); pg.append(ta, ta.hint, pgc, res);
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
      if(!s.done){ s.done = true; P.save(); P.log("learn", 1, "!done:" + l.id); }
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
      if(idx >= 0) detail(root, LEARN()[idx], idx); else if(id) P.notFound(root, "lesson", "#/learn", "Saare lessons"); else list(root);
    },
  };
})();
