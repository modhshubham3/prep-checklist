/* Decision Lab: pick an option AND write your own reason first; only then the expert reasoning is shown.
   Data: window.DECIDE (js/decide-data.js). Progress: P.S.decide[id] = { choice, reason, t, right }. */
(() => {
  const { el, btn, rich, S } = P;
  const DEC = () => window.DECIDE || [];
  const get = id => S.decide[id];
  const MIN_REASON = 20;

  function list(root){
    root.appendChild(P.header("Decision Lab", { label: "Home", hash: "#/home" }, "Asli office jaise situations. Pehle apna faisla aur wajah likho — phir expert ki soch dekho."));
    const done = DEC().filter(d => get(d.id)).length, right = DEC().filter(d => (get(d.id) || {}).right).length;
    root.appendChild(el("p", "note", done + " / " + DEC().length + " kiye" + (done ? " · " + right + " mein tumhara faisla expert se match hua" : "")));
    const grid = el("div", "pcards");
    DEC().forEach(d => {
      const g = get(d.id), c = el("button", "pcard" + (g ? " done" : "")); c.type = "button";
      c.append(el("span", "pcard-n", d.tag), el("strong", null, d.title));
      if(g) c.appendChild(el("span", "pcard-tick" + (g.right ? "" : " warn"), g.right ? "✓ Expert se match" : "Alag socha — wajah padho"));
      c.addEventListener("click", () => P.nav("#/decide/" + d.id));
      grid.appendChild(c);
    });
    if(!DEC().length) grid.appendChild(el("p", "note", "Scenarios load nahi hue."));
    root.appendChild(grid);
  }

  function detail(root, d){
    root.appendChild(P.header(d.title, { label: "Saare scenarios", hash: "#/decide" }, d.tag));
    const sit = el("div", "pbox"); const p = el("p", "prompt"); p.innerHTML = rich(d.situation); sit.appendChild(p);
    sit.appendChild(el("p", "pq", d.question)); root.appendChild(sit);

    const done = get(d.id);
    const form = el("div", "pbox"); form.appendChild(el("h3", null, "1. Tumhara faisla"));
    const opts = el("div", "dopts"); let picked = done ? done.choice : -1;
    d.options.forEach((o, n) => {
      const lab = el("label", "dopt"); const r = el("input"); r.type = "radio"; r.name = "dopt"; r.value = n; r.disabled = !!done; if(n === picked) r.checked = true;
      r.addEventListener("change", () => { picked = n; upd(); });
      lab.append(r, el("span", null, o.t)); opts.appendChild(lab);
    });
    form.appendChild(opts);
    form.appendChild(el("h3", null, "2. Wajah likho (zaroori)"));
    const ta = el("textarea", "note-ta"); ta.rows = 4; ta.value = done ? done.reason : ""; ta.disabled = !!done;
    ta.placeholder = "Maine ye isliye chuna kyunki… (kya risk hai, kya pata hona chahiye)";
    const cnt = el("p", "note small"); const sub = btn("Submit — expert ki soch dekho", "pbtn", submit);
    function upd(){ const n = ta.value.trim().length; cnt.textContent = n >= MIN_REASON ? "" : n + " / " + MIN_REASON + " characters"; sub.disabled = picked < 0 || n < MIN_REASON; }
    ta.addEventListener("input", upd); form.append(ta, cnt); if(!done) form.appendChild(sub); root.appendChild(form); upd();

    function submit(){
      S.decide[d.id] = { choice: picked, reason: ta.value.trim(), t: Date.now(), right: picked === d.best }; P.save(); P.touchDay();
      P.route();
    }
    if(!done) return;

    /* reveal */
    const ok = done.choice === d.best;
    const res = el("div", "pbox win"); res.appendChild(el("h3", null, ok ? "✅ Tumhara faisla expert se match hua" : "Tumne alag socha — dekhte hain kyun"));
    const table = el("div", "dcompare");
    d.options.forEach((o, n) => {
      const row = el("div", "dopt-r" + (n === d.best ? " best" : "") + (n === done.choice ? " mine" : ""));
      row.appendChild(el("strong", null, (n === d.best ? "★ Best: " : "") + o.t + (n === done.choice ? "  (tumhara)" : "")));
      row.append(el("p", "pro", "+ " + o.pro), el("p", "con", "– " + o.con)); table.appendChild(row);
    });
    res.appendChild(table);
    const why = el("p"); why.innerHTML = "<b>Kyun:</b> " + rich(d.why); res.appendChild(why);
    res.appendChild(el("h4", null, "Senior pehle ye sawaal puchta:")); const ul = el("ul", "aqs"); d.askFirst.forEach(q => ul.appendChild(el("li", null, q))); res.appendChild(ul);
    const tr = el("p", "callout"); tr.append(el("b", null, "Aam galti: "), document.createTextNode(d.trap)); res.appendChild(tr);
    res.appendChild(el("p", "note", "Tumhari wajah: \"" + done.reason + "\" — kya isme upar ke sawaalon mein se koi chhoota?"));
    const row = el("div", "pctl"); const i = DEC().findIndex(y => y.id === d.id), nx = DEC()[i + 1];
    if(nx) row.appendChild(btn("Agla scenario ›", "pbtn", () => P.nav("#/decide/" + nx.id)));
    row.appendChild(btn("Dobara socho (reset)", "pbtn ghost", () => { delete S.decide[d.id]; P.save(); P.route(); }));
    res.appendChild(row); root.appendChild(res);
  }

  P.mods.decide = { render(root, id){ root.innerHTML = ""; const d = id && DEC().find(x => x.id === id); if(d) detail(root, d); else list(root); } };
})();
