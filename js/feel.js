/* Native feel: instant press feedback, app-bar hairline on scroll, Esc/Back for the settings sheet.
   Chrome delays :active by ~100ms, so a pointerdown class gives the tint/scale within about one frame.
   The class is skipped if the touch turns into a scroll (pointercancel), and stays visible >= 70ms. */
(() => {
  const SEL = "button,a[href],[role=button],summary,.pcard,.cont,.tile,.trow,.popt,.pr-mode,.dopt,.mini,.set-row,.track,.ch-grp,.c2-q,.ch-txt,.txt-btn,.sec-btn,.plan-sess,.dy-card";
  const SOFT = ".track,.ch-grp,.c2-q,.ch-txt,.txt-btn,.sec-btn,.plan-sess,.dy-card,.pcard,.cont,.tile,.hstep,.trow,.popt,.dopt,.set-row,.pr-mode";
  let el = null, on = 0, off = 0;
  addEventListener("pointerdown", e => {
    const n = e.target.closest && e.target.closest(SEL);
    if(!n || n.disabled || n.getAttribute("aria-disabled") === "true") return;
    clearTimeout(off); if(el && el !== n) el.classList.remove("is-pressed");
    el = n; clearTimeout(on);
    // Controls respond in the same frame; big rows/cards inside scrollers wait 40ms so a scroll start does not flash them.
    if(e.pointerType !== "touch" || !n.matches(SOFT)) n.classList.add("is-pressed");
    else on = setTimeout(() => n.classList.add("is-pressed"), 40);
  }, { passive: true, capture: true });
  const up = () => {
    clearTimeout(on);
    if(!el) return;
    const n = el; el = null;
    off = setTimeout(() => n.classList.remove("is-pressed"), 80);
  };
  ["pointerup", "pointercancel", "dragstart", "contextmenu"].forEach(k => addEventListener(k, up, { passive: true, capture: true }));
  addEventListener("scroll", () => { if(el){ clearTimeout(on); el.classList.remove("is-pressed"); } }, { passive: true, capture: true });

  /* app bar: hairline once the active screen is scrolled */
  const bar = document.getElementById("appbar");
  addEventListener("scroll", e => {
    const t = e.target; if(!bar || !t || t === document || !t.scrollTop && t.scrollTop !== 0) return;
    if(!t.closest || !t.closest("#stage")) return;
    const s = t.scrollTop > 8 ? "true" : "false";
    if(bar.dataset.scrolled !== s) bar.dataset.scrolled = s;
  }, { passive: true, capture: true });

  /* bottom sheets: Settings opens from "Me" */
  const st = document.getElementById("settings"), me = document.getElementById("mebtn");
  if(st && me){
    const shut = () => st.classList.remove("on");
    me.addEventListener("click", () => { st.classList.add("on"); const f = st.querySelector("[aria-checked=true]") || st.querySelector("button"); if(f) f.focus({ preventScroll: true }); });
    st.addEventListener("click", e => { if(e.target === st) shut(); });
    document.getElementById("setclose").addEventListener("click", shut);
    const nr = document.getElementById("notifyrow");
    if(nr) nr.addEventListener("click", () => { shut(); const b = document.getElementById("bellbtn"); if(b) b.click(); });
  }

  /* ---- sheets (Settings, Sync, Bell): Esc closes, Tab stays inside, the page behind is inert, focus goes back to the opener ---- */
  const SHEETS = [["settings", "setclose", "mebtn"], ["syncsheet", "syncclose", "mebtn"], ["notifysheet", "nclose", "bellbtn"]];
  const FOCUSABLE = 'button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),a[href],summary,[tabindex]:not([tabindex="-1"])';
  const visible = n => !!(n.offsetWidth || n.offsetHeight || n.getClientRects().length) && getComputedStyle(n).visibility !== "hidden";
  const was = {}, order = [], inerted = new Set();
  let lastClick = null;
  document.addEventListener("click", e => { lastClick = e.target.closest && e.target.closest("button,a,summary,input,select,textarea"); }, true);
  const el$ = id => document.getElementById(id);
  const focusables = sh => [...sh.querySelectorAll(FOCUSABLE)].filter(n => !n.closest("[hidden]") && visible(n));
  function applyInert(top){
    inerted.forEach(n => { n.inert = false; }); inerted.clear();
    if(!top) return;
    [...document.body.children].forEach(n => {
      if(n === top || /^(SCRIPT|STYLE|SVG)$/i.test(n.tagName) || n.id === "toast" || n.classList.contains("upd") || n.inert) return;
      n.inert = true; inerted.add(n);
    });
  }
  function sync(){
    let opened = null, closed = [];
    SHEETS.forEach(([id]) => {
      const sh = el$(id); if(!sh) return;
      const on = sh.classList.contains("on");
      if(on && !was[id]){ was[id] = true; order.push(id); opened = sh; }
      else if(!on && was[id]){ was[id] = false; order.splice(order.indexOf(id), 1); closed.push(id); }
    });
    if(!opened && !closed.length) return;
    const topId = order[order.length - 1], top = topId && el$(topId);
    const opener = lastClick && lastClick.isConnected && !lastClick.closest(".scrim") ? lastClick : null;
    applyInert(top);
    if(opened){
      opened._opener = opened._opener || opener || el$(SHEETS.find(x => x[0] === opened.id)[2]);
      if(!opened.contains(document.activeElement)){
        const f = opened.querySelector("[aria-checked=true]") || focusables(opened)[0];
        if(f) f.focus({ preventScroll: true });
      }
    } else if(!top){
      // everything closed: return focus to whoever opened the last sheet (or Me / the bell)
      const id = closed[closed.length - 1], def = SHEETS.find(x => x[0] === id), sh = el$(id);
      let back = sh && sh._opener; if(sh) sh._opener = null;
      if(!back || !back.isConnected || !visible(back) || back.closest(".scrim")) back = el$(def[2]);
      if(back) back.focus({ preventScroll: true });
    }
    if(top && closed.length && !top.contains(document.activeElement)){ const f = focusables(top)[0]; if(f) f.focus({ preventScroll: true }); }
  }
  const smo = new MutationObserver(sync);
  SHEETS.forEach(([id]) => { const sh = el$(id); if(sh) smo.observe(sh, { attributes: true, attributeFilter: ["class"] }); });
  window.addEventListener("keydown", e => {
    const topId = order[order.length - 1]; if(!topId) return;
    const top = el$(topId);
    if(e.key === "Escape"){
      e.preventDefault(); e.stopImmediatePropagation();
      const btn = el$(SHEETS.find(x => x[0] === topId)[1]); if(btn) btn.click(); else top.classList.remove("on");
    } else if(e.key === "Tab"){
      const f = focusables(top); if(!f.length){ e.preventDefault(); return; }
      const first = f[0], last = f[f.length - 1], a = document.activeElement;
      if(!top.contains(a)){ e.preventDefault(); first.focus(); }
      else if(e.shiftKey && a === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && a === last){ e.preventDefault(); first.focus(); }
    } else if(e.altKey && /^Digit[1-5]$/.test(e.code)){ e.preventDefault(); e.stopImmediatePropagation(); }   // no tab switching behind a sheet
  }, true);

  /* ---- tablists: arrow keys / Home / End move between tabs (and select them), like a real tab control ---- */
  document.addEventListener("keydown", e => {
    if(!/^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key) || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target.closest && e.target.closest("[role=tab]"); if(!t) return;
    const tabs = [...t.parentElement.querySelectorAll(":scope > [role=tab]")].filter(visible); if(tabs.length < 2) return;
    let i = tabs.indexOf(t);
    i = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    e.preventDefault(); tabs[i].focus(); tabs[i].click(); tabs[i].scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  /* ---- a new service worker took over: tell the person, never reload under them ---- */
  if("serviceWorker" in navigator){
    let had = !!navigator.serviceWorker.controller;      // false on the very first visit: nothing to refresh then
    let shown = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if(!had){ had = true; return; } if(shown) return; shown = true;
      const t = document.createElement("div"); t.className = "upd"; t.setAttribute("role", "status");
      const m = document.createElement("span"); m.textContent = "Naya version ready \u2014 refresh karo";
      const r = document.createElement("button"); r.type = "button"; r.textContent = "Refresh"; r.addEventListener("click", () => location.reload());
      const x = document.createElement("button"); x.type = "button"; x.className = "upd-x"; x.textContent = "Baad mein"; x.addEventListener("click", () => t.remove());
      t.append(m, r, x); document.body.appendChild(t);
    });
    document.addEventListener("visibilitychange", () => { if(!document.hidden) navigator.serviceWorker.getRegistration().then(g => g && g.update()).catch(() => {}); });
  }
})();
