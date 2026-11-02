/* Revise + Career shell. The old Interview-Prep screens are existing full-screen views (.cheat) from app.js,
   plus "Answers" (the .wrap page). They now live inside the Revise tab (chips: Answers Practice Cheat Checklist Plan)
   and the Career tab (Diary). This file only routes: it clicks the existing open/close buttons, so all the logic
   in app.js (practice confirm, timers, mic cleanup) stays in one place.
   Hash routes: #/answers #/practice #/cheat #/checklist #/plan (Revise) and #/diary #/career (Career). */
(() => {
  const $ = id => document.getElementById(id);
  const VIEW  = { plan: "plan", checklist: "allq", practice: "practice", cheat: "cheat", diary: "diary" };
  const OPEN  = { plan: "planopen", checklist: "allqopen", practice: "practiceopen", cheat: "cheatopen", diary: "diaryopen" };
  const CLOSE = { plan: "planclose", checklist: "allqclose", practice: "practiceclose", cheat: "cheatclose", diary: "diaryclose" };
  const TABS = ["plan", "answers", "checklist", "practice", "cheat", "diary"];
  const REV = ["answers", "practice", "cheat", "checklist", "plan"];
  const bar = $("revbar");
  if(!bar) return;
  const legacyMode = () => /^(interview|career)$/.test(document.body.dataset.mode);

  const isOn = t => !!VIEW[t] && $(VIEW[t]).classList.contains("on");
  function current(){
    if(isOn("practice")) return "practice";            // practice can sit on top of plan
    for(const t of ["plan", "checklist", "cheat", "diary"]) if(isOn(t)) return t;
    return "answers";
  }
  const hashTab = () => { const m = /^#\/([a-z]+)$/.exec(location.hash); return m && TABS.includes(m[1]) ? m[1] : m && m[1] === "career" ? "diary" : ""; };
  function paint(){
    const c = current();
    document.body.dataset.tab = c;
    if(c !== "diary") window.prepLastRev = c;
    // Hidden screens must not be reachable by Tab / screen reader.
    const wrap = document.querySelector(".wrap"); if(wrap) wrap.inert = c !== "answers";
    Object.values(VIEW).forEach(id => { const v = $(id); v.inert = !v.classList.contains("on"); });
    // Keep the URL honest if a screen was closed some other way (Esc, notification).
    const h = location.hash;
    if(legacyMode() && h !== "#/" + c && !(c === "diary" && h === "#/career") && !(c === "answers" && h === "#/interview") && (/^#\/[a-z]+$/.test(h) || !h)){ try{ history.replaceState(null, "", "#/" + c + location.search); }catch(x){} }
    bar.querySelectorAll("[data-tab]").forEach(b => {
      const on = b.dataset.tab === c;
      b.setAttribute("aria-selected", on ? "true" : "false");
      if(on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
  }
  // Close every other screen. practice first: its close() may ask "interview chhod rahe ho?" — if the user says no, stay.
  function closeOthers(keep){
    for(const t of ["practice", "plan", "checklist", "cheat", "diary"]){
      if(t !== keep && isOn(t)){ $(CLOSE[t]).click(); if(isOn(t)) return false; }
    }
    return true;
  }
  // true = switched. Heavy lists are built now if the idle builder has not finished them yet.
  function show(tab){
    if(!closeOthers(tab)){ paint(); return false; }
    if(window.prepEnsure && (tab === "answers" || tab === "checklist" || tab === "cheat")) window.prepEnsure(tab);
    if(tab !== "answers" && !isOn(tab)) $(OPEN[tab]).click();
    paint();
    return true;
  }
  const go = tab => { if(window.P && P.nav) P.nav("#/" + tab); else { try{ history.pushState(null, "", "#/" + tab); }catch(x){} show(tab); } };

  bar.addEventListener("click", e => {
    const b = e.target.closest("[data-tab]"); if(!b) return;
    go(b.dataset.tab);
  });

  // Anything that opens/closes a screen from elsewhere (notification, plan -> practice) keeps the chips in sync.
  const mo = new MutationObserver(paint);
  Object.values(VIEW).forEach(id => mo.observe($(id), { attributes: true, attributeFilter: ["class"] }));

  // Notification tap on a question: Answers screen must be visible before it scrolls.
  const oc = window.prepOpenCard;
  if(oc) window.prepOpenCard = id => { if(window.P && P.nav && !/^(interview|career)$/.test(document.body.dataset.mode)) P.nav("#/answers"); show("answers"); return oc(id); };

  // "Quick quiz" card on the Practice screen reuses the existing quiz launcher.
  const pq = $("prquiz"), qo = $("quizopen");
  if(pq && qo) pq.addEventListener("click", () => qo.click());

  // Career: Mock interview = the practice screen's mock mode.
  const mk = $("careermock");
  if(mk) mk.addEventListener("click", () => {
    if(window.P && P.after) P.after(() => { const b = document.querySelector('.pr-mode[data-mode="mock"]'); if(b) b.click(); });
    go("practice");
  });

  // Empty diary: open the "add interview" form straight away.
  new MutationObserver(() => {
    const d = $("dyintform"), t = $("dytally");
    if($("diary").classList.contains("on") && d && t && /^0 interviews/.test(t.textContent)) d.open = true;
  }).observe($("diary"), { attributes: true, attributeFilter: ["class"] });

  /* ---- laptop keys: Alt+1..5 switch tabs (Aaj Seekho Lab Revise Career), "/" jumps to search ---- */
  document.addEventListener("keydown", e => {
    if(e.altKey && !e.ctrlKey && !e.metaKey && /^Digit[1-5]$/.test(e.code)){
      e.preventDefault(); e.stopPropagation();          // capture: practice's own 1/2/3 marking must not see it
      const b = document.querySelectorAll("#pnav button[data-go]")[+e.code.slice(5) - 1]; if(b) b.click();
      return;
    }
    if(document.body.dataset.mode !== "interview") return;
    if(e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "")){
      const id = { answers: "cheat2search", cheat: "cheatsearch" }[current()];
      if(id){ e.preventDefault(); $(id).focus(); }
    }
  }, true);

  // Overdue job follow-ups: a dot on the Career tab.
  const dot = $("careerdot"), dBtn = document.querySelector('#pnav [data-go="career"]');
  const jobsPaint = () => { const n = window.prepJobsDue || 0; if(!dot) return; dot.hidden = !n; dot.textContent = n > 9 ? "9+" : String(n); if(dBtn) dBtn.title = n ? n + " follow-up due" : dBtn.dataset.key; };
  document.addEventListener("prep:jobs", jobsPaint); jobsPaint();

  // Used by platform.js: leave the interview screens cleanly (true = all closed), switch screens, read the hash.
  window.prepShell = {
    show, current, closeAll: () => closeOthers(""), paint,
    tabFromHash: () => { const t = hashTab(); return t && t !== "diary" ? t : (window.prepLastRev || "answers"); },
    REV,
  };

  paint();
})();
