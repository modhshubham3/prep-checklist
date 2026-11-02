/* Seekho: lessons with predict-first, animated step-by-step trace, and a live playground. Data: window.LEARN (js/learn-data.js). */
(() => {
  const { el, btn, rich, S } = P;
  const LEARN = () => window.LEARN || [];
  const LAB = () => window.LAB || [];
  const st = id => S.learn[id] || (S.learn[id] = {});

  function list(root){
    root.appendChild(P.header("Seekho", { label: "Home", hash: "#/home" }, "Ek-ek concept, ek-ek idea. Pehle predict karo, phir animation dekho, phir khud chalao."));
    const done = LEARN().filter(l => st(l.id).done).length;
    root.appendChild(el("p", "note", done + " / " + LEARN().length + " lessons poore"));
    const grid = el("div", "pcards");
    LEARN().forEach((l, i) => {
      const c = el("button", "pcard" + (st(l.id).done ? " done" : ""));
      c.type = "button";
      c.append(el("span", "pcard-n", String(i + 1)), el("strong", null, l.title), el("span", "pcard-s", l.goal));
      if(st(l.id).done) c.appendChild(el("span", "pcard-tick", "✓ Done"));
      c.addEventListener("click", () => P.nav("#/learn/" + l.id));
      grid.appendChild(c);
    });
    if(!LEARN().length) grid.appendChild(el("p", "note", "Lessons load nahi hue."));
    root.appendChild(grid);
  }

  function detail(root, l){
    const s = st(l.id);
    root.appendChild(P.header(l.title, { label: "Saare lessons", hash: "#/learn" }, l.goal));

    const why = el("div", "callout"); why.append(el("b", null, "Kyun zaroori hai: "), document.createTextNode(l.why)); root.appendChild(why);
    l.parts.forEach(p => { const b = el("div", "lpart"); b.appendChild(el("h4", null, p.h)); const t = el("p"); t.innerHTML = rich(p.text); b.appendChild(t); root.appendChild(b); });

    /* ---- 1. predict first ---- */
    const pr = el("div", "pbox"); pr.appendChild(el("h3", null, "1. Pehle predict karo"));
    const codeBlock = el("pre", "code-list");
    l.code.forEach((line, i) => { const d = el("div", "cl"); d.append(el("span", "cl-n", String(i + 1)), el("span", "cl-t", line || " ")); d.dataset.i = i; codeBlock.appendChild(d); });
    pr.appendChild(codeBlock);
    pr.appendChild(el("p", "pq", l.predict.q));
    const opts = el("div", "popts");
    const fb = el("div", "pfeedback");
    function showAnswer(ix){
      [...opts.children].forEach((b, n) => { b.disabled = true; b.classList.toggle("right", n === l.predict.answer); b.classList.toggle("wrong", n === ix && ix !== l.predict.answer); });
      fb.innerHTML = ""; fb.className = "pfeedback " + (ix === l.predict.answer ? "ok" : "bad");
      fb.append(el("b", null, ix === l.predict.answer ? "Sahi! " : "Galat — koi baat nahi, yahi seekhna hai. "), document.createTextNode(l.predict.why));
      anim.classList.remove("locked");
    }
    l.predict.options.forEach((o, n) => {
      const b = btn(o, "popt", () => { s.predicted = n; s.right = n === l.predict.answer; P.save(); P.touchDay(); showAnswer(n); });
      opts.appendChild(b);
    });
    pr.append(opts, fb); root.appendChild(pr);

    /* ---- 2. animated trace ---- */
    const anim = el("div", "pbox locked"); anim.appendChild(el("h3", null, "2. Ab animation dekho"));
    anim.appendChild(el("p", "locked-msg", "Pehle upar predict karo — phir ye khulega."));
    const stage = el("div", "stage");
    const listing = el("pre", "code-list");
    l.code.forEach((line, i) => { const d = el("div", "cl"); d.append(el("span", "cl-n", String(i + 1)), el("span", "cl-t", line || " ")); listing.appendChild(d); });
    const panel = el("div", "vpanel");
    const vars = el("div", "vars"); const out = el("pre", "cons"); const say = el("p", "say");
    panel.append(el("h4", null, "Variables"), vars, el("h4", null, "Output"), out);
    stage.append(listing, panel); anim.append(stage, say);
    let f = -1, timer = null;
    function paint(){
      [...listing.children].forEach((d, i) => d.classList.toggle("on", f >= 0 && l.frames[f].l === i));
      vars.innerHTML = ""; out.textContent = "";
      if(f < 0){ say.textContent = "Start dabao — code line-by-line chalega."; vars.appendChild(el("span", "vempty", "abhi koi variable nahi")); return; }
      const cur = l.frames[f].v || {}, prev = f > 0 ? (l.frames[f - 1].v || {}) : {};
      const keys = Object.keys(cur).filter(k => k !== "out");
      if(!keys.length) vars.appendChild(el("span", "vempty", "abhi koi variable nahi"));
      keys.forEach(k => {
        const v = JSON.stringify(cur[k]); const changed = !(k in prev) || JSON.stringify(prev[k]) !== v;
        const b = el("div", "var" + (changed ? " changed" : "")); b.append(el("span", "var-n", k), el("b", "var-v", v)); vars.appendChild(b);
      });
      out.textContent = typeof cur.out === "string" ? cur.out : "";
      say.textContent = "Step " + (f + 1) + "/" + l.frames.length + " — " + l.frames[f].s;
    }
    const stop = () => { clearInterval(timer); timer = null; play.textContent = "▶ Play"; };
    const step = d => { stop(); f = Math.max(-1, Math.min(l.frames.length - 1, f + d)); paint(); };
    const play = btn("▶ Play", "pbtn", () => {
      if(timer) return stop();
      if(f >= l.frames.length - 1) f = -1;
      play.textContent = "⏸ Pause";
      timer = setInterval(() => { if(f >= l.frames.length - 1) return stop(); f++; paint(); }, 1400);
    });
    const ctl = el("div", "pctl");
    ctl.append(btn("⏮ Reset", "pbtn ghost", () => { stop(); f = -1; paint(); }), btn("‹ Peeche", "pbtn ghost", () => step(-1)), play, btn("Aage ›", "pbtn", () => step(1)));
    anim.appendChild(ctl); root.appendChild(anim); paint();
    if(s.predicted != null){ showAnswer(s.predicted); }
    root._cleanup = stop;

    /* ---- 3. playground ---- */
    const pg = el("div", "pbox"); pg.appendChild(el("h3", null, "3. Khud chalao — badal ke dekho"));
    const ta = P.codeBox(l.tryIt, Math.min(14, l.tryIt.split("\n").length + 1));
    const res = el("pre", "cons big");
    const run = btn("▶ Run karo", "pbtn", async () => {
      res.textContent = "chal raha hai…"; const r = await P.run(ta.value);
      res.className = "cons big" + (r.error ? " err" : "");
      res.textContent = (r.logs && r.logs.length ? r.logs.join("\n") : "") + (r.error ? (r.logs && r.logs.length ? "\n" : "") + "⚠ " + r.error : (r.logs && r.logs.length ? "" : "(kuch print nahi hua — console.log(...) use karo)"));
      P.touchDay();
    });
    const pgc = el("div", "pctl"); pgc.appendChild(run);
    pg.append(ta, pgc, res);
    pg.appendChild(el("p", "note", "Tip: pehle socho ki badalne se output kya hoga — phir Run karo. Andaza sahi aaya to samajh pakki."));
    root.appendChild(pg);

    /* ---- 4. practice + done ---- */
    const pp = el("div", "pbox"); pp.appendChild(el("h3", null, "4. Ab khud likho"));
    const ex = (l.exercises || []).map(id => LAB().find(x => x.id === id)).filter(Boolean);
    if(ex.length){
      pp.appendChild(el("p", "note", "Samajh tab aati hai jab khud code likho — in problems ko bina AI ke try karo:"));
      const row = el("div", "pcards small");
      ex.forEach(x => { const c = el("button", "pcard" + ((S.lab[x.id] || {}).solved ? " done" : "")); c.type = "button"; c.append(el("strong", null, x.title), el("span", "pcard-s", "Level " + x.level + " · " + x.topic)); c.addEventListener("click", () => P.nav("#/lab/" + x.id)); row.appendChild(c); });
      pp.appendChild(row);
    }
    const done = btn(s.done ? "✓ Lesson complete" : "Lesson complete mark karo", "pbtn" + (s.done ? " ghost" : ""), () => {
      if(s.predicted == null){ P.toast("Pehle predict karo, phir complete mark hoga"); return; }
      s.done = true; P.save(); P.touchDay(); done.textContent = "✓ Lesson complete"; done.classList.add("ghost"); P.toast("Lesson complete 🎉");
    });
    pp.appendChild(el("div", "pctl")); pp.lastChild.appendChild(done);
    const idx = LEARN().findIndex(x => x.id === l.id), next = LEARN()[idx + 1];
    if(next) pp.lastChild.appendChild(btn("Agla lesson ›", "pbtn ghost", () => P.nav("#/learn/" + next.id)));
    root.appendChild(pp);
  }

  P.mods.learn = {
    render(root, id){
      if(root._cleanup){ root._cleanup(); root._cleanup = null; }
      root.innerHTML = "";
      const l = id && LEARN().find(x => x.id === id);
      if(l) detail(root, l); else list(root);
    },
  };
})();
