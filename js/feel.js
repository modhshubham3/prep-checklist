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

  /* bottom sheets: Settings opens from "Me"; Esc closes it */
  const st = document.getElementById("settings"), me = document.getElementById("mebtn");
  if(st && me){
    const shut = () => st.classList.remove("on");
    me.addEventListener("click", () => { st.classList.add("on"); const f = st.querySelector("[aria-checked=true]") || st.querySelector("button"); if(f) f.focus({ preventScroll: true }); });
    st.addEventListener("click", e => { if(e.target === st) shut(); });
    document.getElementById("setclose").addEventListener("click", shut);
    document.addEventListener("keydown", e => { if(e.key === "Escape") shut(); });
    const nr = document.getElementById("notifyrow");
    if(nr) nr.addEventListener("click", () => { shut(); const b = document.getElementById("bellbtn"); if(b) b.click(); });
  }
})();
