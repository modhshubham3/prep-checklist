/* ================= STORAGE ================= */
// Every tick is keyed by the text it belongs to, not its position, so
// editing content never moves a tick onto a different question. Each entry
// carries a timestamp; clearing a mark leaves a tombstone ({v:null}) so the
// clear can win a merge against an older mark from another device.
const STORE = "prep-state-v3";
const OLD_STORE = "prep-checklist-v2";
let entries = {};      // key -> { v: "haan"|"thoda"|"naa"|null, t: ms }
let state = {};        // key -> v, the view the rest of the app reads
let storageOK = true;
let filter = "all";
let pending = null;

function hash(s){
  let h = 0x811c9dc5;
  for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}
const kC = t => "c:" + hash(t);   // checklist topic
const kK = t => "k:" + hash(t);   // cheatsheet term
const kA = t => "a:" + hash(t);   // answer question

function rebuild(){
  state = {};
  for(const k in entries) if(entries[k] && entries[k].v) state[k] = entries[k].v;
}
// Personal notes per answer card, same key and same last-write-wins rule as
// ticks. An emptied note is kept as {s:""} so the deletion syncs too.
let notes = {};        // key -> { s: string, t: ms }

function save(){
  if(!storageOK) return;
  try{ localStorage.setItem(STORE, JSON.stringify({ e: entries, n: notes })); }catch(e){ storageOK = false; }
}
function put(key, v){
  entries[key] = { v: v || null, t: Date.now() };
  rebuild(); save();
  if(typeof sync !== "undefined") sync.soon();
}
function putNote(key, s){
  notes[key] = { s: s, t: Date.now() };
  save();
  if(typeof sync !== "undefined") sync.soon();
}

// v2 stored ticks as "<section>-<group>-<item>", "cheat-<g>-<i>", "c2-<g>-<i>".
// Replay those positions against the data they were saved for. t:1 so any
// real synced mark from another device wins over a migrated one.
function migrateV2(){
  let old = null;
  try{ old = JSON.parse(localStorage.getItem(OLD_STORE) || "null"); }catch(e){}
  if(!old) return;
  const map = {};
  DATA.forEach(sec => sec.groups.forEach((g, gi) => g.items.forEach((it, ii) => { map[sec.id + "-" + gi + "-" + ii] = kC(it); })));
  CHEAT.forEach((g, gi) => g.items.forEach(([term], ii) => { map["cheat-" + gi + "-" + ii] = kK(term); }));
  if(typeof OLD_C2_Q !== "undefined")
    OLD_C2_Q.forEach((g, gi) => g.forEach((q, ii) => { map["c2-" + gi + "-" + ii] = kA(q); }));
  for(const k in old) if(map[k] && old[k]) entries[map[k]] = { v: old[k], t: 1 };
  save();
}

try{
  const raw = localStorage.getItem(STORE);
  if(raw){ const o = JSON.parse(raw) || {}; entries = o.e || {}; notes = o.n || {}; }
  else migrateV2();
  rebuild();
}catch(e){
  storageOK = false;
  document.getElementById("warn").textContent =
    "Is browser mein progress save nahi ho paayega — marks sirf is session tak rahenge.";
}

const ICONS =
  '<svg class="i-haan" viewBox="0 0 16 16"><path d="M3 8.5l3.2 3.2L13 5"/></svg>' +
  '<svg class="i-thoda" viewBox="0 0 16 16"><path d="M4 8h8"/></svg>' +
  '<svg class="i-naa" viewBox="0 0 16 16"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>';

const COPY_ICO =
  '<svg class="copy-ico" viewBox="0 0 16 16" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/>' +
  '<path d="M10.5 3.2A1.7 1.7 0 0 0 8.9 2H3.7A1.7 1.7 0 0 0 2 3.7v5.2c0 .8.5 1.4 1.2 1.6"/></svg>';

const toast = document.getElementById("toast");
let toastT = null;
function flash(msg){
  toast.textContent = msg;
  toast.classList.add("on");
  clearTimeout(toastT);
  toastT = setTimeout(() => toast.classList.remove("on"), 1600);
}

function copyTopic(row, text){
  const done = () => {
    row.classList.add("copied");
    setTimeout(() => row.classList.remove("copied"), 1200);
    flash("Copy ho gaya");
  };
  const fallback = () => {
    try{
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      ok ? done() : flash("Copy nahi hua — text select karke manually copy karo");
    }catch(e){
      flash("Copy nahi hua — text select karke manually copy karo");
    }
  };
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(text).then(done).catch(fallback);
  } else fallback();
}

const list  = document.getElementById("list");
const marks = document.getElementById("marks");
const scrim = document.getElementById("scrim");
const askTopic = document.getElementById("asktopic");
const emptyMsg = document.getElementById("empty");

DATA.forEach((sec, si) => {
  const el = document.createElement("section");
  el.id = "sec-" + sec.id;
  if(sec.flagged) el.className = "flagged";

  const btn = document.createElement("button");
  btn.className = "sec-btn";
  btn.setAttribute("aria-expanded","false");
  btn.innerHTML =
    '<svg class="chev" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1L6.5 6L1.5 11"/></svg>' +
    '<span class="sec-title">' + sec.title +
      (sec.flagged ? '<span class="badge">high risk</span>' : '') + '</span>' +
    '<span class="sec-count" data-count></span>';
  btn.addEventListener("click", () => {
    const open = el.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  const body = document.createElement("div");
  body.className = "body";
  if(sec.note){
    const n = document.createElement("p");
    n.className = "note";
    n.textContent = sec.note;
    body.appendChild(n);
  }

  sec.groups.forEach((grp, gi) => {
    const wrap = document.createElement("div");
    wrap.className = "group-wrap";

    const h = document.createElement("div");
    h.className = "group";
    h.textContent = grp.g;
    wrap.appendChild(h);

    grp.items.forEach((item, ii) => {
      const key = kC(item);
      const row = document.createElement("div");
      row.className = "row";
      row.dataset.key = key;
      if(state[key]) row.dataset.state = state[key];

      const mb = document.createElement("button");
      mb.className = "mark-btn";
      mb.setAttribute("aria-label", "Mark karo: " + item);
      mb.innerHTML = '<span class="box">' + ICONS + '</span>';
      mb.addEventListener("click", () => openAsk(row, item));

      const tb = document.createElement("button");
      tb.className = "txt-btn";
      tb.title = "Tap karke copy karo";
      tb.innerHTML = '<span class="txt"></span>' + COPY_ICO;
      tb.querySelector(".txt").textContent = item;
      tb.addEventListener("click", () => copyTopic(row, item));

      row.append(mb, tb);
      wrap.appendChild(row);
    });

    body.appendChild(wrap);
  });

  el.append(btn, body);
  list.appendChild(el);

  const m = document.createElement("button");
  m.className = "mark";
  m.title = sec.title;
  m.setAttribute("aria-label", "Jump to " + sec.title);
  m.innerHTML = '<i class="f-thoda"></i><i class="f-haan"></i>';
  m.addEventListener("click", () => {
    if(!el.classList.contains("open")) btn.click();
    el.scrollIntoView({behavior:"smooth", block:"start"});
  });
  marks.appendChild(m);
});

/* ---- confirm sheet ---- */
function openAsk(row, label){
  pending = row;
  askTopic.textContent = label;
  scrim.classList.add("on");
  document.body.style.overflow = "hidden";
}
function closeAsk(){
  pending = null;
  scrim.classList.remove("on");
  if(!cheat.classList.contains("on") && !allq.classList.contains("on")) document.body.style.overflow = "";
}
function setState(val){
  if(!pending) return;
  const key = pending.dataset.key;
  put(key, val);
  if(val) pending.dataset.state = val; else delete pending.dataset.state;
  closeAsk(); refresh(); cheatRefresh(); if(typeof cheat2Refresh === "function") cheat2Refresh(); if(typeof cheatRefresh === "function") cheatRefresh();
}
document.querySelectorAll(".ask-btns button").forEach(b =>
  b.addEventListener("click", () => setState(b.dataset.set)));
document.getElementById("askclear").addEventListener("click", () => setState(null));
scrim.addEventListener("click", e => { if(e.target === scrim) closeAsk(); });
document.addEventListener("keydown", e => {
  if(e.key !== "Escape") return;
  if(scrim.classList.contains("on")) closeAsk();
  else if(cheat.classList.contains("on")){
    cheat.classList.remove("on"); document.body.style.overflow = "";
  }
  else if(allq.classList.contains("on")){
    allq.classList.remove("on"); document.body.style.overflow = "";
  }
});

/* ---- filter ---- */
// Scoped to [data-filter], not .tab: the cheatsheet filters and their
// expand/collapse buttons share the .tab class for styling, so the broad
// selector let a cheatsheet click rewrite this list's filter to undefined —
// deselecting every tab, force-opening all sections and hiding marked rows.
document.querySelectorAll("[data-filter]").forEach(t => t.addEventListener("click", () => {
  document.querySelectorAll("[data-filter]").forEach(x => x.setAttribute("aria-selected","false"));
  t.setAttribute("aria-selected","true");
  filter = t.dataset.filter;
  applyFilter();
}));

function matches(row){
  const st = row.dataset.state;
  if(filter === "all") return true;
  if(filter === "baaki") return !st;
  return st === filter;
}

function applyFilter(){
  let anyVisible = false;
  document.querySelectorAll("section").forEach(sec => {
    let secVisible = false;
    sec.querySelectorAll(".group-wrap").forEach(wrap => {
      let grpVisible = false;
      wrap.querySelectorAll(".row").forEach(row => {
        const ok = matches(row);
        row.classList.toggle("hidden", !ok);
        if(ok) grpVisible = true;
      });
      wrap.classList.toggle("hidden", !grpVisible);
      if(grpVisible) secVisible = true;
    });
    sec.classList.toggle("hidden", !secVisible);
    if(secVisible){
      anyVisible = true;
      if(filter !== "all" && !sec.classList.contains("open")){
        sec.classList.add("open");
        sec.querySelector(".sec-btn").setAttribute("aria-expanded","true");
      }
    }
  });
  const labels = {
    haan:"Abhi tak kuch bhi 'Haan bhai' mark nahi kiya.",
    thoda:"'Thoda thoda' wali list khaali hai.",
    naa:"'Naa bhai' wali list khaali hai — ya to sab aata hai, ya abhi start nahi kiya.",
    baaki:"Sab kuch mark ho chuka hai. Ab revision."
  };
  emptyMsg.textContent = labels[filter] || "";
  emptyMsg.classList.toggle("hidden", anyVisible || filter === "all");
}

/* ---- progress ---- */
function refresh(){
  let total = 0, haan = 0, thoda = 0, naa = 0;
  DATA.forEach((sec, si) => {
    let t = 0, h = 0, td = 0;
    sec.groups.forEach(grp => grp.items.forEach(item => {
      t++;
      const v = state[kC(item)];
      if(v === "haan") h++;
      else if(v === "thoda") td++;
      else if(v === "naa") naa++;
    }));
    total += t; haan += h; thoda += td;
    const el = document.getElementById("sec-" + sec.id);
    el.querySelector("[data-count]").textContent = h + "/" + t;
    el.classList.toggle("complete", h === t);
    const bar = marks.children[si];
    bar.querySelector(".f-haan").style.width = (h / t * 100) + "%";
    bar.querySelector(".f-thoda").style.width = ((h + td) / t * 100) + "%";
  });
  document.getElementById("tally").innerHTML =
    haan + "<span> / " + total + " pakka</span>";
  document.getElementById("allqsub").textContent =
    haan + "/" + total + " pakka · " + thoda + " thoda thoda · checklist, progress ke saath";
  document.getElementById("key").textContent =
    thoda + " thoda thoda · " + naa + " naa bhai · " +
    (total - haan - thoda - naa) + " baaki";
  applyFilter();
}

document.getElementById("expand").addEventListener("click", () => {
  document.querySelectorAll("section").forEach(s => {
    s.classList.add("open");
    s.querySelector(".sec-btn").setAttribute("aria-expanded","true");
  });
});
document.getElementById("collapse").addEventListener("click", () => {
  document.querySelectorAll("section").forEach(s => {
    s.classList.remove("open");
    s.querySelector(".sec-btn").setAttribute("aria-expanded","false");
  });
});
document.getElementById("reset").addEventListener("click", () => {
  if(!confirm("Saare marks hat jayenge, zero se shuru. Pakka?")) return;
  const now = Date.now();
  for(const k in entries) entries[k] = { v: null, t: now };
  rebuild(); save();
  if(typeof sync !== "undefined") sync.soon();
  refreshAll();
});

function refreshAll(){
  document.querySelectorAll("#list .row").forEach(r => {
    const v = state[r.dataset.key];
    if(v) r.dataset.state = v; else delete r.dataset.state;
  });
  refresh(); cheatRefresh(); if(typeof cheat2Refresh === "function") cheat2Refresh();
}

/* ================= CHEATSHEET ================= */
const cheat = document.getElementById("cheat");
const cheatList = document.getElementById("cheatlist");
const cheatSearch = document.getElementById("cheatsearch");
var cfilter = "all";

CHEAT.forEach((grp, gi) => {
  const h = document.createElement("div");
  h.className = "ch-grp";
  h.textContent = grp.g;
  cheatList.appendChild(h);
  grp.items.forEach(([term, def], ii) => {
    const key = kK(term);
    const c = document.createElement("div");
    c.className = "ch-card";
    c.dataset.key = key;
    c.dataset.find = (term + " " + def).toLowerCase();
    if(state[key]) c.dataset.state = state[key];

    const mb = document.createElement("button");
    mb.className = "mark-btn";
    mb.setAttribute("aria-label", "Mark karo: " + term);
    mb.innerHTML = '<span class="box">' + ICONS + '</span>';
    mb.addEventListener("click", () => openAsk(c, term));

    const tb = document.createElement("button");
    tb.className = "ch-txt";
    tb.title = "Tap karke copy karo";
    const b = document.createElement("b"); b.textContent = term;
    const p = document.createElement("p"); p.textContent = def;
    tb.append(b, p);
    tb.addEventListener("click", () => copyTopic(c, term + " — " + def));

    c.append(mb, tb);
    cheatList.appendChild(c);
  });
});

function cheatRefresh(){
  cheatList.querySelectorAll(".ch-card").forEach(c => {
    const v = state[c.dataset.key];
    if(v) c.dataset.state = v; else delete c.dataset.state;
  });
  let total = 0, haan = 0, thoda = 0;
  CHEAT.forEach((grp, gi) => grp.items.forEach((_, ii) => {
    total++;
    const v = state[kK(grp.items[ii][0])];
    if(v === "haan") haan++; else if(v === "thoda") thoda++;
  }));
  document.getElementById("chtally").textContent =
    haan + "/" + total + (thoda ? " · " + thoda + " thoda" : "");
  if(typeof cheatFilter === "function") cheatFilter();
}
cheatRefresh();

document.getElementById("cheatopen").addEventListener("click", () => {
  cheat.classList.add("on");
  document.body.style.overflow = "hidden";
});
document.getElementById("cheatclose").addEventListener("click", () => {
  cheat.classList.remove("on");
  document.body.style.overflow = "";
});
function cheatFilter(){
  const q = cheatSearch.value.trim().toLowerCase();
  let node = cheatList.firstChild, grpEl = null, grpHas = false;
  const flush = () => { if(grpEl) grpEl.classList.toggle("hidden", !grpHas); };
  while(node){
    if(node.classList.contains("ch-grp")){ flush(); grpEl = node; grpHas = false; }
    else {
      const st = node.dataset.state;
      const okF = cfilter === "all" ? true : (cfilter === "baaki" ? !st : st === cfilter);
      const ok = okF && (!q || node.dataset.find.includes(q));
      node.classList.toggle("hidden", !ok);
      if(ok) grpHas = true;
    }
    node = node.nextSibling;
  }
  flush();
}

cheatSearch.addEventListener("input", cheatFilter);
document.querySelectorAll("[data-cfilter]").forEach(t => t.addEventListener("click", () => {
  document.querySelectorAll("[data-cfilter]").forEach(x => x.setAttribute("aria-selected","false"));
  t.setAttribute("aria-selected","true");
  cfilter = t.dataset.cfilter;
  cheatFilter();
}));

/* ================= CHEATSHEET 2 ================= */
const cheat2List = document.getElementById("cheat2list");
const cheat2Search = document.getElementById("cheat2search");
const ch2Tally = document.getElementById("ch2tally");
var c2filter = "all";

function esc(t){ const d = document.createElement("div"); d.textContent = t; return d.innerHTML; }
// Escape first, then allow two bits of markdown: `code` and **bold**.
function inl(t){
  return esc(t)
    .replace(/`([^`]+)`/g, '<code class="ic">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
}

// One answer → its HTML and a plain-text version (for copy and search).
// Shared by the main list and practice mode.
function answerParts(it){
  const paras = Array.isArray(it.a) ? it.a : (it.a ? [it.a] : []);
  let plain = it.q + (it.qc ? "\n\n" + it.qc : "") + "\n\n" + paras.join("\n\n");
  let html = paras.map(p => "<p>" + inl(p) + "</p>").join("");
  if(it.t){
    html += '<div class="tbl-wrap"><table class="ch-tbl"><tr>' + it.t.h.map(x => "<th>" + inl(x) + "</th>").join("") + "</tr>";
    plain += "\n\n" + it.t.h.join(" | ");
    it.t.r.forEach(r => { html += "<tr>" + r.map(x => "<td>" + inl(x) + "</td>").join("") + "</tr>";
      plain += "\n" + r.join(" | "); });
    html += "</table></div>";
  }
  if(it.pts){
    html += '<ul class="ch-pts">' + it.pts.map(p => "<li>" + inl(p) + "</li>").join("") + "</ul>";
    plain += "\n\n" + it.pts.map(p => "- " + p).join("\n");
  }
  if(it.ex){ html += '<code class="ch-ex">' + esc(it.ex) + "</code>"; plain += "\n\n" + it.ex; }
  if(it.trap){ html += '<p class="ch-trap">' + inl(it.trap) + "</p>"; plain += "\n\nInterview trap: " + it.trap; }
  if(it.h){ html += '<em class="ch-hook">' + inl(it.h) + "</em>"; plain += "\n\nYaad rakho: " + it.h; }
  return { html, plain };
}

// "My note" box under an answer. Saves as you type (debounced) and syncs.
function noteBox(key){
  const wrap = document.createElement("div");
  wrap.className = "note-box";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "note-toggle";
  const ta = document.createElement("textarea");
  ta.className = "note-ta";
  ta.rows = 3;
  ta.placeholder = "Apne project ka example, numbers, jo interview mein bolna hai…";
  ta.dataset.key = key;
  let timer = null;
  const paint = () => {
    const has = !!(notes[key] && notes[key].s);
    ta.hidden = !has && document.activeElement !== ta && !wrap.classList.contains("editing");
    btn.textContent = has ? "📝 Mera note" : "📝 Apna note likho";
    wrap.closest(".ch-card")?.classList.toggle("has-note", has);
  };
  btn.addEventListener("click", () => { wrap.classList.add("editing"); ta.hidden = false; ta.focus(); });
  ta.value = (notes[key] && notes[key].s) || "";
  ta.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { putNote(key, ta.value.trim() ? ta.value : ""); paint(); }, 600);
  });
  ta.addEventListener("blur", () => { wrap.classList.remove("editing"); paint(); });
  wrap.append(btn, ta);
  wrap.paint = paint;
  return wrap;
}

// Re-read notes into every box (after a sync merge), without clobbering one being typed in.
function refreshNotes(){
  document.querySelectorAll(".note-ta").forEach(ta => {
    if(document.activeElement === ta) return;
    ta.value = (notes[ta.dataset.key] && notes[ta.dataset.key].s) || "";
    ta.parentElement.paint();
  });
}

CHEAT2.forEach((grp, gi) => {
  const h = document.createElement("div");
  h.className = "ch-grp";
  h.textContent = grp.g;
  cheat2List.appendChild(h);

  grp.items.forEach((it, ii) => {
    const key = kA(it.q);
    const c = document.createElement("div");
    c.className = "ch-card";
    c.dataset.key = key;
    if(state[key]) c.dataset.state = state[key];

    const { html, plain } = answerParts(it);
    c.dataset.find = plain.toLowerCase();

    const mb = document.createElement("button");
    mb.className = "mark-btn";
    mb.setAttribute("aria-label", "Mark karo: " + it.q);
    mb.innerHTML = '<span class="box">' + ICONS + '</span>';
    mb.addEventListener("click", () => openAsk(c, it.q));

    const main = document.createElement("div");
    main.className = "c2-main";

    const qb = document.createElement("button");
    qb.className = "c2-q";
    qb.setAttribute("aria-expanded", "false");
    qb.innerHTML = '<span></span><svg viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1L6.5 6L1.5 11"/></svg>';
    qb.querySelector("span").textContent = it.q;
    qb.addEventListener("click", () => {
      const open = c.classList.toggle("open");
      qb.setAttribute("aria-expanded", open ? "true" : "false");
    });

    const det = document.createElement("div");
    det.className = "c2-det";
    det.innerHTML = html;
    const cp = document.createElement("button");
    cp.className = "c2-copy";
    cp.textContent = "Copy karo";
    cp.addEventListener("click", () => copyTopic(c, plain));
    const nb = noteBox(key);
    det.append(nb, cp);

    // Question code stays visible when the card is closed: think first, then open.
    if(it.qc){
      const qc = document.createElement("code");
      qc.className = "ch-ex c2-qc";
      qc.textContent = it.qc;
      main.append(qb, qc, det);
    } else main.append(qb, det);
    c.append(mb, main);
    cheat2List.appendChild(c);
    nb.paint();
  });
});

function cheat2Filter(){
  const q = cheat2Search.value.trim().toLowerCase();
  let node = cheat2List.firstChild, grpEl = null, grpHas = false;
  const flush = () => { if(grpEl) grpEl.classList.toggle("hidden", !grpHas); };
  while(node){
    if(node.classList.contains("ch-grp")){ flush(); grpEl = node; grpHas = false; }
    else {
      const st = node.dataset.state;
      const okF = c2filter === "all" ? true : (c2filter === "baaki" ? !st : st === c2filter);
      const note = notes[node.dataset.key];
      const hay = note && note.s ? node.dataset.find + "\n" + note.s.toLowerCase() : node.dataset.find;
      const ok = okF && (!q || hay.includes(q));
      node.classList.toggle("hidden", !ok);
      if(q){
        node.classList.toggle("open", ok);
        const b = node.querySelector(".c2-q");
        if(b) b.setAttribute("aria-expanded", ok ? "true" : "false");
      }
      if(ok) grpHas = true;
    }
    node = node.nextSibling;
  }
  flush();
}

function cheat2Toggle(open){
  cheat2List.querySelectorAll(".ch-card").forEach(c => {
    c.classList.toggle("open", open);
    const b = c.querySelector(".c2-q");
    if(b) b.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

function cheat2Refresh(){
  let total = 0, haan = 0, thoda = 0;
  cheat2List.querySelectorAll(".ch-card").forEach(c => {
    total++;
    const v = state[c.dataset.key];
    if(v) c.dataset.state = v; else delete c.dataset.state;
    if(v === "haan") haan++; else if(v === "thoda") thoda++;
  });
  ch2Tally.textContent = haan + "/" + total + (thoda ? " \u00b7 " + thoda + " thoda" : "");
  cheat2Filter();
}

cheat2Search.addEventListener("input", cheat2Filter);
document.querySelectorAll("[data-c2filter]").forEach(t => t.addEventListener("click", () => {
  document.querySelectorAll("[data-c2filter]").forEach(x => x.setAttribute("aria-selected","false"));
  t.setAttribute("aria-selected","true");
  c2filter = t.dataset.c2filter;
  cheat2Filter();
}));
document.getElementById("c2expand").addEventListener("click", () => cheat2Toggle(true));
document.getElementById("c2collapse").addEventListener("click", () => cheat2Toggle(false));
/* ================= ALL QUESTIONS (the checklist, now an overlay) ================= */
const allq = document.getElementById("allq");
document.getElementById("allqopen").addEventListener("click", () => {
  allq.classList.add("on");
  document.body.style.overflow = "hidden";
});
document.getElementById("allqclose").addEventListener("click", () => {
  allq.classList.remove("on");
  document.body.style.overflow = "";
});

/* ================= THEME ================= */
// Follows the system setting until the user picks one; the choice is stored
// and re-applied by the inline script in <head> before first paint.
const themeBtn = document.getElementById("themebtn");
const darkMQ = window.matchMedia("(prefers-color-scheme: dark)");
function isDark(){
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : darkMQ.matches;
}
function paintThemeBtn(){
  themeBtn.textContent = isDark() ? "☀︎ Light" : "☾ Dark";
}
themeBtn.addEventListener("click", () => {
  const next = isDark() ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try{ localStorage.setItem("prep-theme", next); }catch(e){}
  paintThemeBtn();
});
darkMQ.addEventListener("change", paintThemeBtn);
paintThemeBtn();
cheat2Refresh();

refresh();

/* ================= SYNC ================= */
// One PUT both pushes this device's marks and pulls everyone else's: the
// server merges and returns the result, which is merged back here.
const sync = (() => {
  const LS = "prep-sync-key";
  let code = null;
  try{ code = localStorage.getItem(LS); }catch(e){}
  let timer = null, busy = false, again = false;

  const btn = document.getElementById("syncbtn");
  const sheet = document.getElementById("syncsheet");
  const statusEl = document.getElementById("syncstatus");
  const offEl = document.getElementById("sync-off");
  const onEl = document.getElementById("sync-on");
  const codeEl = document.getElementById("synccode");
  const input = document.getElementById("syncinput");

  function status(s, msg){
    btn.dataset.s = s;
    btn.textContent = { off:"Sync", syncing:"Sync\u2026", ok:"Synced \u2713", error:"Sync !" }[s];
    statusEl.textContent = msg || {
      off: "Abhi sirf is device pe save ho raha hai.",
      syncing: "Sync ho raha hai\u2026",
      ok: "Sab devices ek jaise hain. Last sync: " + new Date().toLocaleTimeString(),
      error: "Sync nahi hua."
    }[s];
  }
  const qrEl = document.getElementById("syncqr");

  // The join link carries the code in the #fragment, which browsers never send
  // to the server — so it stays out of access logs.
  function joinLink(){ return location.origin + location.pathname + "#sync=" + code; }

  // QR library is only needed when the panel shows a code, so load it then.
  // Pinned version + SRI hash: a tampered CDN file refuses to run.
  let qrLib = null;
  function loadQR(){
    if(window.QRCode) return Promise.resolve();
    if(qrLib) return qrLib;
    qrLib = new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
      s.integrity = "sha512-CNgIRecGo7nphbeZ04Sc13ka07paqdeTu0WR1IM4kNcpmBAUSHSQX0FslNhTDadL4O5SAGapGt4FodqL8My0mA==";
      s.crossOrigin = "anonymous";
      s.referrerPolicy = "no-referrer";
      s.onload = ok;
      s.onerror = () => { qrLib = null; fail(); };
      document.head.appendChild(s);
    });
    return qrLib;
  }
  function paintQR(){
    qrEl.textContent = "";
    if(!code) return;
    loadQR().then(() => {
      qrEl.textContent = "";
      new window.QRCode(qrEl, { text: joinLink(), width: 220, height: 220, correctLevel: window.QRCode.CorrectLevel.M });
    }).catch(() => {
      qrEl.textContent = "QR load nahi hua (internet?). Link copy karke doosre device pe khol do.";
    });
  }

  function paint(){
    offEl.hidden = !!code; onEl.hidden = !code;
    codeEl.textContent = code || "";
    if(code) paintQR(); else { qrEl.textContent = ""; status("off"); }
  }

  // A chosen password becomes the sync code via SHA-256, so the password itself
  // never leaves the device and the server sees the same 43-char code format.
  async function codeFromPassword(p){
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("prep-sync:" + p));
    return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function newCode(){
    const a = new Uint8Array(18);
    crypto.getRandomValues(a);
    return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function merge(remote, remoteNotes){
    let changed = false, notesChanged = false;
    for(const k in remote){
      const r = remote[k];
      if(!r || typeof r.t !== "number") continue;
      if(!entries[k] || r.t > entries[k].t){ entries[k] = { v: r.v || null, t: r.t }; changed = true; }
    }
    for(const k in remoteNotes){
      const r = remoteNotes[k];
      if(!r || typeof r.t !== "number" || typeof r.s !== "string") continue;
      if(!notes[k] || r.t > notes[k].t){ notes[k] = { s: r.s, t: r.t }; notesChanged = true; }
    }
    if(changed || notesChanged){ rebuild(); save(); }
    if(changed) refreshAll();
    if(notesChanged) refreshNotes();
  }
  async function run(){
    if(!code) return;
    if(busy){ again = true; return; }
    busy = true; status("syncing");
    try{
      const res = await fetch("/api/progress?key=" + encodeURIComponent(code), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e: entries, n: notes })
      });
      const j = await res.json().catch(() => ({}));
      if(!res.ok){
        const why = res.status === 503 ? "Server pe storage abhi set nahi hua — Vercel mein Redis jodna baaki hai."
                  : res.status === 400 ? "Ye sync code sahi nahi lag raha."
                  : "Server ne mana kar diya (" + res.status + ").";
        throw new Error(why);
      }
      merge(j.e || {}, j.n || {});
      status("ok");
    }catch(e){
      status("error", e.message && !/fetch/i.test(e.message) ? e.message : "Internet ya server se connect nahi ho paaya. Marks is device pe safe hain, baad mein sync ho jayenge.");
    }
    busy = false;
    if(again){ again = false; run(); }
  }
  function soon(){ if(!code) return; clearTimeout(timer); timer = setTimeout(run, 1200); }
  function setCode(c){
    code = c;
    try{ c ? localStorage.setItem(LS, c) : localStorage.removeItem(LS); }catch(e){}
    paint();
    if(c) run();
  }

  btn.addEventListener("click", () => { paint(); if(code && btn.dataset.s !== "syncing") status(btn.dataset.s || "ok"); sheet.classList.add("on"); });
  document.getElementById("syncclose").addEventListener("click", () => sheet.classList.remove("on"));
  sheet.addEventListener("click", e => { if(e.target === sheet) sheet.classList.remove("on"); });
  document.getElementById("syncstart").addEventListener("click", () => setCode(newCode()));
  document.getElementById("syncjoin").addEventListener("click", () => {
    const c = input.value.trim();
    if(!/^[A-Za-z0-9_-]{20,64}$/.test(c)){ status("error", "Code poora paste karo — ye 24 characters ka hota hai."); return; }
    input.value = "";
    setCode(c);
  });
  document.getElementById("synccopy").addEventListener("click", () => copyTopic(sheet, code));
  document.getElementById("synclink").addEventListener("click", () => copyTopic(sheet, joinLink()));
  document.getElementById("syncpassgo").addEventListener("click", async () => {
    const pw = document.getElementById("syncpass");
    if(pw.value.length < 12){ status("error", "Password kam se kam 12 characters ka rakho."); return; }
    if(!(crypto && crypto.subtle)){ status("error", "Is browser mein password wala tareeka nahi chalega — QR use karo."); return; }
    const c = await codeFromPassword(pw.value);
    pw.value = "";
    setCode(c);
  });
  document.getElementById("syncnow").addEventListener("click", run);
  document.getElementById("syncstop").addEventListener("click", () => {
    if(!confirm("Is device pe sync band ho jayega. Marks yahan bache rahenge. Pakka?")) return;
    setCode(null);
  });
  document.addEventListener("keydown", e => { if(e.key === "Escape") sheet.classList.remove("on"); });
  // Coming back to the tab (phone unlocked, laptop tab refocused) pulls the latest.
  document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible") run(); });

  // Opened from a scanned QR / shared link: join, then strip the code from the
  // address bar so it isn't left in history or re-shared by accident.
  let joined = false;
  const m = location.hash.match(/^#sync=([A-Za-z0-9_-]{20,64})$/);
  if(m){
    history.replaceState(null, "", location.pathname + location.search);
    if(m[1] !== code){
      setCode(m[1]);                 // setCode runs the first sync itself
      joined = true;
      flash("Sync jud gaya — ticks aur notes aa rahe hain");
    }
  }

  paint();
  if(code && !joined) run();
  return { soon, run };
})();

/* ================= PRACTICE MODE ================= */
// One card at a time: question (and its code) first, answer on demand, then
// an honest self-mark that goes into the same ticks the rest of the app uses.
const practice = (() => {
  const $ = id => document.getElementById(id);
  const ov = $("practice");
  const ALL = CHEAT2.flatMap(g => g.items.map(it => ({ it, g: g.g, key: kA(it.q) })));
  const RANK = { naa: 0, thoda: 1 };           // weak-first ordering; unmarked last
  let queue = [], i = 0, tally = null;

  CHEAT2.forEach(g => {
    const o = document.createElement("option");
    o.value = g.g; o.textContent = g.g + " (" + g.items.length + ")";
    $("prgroup").appendChild(o);
  });

  const src = () => document.querySelector('input[name="prsrc"]:checked').value;
  function pool(){
    const grp = $("prgroup").value, s = src();
    return ALL.filter(x => {
      if(grp && x.g !== grp) return false;
      const st = state[x.key];
      if(s === "weak")  return st !== "haan";
      if(s === "naa")   return st === "naa";
      if(s === "baaki") return !st;
      return true;
    });
  }
  function shuffle(a){
    for(let j = a.length - 1; j > 0; j--){ const k = Math.floor(Math.random() * (j + 1)); [a[j], a[k]] = [a[k], a[j]]; }
    return a;
  }
  function avail(){
    const n = pool().length;
    $("pravail").textContent = n ? n + " sawaal is filter mein hain." : "Is filter mein koi sawaal nahi — doosra chuno.";
    $("prstart").disabled = !n;
  }
  function screen(name){
    $("prsetup").hidden = name !== "setup";
    $("prcard").hidden  = name !== "card";
    $("prdone").hidden  = name !== "done";
    ov.querySelector(".cheat-body").scrollTop = 0;
  }
  function show(){
    if(i >= queue.length) return done();
    const x = queue[i];
    $("prprog").textContent = (i + 1) + " / " + queue.length;
    $("prgrp").textContent = x.g;
    $("prq").textContent = x.it.q;
    $("prqc").hidden = !x.it.qc;
    $("prqc").textContent = x.it.qc || "";
    $("prans").hidden = true; $("prans").innerHTML = "";
    $("prmark").hidden = true;
    $("prreveal").parentElement.hidden = false;
    screen("card");
  }
  function reveal(){
    $("prans").innerHTML = answerParts(queue[i].it).html;
    $("prans").hidden = false;
    $("prmark").hidden = false;
    $("prreveal").parentElement.hidden = true;
  }
  function next(){ i++; show(); }
  function done(){
    $("prprog").textContent = "";
    const t = tally;
    $("prsummary").textContent =
      "Haan bhai: " + t.haan + " · Thoda thoda: " + t.thoda + " · Naa bhai: " + t.naa + (t.skip ? " · Skip: " + t.skip : "") +
      (t.naa + t.thoda ? ". Jo nahi aaye wo ab \"Naa bhai\" / \"Thoda thoda\" mein hain — agle round mein pehle wahi aayenge." : ". Badhiya!");
    screen("done");
  }
  function start(){
    const s = src(), n = +$("prcount").value;
    let q = shuffle(pool());
    if(s === "weak") q.sort((a, b) => (RANK[state[a.key]] ?? 2) - (RANK[state[b.key]] ?? 2));
    queue = n ? q.slice(0, n) : q;
    i = 0; tally = { haan: 0, thoda: 0, naa: 0, skip: 0 };
    show();
  }
  function open(){ avail(); screen("setup"); ov.classList.add("on"); document.body.style.overflow = "hidden"; }
  function close(){ ov.classList.remove("on"); document.body.style.overflow = ""; $("prprog").textContent = ""; }

  $("practiceopen").addEventListener("click", open);
  $("practiceclose").addEventListener("click", close);
  $("prgroup").addEventListener("change", avail);
  document.querySelectorAll('input[name="prsrc"]').forEach(r => r.addEventListener("change", avail));
  $("prstart").addEventListener("click", start);
  $("prreveal").addEventListener("click", reveal);
  $("prskip").addEventListener("click", () => { tally.skip++; next(); });
  $("pragain").addEventListener("click", () => { avail(); screen("setup"); });
  document.querySelectorAll("[data-pr]").forEach(b => b.addEventListener("click", () => {
    const v = b.dataset.pr;
    put(queue[i].key, v);
    tally[v]++;
    refreshAll();
    next();
  }));
  document.addEventListener("keydown", e => {
    if(!ov.classList.contains("on")) return;
    if(e.key === "Escape") close();
    else if(e.key === " " && !$("prcard").hidden && !$("prreveal").parentElement.hidden && document.activeElement.tagName !== "INPUT"){ e.preventDefault(); reveal(); }
  });
  return { open };
})();

/* ================= OFFLINE ================= */
// Service worker caches the app shell so it opens without internet (train,
// flight). Pages stay network-first, so online visits always get the latest.
if("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")){
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
