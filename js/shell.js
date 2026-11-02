/* App shell: bottom tab bar. One screen at a time.
   Each tab is an existing full-screen view (.cheat) from app.js; "Answers" is the base page.
   This file only routes: it clicks the existing open/close buttons, so all the logic
   in app.js (practice confirm, timers, mic cleanup, scroll reset) stays in one place.
   Routes: #/plan #/answers #/checklist #/practice #/cheat #/diary  (Back button switches tabs). */
(() => {
  const $ = id => document.getElementById(id);
  const VIEW  = { plan: "plan", checklist: "allq", practice: "practice", cheat: "cheat", diary: "diary" };
  const OPEN  = { plan: "planopen", checklist: "allqopen", practice: "practiceopen", cheat: "cheatopen", diary: "diaryopen" };
  const CLOSE = { plan: "planclose", checklist: "allqclose", practice: "practiceclose", cheat: "cheatclose", diary: "diaryclose" };
  const TABS = ["plan", "answers", "checklist", "practice", "cheat", "diary"];
  const bar = $("tabbar");
  if(!bar) return;

  const isOn = t => !!VIEW[t] && $(VIEW[t]).classList.contains("on");
  function current(){
    if(isOn("practice")) return "practice";            // practice can sit on top of plan
    for(const t of ["plan", "checklist", "cheat", "diary"]) if(isOn(t)) return t;
    return "answers";
  }
  function paint(){
    const c = current();
    document.body.dataset.tab = c;
    // Hidden screens must not be reachable by Tab / screen reader.
    const wrap = document.querySelector(".wrap"); if(wrap) wrap.inert = c !== "answers";
    Object.values(VIEW).forEach(id => { const v = $(id); v.inert = !v.classList.contains("on"); });
    // Keep the URL honest if a screen was closed some other way (Esc, notification).
    if(location.hash !== "#/" + c && /^#\/[a-z]+$/.test(location.hash)){ try{ history.replaceState(null, "", "#/" + c); }catch(x){} }
    bar.querySelectorAll("button").forEach(b => {
      if(b.dataset.tab === c) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
  }
  // Close every other screen. practice first: its close() may ask "interview chhod rahe ho?" — if the user says no, stay.
  function closeOthers(keep){
    for(const t of ["practice", "plan", "checklist", "cheat", "diary"]){
      if(t !== keep && isOn(t)){ $(CLOSE[t]).click(); if(isOn(t)) return false; }
    }
    return true;
  }
  function show(tab){
    if(!closeOthers(tab)){ paint(); return; }
    if(tab === "answers") window.scrollTo(0, 0);
    else if(!isOn(tab)) $(OPEN[tab]).click();
    paint();
  }

  bar.addEventListener("click", e => {
    const b = e.target.closest("button[data-tab]"); if(!b) return;
    const tab = b.dataset.tab;
    show(tab);
    if(current() === tab && location.hash !== "#/" + tab){ try{ history.pushState(null, "", "#/" + tab); }catch(x){} }
  });

  function fromHash(){
    const m = /^#\/([a-z]+)$/.exec(location.hash);
    if(m && TABS.includes(m[1])) show(m[1]);
    else if(!location.hash) show("answers");
  }
  window.addEventListener("popstate", fromHash);

  // Anything that opens/closes a screen from elsewhere (notification, plan -> practice) keeps the bar in sync.
  const mo = new MutationObserver(paint);
  Object.values(VIEW).forEach(id => mo.observe($(id), { attributes: true, attributeFilter: ["class"] }));

  // Notification tap on a question: Answers screen must be visible before it scrolls.
  const oc = window.prepOpenCard;
  if(oc) window.prepOpenCard = id => { show("answers"); return oc(id); };

  // "Quick quiz" card on the Practice screen reuses the existing quiz launcher.
  const pq = $("prquiz"), qo = $("quizopen");
  if(pq && qo) pq.addEventListener("click", () => qo.click());

  /* ---- home card: next plan step + overall progress ---- */
  const hp = $("homeplan");
  function homeText(){
    const sub = $("plansub"), tl = $("ch2tally"), pl = $("plantally");
    if($("homeplant")) $("homeplant").textContent = sub && sub.textContent.indexOf("agla:") > -1 ? "Agla: " + sub.textContent.split("agla:")[1].trim() : "Study plan shuru karo";
    if($("homeplans")) $("homeplans").textContent = pl && pl.textContent ? pl.textContent : "20 session × 30 min";
    if($("homeline")) $("homeline").textContent = tl && tl.textContent ? "Answers: " + tl.textContent + " pakka" : "";
  }
  if(hp) hp.addEventListener("click", () => { show("plan"); if(location.hash !== "#/plan") try{ history.pushState(null, "", "#/plan"); }catch(x){} });
  const mo2 = new MutationObserver(homeText);
  ["plan", "practice"].forEach(id => mo2.observe($(id), { attributes: true, attributeFilter: ["class"] }));
  homeText();

  // Empty diary: open the "add interview" form straight away.
  mo.observe($("diary"), { attributes: true, attributeFilter: ["class"] });
  new MutationObserver(() => {
    const d = $("dyintform"), t = $("dytally");
    if($("diary").classList.contains("on") && d && t && /^0 interviews/.test(t.textContent)) d.open = true;
  }).observe($("diary"), { attributes: true, attributeFilter: ["class"] });

  paint();
  if(/^#\/[a-z]+$/.test(location.hash)) fromHash();
})();
