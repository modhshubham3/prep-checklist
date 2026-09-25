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
// User-made records (own questions, diary entries, practice counts), same
// merge rule. Shapes are documented in api/progress.js. Deleted = { del: true }.
let recs = {};         // key -> { t: ms, ... }
const onRecs = [];     // views that redraw when records change (after a sync)

function save(){
  if(!storageOK) return;
  try{ localStorage.setItem(STORE, JSON.stringify({ e: entries, n: notes, x: recs })); }catch(e){ storageOK = false; }
}
function put(key, v){
  entries[key] = { v: v || null, t: Date.now() };
  rebuild(); save();
  if(typeof sync !== "undefined") sync.soon();
}
function putRec(key, r){
  recs[key] = Object.assign({}, r, { t: Date.now() });
  save();
  if(typeof sync !== "undefined") sync.soon();
}
const liveRecs = prefix => Object.keys(recs).filter(k => k.startsWith(prefix) && !recs[k].del).map(k => Object.assign({ key: k }, recs[k]));
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
  if(raw){ const o = JSON.parse(raw) || {}; entries = o.e || {}; notes = o.n || {}; recs = o.x || {}; }
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

/* ================= FOLDABLE GROUPS ================= */
// A group heading folds its cards away. Which groups are open is remembered
// per list on this device only (a view preference, so it doesn't sync).
// Nothing stored yet = every group folded, so a long list opens as an index.
function folds(store){
  let open;
  try{ open = new Set(JSON.parse(localStorage.getItem(store) || "[]")); }catch(e){ open = new Set(); }
  const keep = () => { try{ localStorage.setItem(store, JSON.stringify([...open])); }catch(e){} };
  return {
    isOpen: name => open.has(name),
    set(name, on){ on ? open.add(name) : open.delete(name); keep(); },
    all(names, on){ open = new Set(on ? names : []); keep(); },
  };
}

// Heading button: chevron, title, and a count that the list's filter fills in.
function grpHead(name, fold, onToggle){
  const h = document.createElement("button");
  h.type = "button";
  h.className = "ch-grp";
  h.dataset.g = name;
  h.innerHTML = '<svg class="chev" viewBox="0 0 8 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1L6.5 6L1.5 11"/></svg><span class="g-t"></span><span class="g-n"></span>';
  h.querySelector(".g-t").textContent = name;
  h.addEventListener("click", () => { fold.set(name, !fold.isOpen(name)); onToggle(); });
  return h;
}

// Shared filter walk for a list of headings followed by their cards.
// match(card) decides filter + search; while searching, folds are ignored so
// every hit shows. Heading count: matches while filtering, else haan/total.
function walkGroups(list, fold, match, searching, filtering){
  let node = list.firstChild, head = null, hits = 0, total = 0, haan = 0;
  const flush = () => {
    if(!head) return;
    const open = searching || fold.isOpen(head.dataset.g);
    head.classList.toggle("hidden", !hits);
    head.classList.toggle("shut", !open);
    head.setAttribute("aria-expanded", open ? "true" : "false");
    head.querySelector(".g-n").textContent = (searching || filtering) ? hits : haan + "/" + total;
  };
  let open = true;
  while(node){
    if(node.classList.contains("ch-grp")){
      flush(); head = node; hits = total = haan = 0;
      open = searching || fold.isOpen(node.dataset.g);
    } else {
      const ok = match(node);
      total++; if(node.dataset.state === "haan") haan++;
      if(ok) hits++;
      node.classList.toggle("hidden", !ok || !open);
    }
    node = node.nextSibling;
  }
  flush();
}

/* ================= CHEATSHEET ================= */
const cheat = document.getElementById("cheat");
const cheatList = document.getElementById("cheatlist");
const cheatSearch = document.getElementById("cheatsearch");
var cfilter = "all";
const cheatFold = folds("prep-folds-cheat");

CHEAT.forEach((grp, gi) => {
  cheatList.appendChild(grpHead(grp.g, cheatFold, () => cheatFilter()));
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
    const p = document.createElement("p"); p.innerHTML = inl(def);   // `code` and **bold**
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
  walkGroups(cheatList, cheatFold, node => {
    const st = node.dataset.state;
    const okF = cfilter === "all" ? true : (cfilter === "baaki" ? !st : st === cfilter);
    return okF && (!q || node.dataset.find.includes(q));
  }, !!q, cfilter !== "all");
}
document.getElementById("chexpand").addEventListener("click", () => { cheatFold.all(CHEAT.map(g => g.g), true); cheatFilter(); });
document.getElementById("chcollapse").addEventListener("click", () => { cheatFold.all([], false); cheatFilter(); });

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
  let plain = it.q + (it.pq ? "\n" + it.pq : "") + (it.qc ? "\n\n" + it.qc : "") + "\n\n" + paras.join("\n\n");
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

const cheat2Fold = folds("prep-folds-main");
CHEAT2.forEach((grp, gi) => {
  cheat2List.appendChild(grpHead(grp.g, cheat2Fold, () => cheat2Filter()));

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
  walkGroups(cheat2List, cheat2Fold, node => {
    const st = node.dataset.state;
    const okF = c2filter === "all" ? true : (c2filter === "baaki" ? !st : st === c2filter);
    const note = notes[node.dataset.key];
    const hay = note && note.s ? node.dataset.find + "\n" + note.s.toLowerCase() : node.dataset.find;
    const ok = okF && (!q || hay.includes(q));
    if(q){
      node.classList.toggle("open", ok);
      const b = node.querySelector(".c2-q");
      if(b) b.setAttribute("aria-expanded", ok ? "true" : "false");
    }
    return ok;
  }, !!q, c2filter !== "all");
}

// "Sab kholo" opens every group and answer; "Sab band" folds everything back.
function cheat2Toggle(open){
  cheat2Fold.all(CHEAT2.map(g => g.g), open);
  cheat2Filter();
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
  function merge(remote, remoteNotes, remoteRecs){
    let changed = false, notesChanged = false, recsChanged = false;
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
    for(const k in remoteRecs){
      const r = remoteRecs[k];
      if(!r || typeof r.t !== "number") continue;
      if(!recs[k] || r.t > recs[k].t){ recs[k] = r; recsChanged = true; }
    }
    if(changed || notesChanged || recsChanged){ rebuild(); save(); }
    if(recsChanged) onRecs.forEach(f => f());
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
        body: JSON.stringify({ e: entries, n: notes, x: recs })
      });
      const j = await res.json().catch(() => ({}));
      if(!res.ok){
        const why = res.status === 503 ? "Server pe storage abhi set nahi hua — Vercel mein Redis jodna baaki hai."
                  : res.status === 400 ? "Ye sync code sahi nahi lag raha."
                  : "Server ne mana kar diya (" + res.status + ").";
        throw new Error(why);
      }
      merge(j.e || {}, j.n || {}, j.x || {});
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
// One card at a time: the question as an interviewer would ask it, say the
// answer out loud, then see the key points (full answer on demand) and mark
// honestly. Marks go into the same ticks the rest of the app uses, so weak
// questions keep coming back. Oldest-reviewed come first within each level.
const practice = (() => {
  const $ = id => document.getElementById(id);
  const ov = $("practice");
  const BUILT = CHEAT2.flatMap(g => g.items.map(it => ({ it, g: g.g, key: kA(it.q) })));
  const MINE = "Mere sawaal";
  const RANK = { naa: 0, thoda: 1, haan: 3 };   // unmarked = 2
  const MOCK_SECS = 120;
  let queue = [], i = 0, tally = null, combo = 0, missed = [], timed = false, clock = null, left = 0;

  // Own questions (from the diary / added by hand) look like built-in items.
  function mine(){
    return liveRecs("u:").map(r => ({
      it: { q: r.q, a: r.a ? r.a.split(/\n{2,}/) : ["Abhi iska jawab nahi likha — Interview diary → Mere sawaal mein jaake likh do."] },
      g: MINE, key: r.key,
    }));
  }
  const all = () => BUILT.concat(mine());

  // Practice counts: one record per day per device, summed for the view.
  let device;
  try{ device = localStorage.getItem("prep-device"); }catch(e){}
  if(!device){ device = Math.random().toString(36).slice(2, 8); try{ localStorage.setItem("prep-device", device); }catch(e){} }
  const dayKey = d => d.toLocaleDateString("en-CA");                   // yyyy-mm-dd, local time
  const today = () => dayKey(new Date());
  function dayCounts(){
    const d = {};
    liveRecs("p:").forEach(r => { const day = r.key.split(":")[1]; d[day] = (d[day] || 0) + (r.n || 0); });
    return d;
  }
  function logOne(){
    const k = "p:" + today() + ":" + device;
    putRec(k, { n: ((recs[k] && recs[k].n) || 0) + 1 });
  }
  function streak(d){
    let n = 0; const day = new Date();
    if(!d[today()]) day.setDate(day.getDate() - 1);                     // today not started yet: count from yesterday
    while(d[dayKey(day)]){ n++; day.setDate(day.getDate() - 1); }
    return n;
  }
  function stats(){
    const d = dayCounts();
    $("prtoday").textContent = d[today()] || 0;
    $("prstreak").textContent = streak(d);
    $("prweak").textContent = BUILT.filter(x => state[x.key] === "naa" || state[x.key] === "thoda").length;
    const m = mine().length;
    $("prminesub").textContent = m ? m + " sawaal — diary / online se jode hue" : "Abhi koi nahi — Interview diary mein sawaal jodo";
    $("prmine").disabled = !m;
  }

  CHEAT2.forEach(g => {
    const o = document.createElement("option");
    o.value = g.g; o.textContent = g.g + " (" + g.items.length + ")";
    $("prgroup").appendChild(o);
  });
  const mineOpt = document.createElement("option");
  mineOpt.value = MINE; mineOpt.textContent = MINE;
  $("prgroup").appendChild(mineOpt);

  const lastSeen = x => (entries[x.key] && entries[x.key].t) || 0;
  function shuffle(a){
    for(let j = a.length - 1; j > 0; j--){ const k = Math.floor(Math.random() * (j + 1)); [a[j], a[k]] = [a[k], a[j]]; }
    return a;
  }
  // Weakest first; within a level, the one looked at longest ago first.
  const order = list => shuffle(list).sort((a, b) =>
    ((RANK[state[a.key]] ?? 2) - (RANK[state[b.key]] ?? 2)) || (lastSeen(a) - lastSeen(b)));

  function pick({ src = "weak", grp = "", n = 20 }){
    const list = all().filter(x => {
      if(grp && x.g !== grp) return false;
      const st = state[x.key];
      if(src === "weak")  return st !== "haan";
      if(src === "naa")   return st === "naa";
      if(src === "baaki") return !st;
      return true;
    });
    const q = src === "random" ? shuffle(list) : order(list);
    return n ? q.slice(0, n) : q;
  }

  const src = () => document.querySelector('input[name="prsrc"]:checked').value;
  function avail(){
    const n = pick({ src: src(), grp: $("prgroup").value, n: 0 }).length;
    $("pravail").textContent = n ? n + " sawaal is filter mein hain." : "Is filter mein koi sawaal nahi — doosra chuno.";
    $("prstart").disabled = !n;
  }
  function screen(name){
    $("prsetup").hidden = name !== "setup";
    $("prcard").hidden  = name !== "card";
    $("prdone").hidden  = name !== "done";
    $("prbar").hidden = name !== "card";
    ov.querySelector(".cheat-body").scrollTop = 0;
  }

  function stopClock(){ clearInterval(clock); clock = null; }
  function paintClock(){
    const m = Math.floor(Math.abs(left) / 60), s = String(Math.abs(left) % 60).padStart(2, "0");
    $("prclock").textContent = (left < 0 ? "+" : "") + m + ":" + s;
    $("prclock").classList.toggle("late", left <= 0);
  }
  function startClock(){
    stopClock();
    $("prclock").hidden = !timed;
    if(!timed) return;
    left = MOCK_SECS; paintClock();
    clock = setInterval(() => { left--; paintClock(); }, 1000);
  }

  function show(){
    if(i >= queue.length) return done();
    const x = queue[i];
    $("prprog").textContent = (i + 1) + " / " + queue.length;
    $("prbarfill").style.width = (i / queue.length * 100) + "%";
    $("prgrp").textContent = x.g;
    $("prq").innerHTML = inl(x.it.pq || x.it.q);
    $("prqc").hidden = !x.it.qc;
    $("prqc").textContent = x.it.qc || "";
    $("prask").hidden = false;
    $("prans").hidden = true;
    $("prfull").hidden = true; $("prfull").innerHTML = "";
    $("prcombo").textContent = combo >= 3 ? combo + " lagatar sahi 🔥" : "";
    screen("card");
    startClock();
  }

  // Quick check first: bullet points, hook and trap (or the opening paragraph
  // when an answer has no bullets). The full answer is one tap away.
  function keyPoints(it){
    let h = "";
    if(it.pts) h += '<ul class="ch-pts">' + it.pts.map(p => "<li>" + inl(p) + "</li>").join("") + "</ul>";
    else if(it.a && it.a.length) h += "<p>" + inl(it.a[0]) + "</p>";
    if(it.h) h += '<em class="ch-hook">' + inl(it.h) + "</em>";
    if(it.trap) h += '<p class="ch-trap">' + inl(it.trap) + "</p>";
    return h;
  }
  function reveal(){
    stopClock();
    const it = queue[i].it;
    $("prkey").innerHTML = keyPoints(it);
    const paras = it.a ? it.a.length : 0;
    $("prmore").hidden = !(paras > 1 || (it.pts && paras) || it.t || it.ex);
    $("prask").hidden = true;
    $("prans").hidden = false;
  }
  function more(){
    $("prfull").innerHTML = answerParts(queue[i].it).html;
    $("prfull").hidden = false;
    $("prmore").hidden = true;
  }
  function mark(v){
    const x = queue[i];
    put(x.key, v);
    logOne();
    tally[v]++;
    combo = v === "haan" ? combo + 1 : 0;
    if(v !== "haan") missed.push(x);
    refreshAll();
    i++; show();
  }
  function skip(){ stopClock(); tally.skip++; combo = 0; i++; show(); }

  function done(){
    stopClock();
    $("prprog").textContent = "";
    const t = tally, marked = t.haan + t.thoda + t.naa;
    const pct = marked ? Math.round(t.haan / marked * 100) : 0;
    $("prdonetitle").textContent = !marked ? "Round khatam"
      : pct >= 80 ? "Badhiya! " + pct + "% aa gaye"
      : pct >= 50 ? pct + "% aa gaye — theek chal raha hai"
      : pct + "% aaye — inhe dobara dekho";
    $("prresult").innerHTML =
      '<span style="flex:' + t.haan + ';background:var(--done)"></span>' +
      '<span style="flex:' + t.thoda + ';background:var(--flag)"></span>' +
      '<span style="flex:' + t.naa + ';background:var(--miss)"></span>';
    $("prresult").hidden = !marked;
    $("prsummary").textContent = "Aa gaya: " + t.haan + " · Adhoora: " + t.thoda + " · Nahi aaya: " + t.naa + (t.skip ? " · Skip: " + t.skip : "");
    const rv = $("prreview"); rv.innerHTML = "";
    if(missed.length){
      const h = document.createElement("p"); h.className = "sync-help pr-how"; h.textContent = "In pe dobara nazar daalo:";
      rv.appendChild(h);
      missed.forEach(x => {
        const d = document.createElement("details"); d.className = "pr-rv";
        const s = document.createElement("summary"); s.innerHTML = inl(x.it.pq || x.it.q);
        const body = document.createElement("div"); body.className = "c2-det";
        d.addEventListener("toggle", () => { if(d.open && !body.innerHTML) body.innerHTML = answerParts(x.it).html; });
        d.append(s, body); rv.appendChild(d);
      });
    }
    $("prretry").hidden = !missed.length;
    screen("done");
    stats();
  }
  function begin(list, withTimer){
    if(!list.length) return;
    queue = list; i = 0; combo = 0; missed = []; timed = withTimer;
    tally = { haan: 0, thoda: 0, naa: 0, skip: 0 };
    show();
  }

  function mode(m){
    if(m === "quick") begin(pick({ src: "weak", n: 10 }), false);
    else if(m === "mock") begin(pick({ src: "random", n: 5 }), true);
    else if(m === "mine") begin(pick({ grp: MINE, src: "all", n: 0 }), false);
    else if(m === "topic"){ $("prcustom").open = true; avail(); $("prgroup").focus(); }
  }
  function open(){ stats(); avail(); screen("setup"); ov.classList.add("on"); document.body.style.overflow = "hidden"; }
  function close(){ stopClock(); ov.classList.remove("on"); document.body.style.overflow = ""; $("prprog").textContent = ""; }

  $("practiceopen").addEventListener("click", open);
  $("practiceclose").addEventListener("click", close);
  document.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => mode(b.dataset.mode)));
  $("prgroup").addEventListener("change", avail);
  document.querySelectorAll('input[name="prsrc"]').forEach(r => r.addEventListener("change", avail));
  $("prstart").addEventListener("click", () => begin(pick({ src: src(), grp: $("prgroup").value, n: +$("prcount").value }), $("prtimer").checked));
  $("prreveal").addEventListener("click", reveal);
  $("prmore").addEventListener("click", more);
  $("prskip").addEventListener("click", skip);
  $("pragain").addEventListener("click", () => { stats(); avail(); screen("setup"); });
  $("prretry").addEventListener("click", () => begin(order(missed.slice()), timed));
  document.querySelectorAll("[data-pr]").forEach(b => b.addEventListener("click", () => mark(b.dataset.pr)));
  document.addEventListener("keydown", e => {
    if(!ov.classList.contains("on") || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if(e.key === "Escape") return close();
    if($("prcard").hidden) return;
    if(e.key === " " && !$("prask").hidden){ e.preventDefault(); reveal(); }
    else if(!$("prans").hidden && ["1", "2", "3"].includes(e.key)) mark(["haan", "thoda", "naa"][+e.key - 1]);
    else if(e.key === "s" || e.key === "S") skip();
  });
  onRecs.push(() => { if(!$("prsetup").hidden) stats(); });
  return { open, begin };
})();

/* ================= INTERVIEW DIARY ================= */
// Interviews (d:) and own questions (u:) live in the synced records. Each
// line typed under "Kya-kya poochha" becomes an own question linked to its
// interview, so it shows up in practice and in the topic counts.
const diary = (() => {
  const $ = id => document.getElementById(id);
  const ov = $("diary");
  let seq = 0;   // keeps ids made in the same millisecond in typing order
  const newId = () => Date.now().toString(36) + (seq++ % 1296).toString(36).padStart(2, "0") + Math.random().toString(36).slice(2, 5);

  // Topic guess from question text; `grp` matches the site's group titles so
  // the view can say how many built-in questions in that topic are still weak.
  const TOPICS = [
    { name: "C# / OOP",         re: /c#|\boop|class|interface|abstract|inherit|polymorph|encapsul|delegate|generic|linq|async|await|task|thread|garbage|\bgc\b|struct|boxing|static|sealed|solid|exception|string|collection|dictionary/i, grp: /^C#|Tricky — C#|C# —/ },
    { name: "ASP.NET Core / API", re: /asp\.?net|middleware|web ?api|\bapi\b|controller|routing|filter|jwt|auth|dependency injection|\bdi\b|rest|status code|cors|swagger|minimal/i, grp: /ASP\.NET|REST|\.NET practical/ },
    { name: "EF Core",          re: /iqueryable|ienumerable|\bef\b|entity framework|dbcontext|migration|tracking|include|lazy|n\+1|orm|dapper/i, grp: /Entity Framework|Tricky — EF/ },
    { name: "SQL / DB",         re: /sql|query|join|index|salary|group by|having|transaction|acid|normali|procedure|trigger|view|postgres|database|\bdb\b|cte|window|duplicate/i, grp: /SQL|Database/ },
    { name: "Angular / JS",     re: /angular|rxjs|observable|component|directive|pipe|ngonInit|lifecycle|signal|form|typescript|javascript|\bjs\b|promise|closure|hoist|react/i, grp: /Angular|JS/ },
    { name: "System design / Architecture", re: /design|architect|microservice|monolith|scal|cache|redis|kafka|queue|load balanc|cap theorem|shard|replica|pattern|cqrs|clean/i, grp: /Architecture|System design|Design patterns|Resume deep-dive/ },
    { name: "DevOps / Cloud",   re: /docker|kubernetes|k8s|ci\/?cd|pipeline|jenkins|azure|aws|gcp|cloud|git|linux|deploy|nginx/i, grp: /Docker|Git|Linux|Cloud|DevOps/ },
    { name: "Coding round",     re: /reverse|palindrome|anagram|fibonacci|prime|factorial|array|largest|second|sort|binary search|linked list|fizzbuzz|program|code likho|write a/i, grp: /coding round/ },
    { name: "Testing",          re: /test|xunit|nunit|moq|mock|tdd/i, grp: /testing/i },
    { name: "Project / HR",     re: /project|yourself|introduce|role|team|challenge|leave|notice|ctc|salary expect|strength|weakness|why|goal/i, grp: /Project|HR|Templates/ },
  ];
  const topicOf = q => (TOPICS.find(t => t.re.test(q)) || { name: "Baaki" }).name;

  const interviews = () => liveRecs("d:").sort((a, b) => (b.dt || "").localeCompare(a.dt || "") || b.t - a.t);
  const questions = () => liveRecs("u:").sort((a, b) => b.t - a.t || (a.key < b.key ? 1 : -1));
  const label = src => {
    if(src && src.startsWith("d:")){ const d = recs[src]; return d && !d.del ? d.c + " · " + d.r : "Interview"; }
    return src || "Online";
  };

  function addQuestions(text, extra){
    const lines = text.split(/\r?\n/).map(s => s.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim()).filter(Boolean);
    lines.forEach(q => putRec("u:" + newId(), Object.assign({ q: q.slice(0, 500), g: topicOf(q) }, extra)));
    return lines.length;
  }

  function el(tag, cls, text){ const e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }
  function chip(text, kind){ return el("span", "dy-chip" + (kind ? " " + kind : ""), text); }
  const RES_KIND = { Selected: "ok", Rejected: "bad", "Next round": "mid" };

  function drawInterviews(){
    const list = $("dyintlist"); list.innerHTML = "";
    const all = interviews(), qs = questions();
    if(!all.length){ list.appendChild(el("p", "note", "Abhi koi interview nahi joda. Upar \"Naya interview jodo\" se shuru karo — date, round aur jo poochha wo likh do.")); return; }
    all.forEach(d => {
      const card = el("div", "dy-card");
      const head = el("div", "dy-head");
      head.append(el("strong", null, d.c || "Company"), chip(d.dt || ""), chip(d.r || ""));
      const res = el("select", "dy-res");
      ["Pending", "Next round", "Selected", "Rejected"].forEach(v => { const o = el("option", null, v); if(v === d.res) o.selected = true; res.appendChild(o); });
      res.className = "dy-res " + (RES_KIND[d.res] || "");
      res.addEventListener("change", () => { putRec(d.key, Object.assign({}, recs[d.key], { res: res.value })); draw(); });
      head.appendChild(res);
      card.appendChild(head);
      const mineQs = qs.filter(q => q.s === d.key).sort((a, b) => (a.key < b.key ? -1 : 1));
      if(mineQs.length){
        const ul = el("ul", "dy-qs");
        mineQs.forEach(q => ul.appendChild(el("li", state[q.key] ? "st-" + state[q.key] : "", q.q)));
        card.appendChild(ul);
      }
      if(d.no) card.appendChild(el("p", "dy-notes", d.no));
      const del = el("button", "dy-del", "Interview hatao");
      del.type = "button";
      del.addEventListener("click", () => {
        if(!confirm("Ye interview hata dein? Iske sawaal \"Mere sawaal\" mein rahenge.")) return;
        putRec(d.key, { del: true }); draw();
      });
      card.appendChild(del);
      list.appendChild(card);
    });
  }

  function drawMine(){
    const list = $("dyminelist"); list.innerHTML = "";
    const q = $("dymsearch").value.trim().toLowerCase();
    const all = questions().filter(x => !q || (x.q + " " + (x.a || "")).toLowerCase().includes(q));
    if(!questions().length){ list.appendChild(el("p", "note", "Koi sawaal nahi. Online ya interview mein mila koi bhi sawaal upar se jodo — kai ek saath paste kar sakte ho.")); return; }
    if(!all.length){ list.appendChild(el("p", "note", "Is search se kuch nahi mila.")); return; }
    all.forEach(x => {
      const card = el("div", "dy-card dy-q");
      if(state[x.key]) card.dataset.state = state[x.key];
      const top = el("div", "dy-head");
      top.append(el("strong", null, x.q));
      card.appendChild(top);
      const meta = el("div", "dy-meta");
      meta.append(chip(x.g || topicOf(x.q)), chip(label(x.s)));
      const st = el("select", "dy-res");
      [["", "Mark nahi kiya"], ["haan", "Aa gaya"], ["thoda", "Adhoora"], ["naa", "Nahi aata"]].forEach(([v, t]) => {
        const o = el("option", null, t); o.value = v; if((state[x.key] || "") === v) o.selected = true; st.appendChild(o);
      });
      st.addEventListener("change", () => { put(x.key, st.value || null); draw(); });
      meta.appendChild(st);
      card.appendChild(meta);
      const ta = el("textarea", "note-ta dy-ans");
      ta.rows = 3; ta.maxLength = 5000; ta.placeholder = "Apna jawab yahan likho — practice mein yahi dikhega";
      ta.value = x.a || "";
      let timer;
      ta.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => putRec(x.key, Object.assign({}, recs[x.key], { a: ta.value })), 700);
      });
      card.appendChild(ta);
      const del = el("button", "dy-del", "Hatao");
      del.type = "button";
      del.addEventListener("click", () => { if(confirm("Ye sawaal hata dein?")){ putRec(x.key, { del: true }); draw(); } });
      card.appendChild(del);
      list.appendChild(card);
    });
  }

  function drawTopics(){
    const list = $("dytopiclist"); list.innerHTML = "";
    const qs = questions();
    if(!qs.length){ list.appendChild(el("p", "note", "Pehle kuch interviews ya sawaal jodo — phir yahan dikhega kaunse topic sabse zyada poochhe ja rahe hain.")); return; }
    const counts = {};
    qs.forEach(x => { const t = x.g || topicOf(x.q); counts[t] = (counts[t] || 0) + 1; });
    const max = Math.max(...Object.values(counts));
    Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([name, n]) => {
      const t = TOPICS.find(x => x.name === name);
      let weak = 0, total = 0;
      if(t) CHEAT2.filter(g => t.grp.test(g.g)).forEach(g => g.items.forEach(it => {
        total++; const v = state[kA(it.q)]; if(v !== "haan") weak++;
      }));
      const row = el("div", "dy-topic");
      const top = el("div", "dy-head");
      top.append(el("strong", null, name), chip(n + " baar poochha"));
      const bar = el("div", "dy-bar"); const fill = el("span"); fill.style.width = (n / max * 100) + "%"; bar.appendChild(fill);
      row.append(top, bar);
      if(total) row.appendChild(el("p", "dy-notes", weak ? weak + " / " + total + " site ke sawaal is topic mein abhi pakke nahi — practice mein \"Ek topic\" se karo." : "Is topic ke site wale saare sawaal pakke hain."));
      list.appendChild(row);
    });
  }

  let tab = "int";
  function draw(){
    const ints = interviews().length, qs = questions().length;
    $("dytally").textContent = ints + " interviews · " + qs + " sawaal";
    $("diarysub").textContent = ints || qs ? ints + " interviews · " + qs + " apne sawaal" : "Har interview ke sawaal likho — kya baar-baar aa raha hai, dikh jayega";
    if(!ov.classList.contains("on")) return;
    if(tab === "int") drawInterviews(); else if(tab === "mine") drawMine(); else drawTopics();
  }
  function setTab(t){
    tab = t;
    document.querySelectorAll("[data-dytab]").forEach(b => b.setAttribute("aria-selected", b.dataset.dytab === t ? "true" : "false"));
    $("dyint").hidden = t !== "int"; $("dymine").hidden = t !== "mine"; $("dytopics").hidden = t !== "topics";
    draw();
  }

  $("dydate").value = new Date().toLocaleDateString("en-CA");
  $("dysave").addEventListener("click", () => {
    const c = $("dycompany").value.trim();
    if(!c){ $("dycompany").focus(); return; }
    const key = "d:" + newId();
    putRec(key, { c, dt: $("dydate").value, r: $("dyround").value, res: $("dyres").value, no: $("dynotes").value.trim() });
    addQuestions($("dyqs").value, { s: key });
    $("dycompany").value = ""; $("dyqs").value = ""; $("dynotes").value = "";
    $("dyintform").open = false;
    draw();
  });
  $("dymadd").addEventListener("click", () => {
    const text = $("dymq").value, ans = $("dyma").value.trim();
    const lines = text.split(/\r?\n/).filter(s => s.trim());
    if(!lines.length){ $("dymq").focus(); return; }
    const extra = { s: $("dysrc").value.trim().slice(0, 60) || "Online" };
    if(lines.length === 1 && ans) extra.a = ans;
    addQuestions(text, extra);
    $("dymq").value = ""; $("dyma").value = "";
    draw();
  });
  $("dymsearch").addEventListener("input", drawMine);
  document.querySelectorAll("[data-dytab]").forEach(b => b.addEventListener("click", () => setTab(b.dataset.dytab)));
  $("diaryopen").addEventListener("click", () => { ov.classList.add("on"); document.body.style.overflow = "hidden"; setTab(tab); });
  $("diaryclose").addEventListener("click", () => { ov.classList.remove("on"); document.body.style.overflow = ""; });
  document.addEventListener("keydown", e => { if(e.key === "Escape" && ov.classList.contains("on")) $("diaryclose").click(); });
  onRecs.push(() => { if(!ov.contains(document.activeElement) || document.activeElement.tagName !== "TEXTAREA") draw(); });
  draw();
  return { draw };
})();

/* ================= OFFLINE ================= */
// Service worker caches the app shell so it opens without internet (train,
// flight). Pages stay network-first, so online visits always get the latest.
if("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")){
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
