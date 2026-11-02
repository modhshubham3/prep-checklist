/* Study notifications: bell + sheet (turn on / test / off) and deep links from a tap.
   /?q=<id> opens that question's card; /?quiz=<id>,<id> opens the 2-question quiz. */
(() => {
  const $ = id => document.getElementById(id);
  const toast = m => { const t = $("toast"); if(!t) return; t.textContent = m; t.classList.add("on"); setTimeout(() => t.classList.remove("on"), 3200); };

  /* ---- deep links ---- */
  // Always cleans the URL when done (also for unknown ids), so a bad link can never fire again on reload or Back.
  function go(raw, fromHash){
    let u; try{ u = new URL(raw, location.href); }catch(e){ return; }
    let sp = u.searchParams;
    if(!/(^|&)(q|quiz|drill)=/.test(u.search.slice(1)) && fromHash) sp = new URLSearchParams(fromHash);     // legacy "#/answers?drill=..." links
    const q = sp.get("q"), quiz = sp.get("quiz"), drill = sp.get("drill");
    try{
      if(drill){ const t = drill.split(",").filter(x => /^[a-z]{2,10}$/.test(x)).slice(0, 6); const c = (sp.get("c") || "").slice(0, 40); if(window.prepDrill && window.prepDrill(t, c ? "Interview: " + c : "Interview prep")) return; }
      if(quiz){ const ids = quiz.split(",").filter(x => /^[a-z0-9]+$/.test(x)).slice(0, 5); if(ids.length && window.prepQuiz && window.prepQuiz(ids)) return; }
      if(q && /^[a-z0-9]+$/.test(q) && window.prepOpenCard && window.prepOpenCard(q)) return;
    }finally{ clean(); }
  }
  function clean(){
    try{
      let h = location.hash; const i = h.indexOf("?"); if(i > -1) h = h.slice(0, i);
      history.replaceState(null, "", location.pathname + h);
    }catch(e){}
  }
  go(location.href, window.prepBootHashQuery);
  if("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", e => { if(e.data && e.data.open) go(e.data.open); });

  /* ---- bell + sheet ---- */
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const bell = $("bellbtn");   // static in index.html: no late insert, no layout shift
  const rowTxt = $("notifyrowtxt"), rowDot = document.querySelector("#notifyrow .bell-i");
  const mark = on => { bell.classList.toggle("on", !!on); if(rowDot) rowDot.classList.toggle("on", !!on); if(rowTxt) rowTxt.textContent = on ? "ON \u2014 har ghante ek sawaal" : supported ? "Band hai" : "Is browser mein nahi chalti"; };
  mark(false);

  const sheet = document.createElement("div");
  sheet.className = "scrim"; sheet.id = "notifysheet"; sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true"); sheet.setAttribute("aria-labelledby", "ntitle");
  sheet.innerHTML = '<div class="sheet-ask"><p class="ask-q" id="ntitle">Padhai ki notification</p>' +
    '<p class="ask-topic">Har ghante ek sawaal (tap karo to wahi khulega) aur har 4 ghante mein 2 sawaal ka quiz. Raat 11 se subah 7 tak chup.</p>' +
    '<p class="sync-help" id="nstatus"></p><div class="ask-btns" id="nbtns"></div>' +
    '<button class="ask-cancel" id="nclose" type="button">Band karo</button></div>';
  document.body.appendChild(sheet);
  const open = () => { paint(); sheet.classList.add("on"); };
  const shut = () => sheet.classList.remove("on");
  bell.addEventListener("click", open);
  sheet.addEventListener("click", e => { if(e.target === sheet) shut(); });
  $("nclose").addEventListener("click", shut);

  const api = (body) => fetch("/api/push", body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined).then(r => r.json().then(j => Object.assign(j, { _ok: r.ok })));
  const b64 = s => { const p = "=".repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map(c => c.charCodeAt(0))); };
  const getSub = async () => { const reg = await navigator.serviceWorker.ready; return reg.pushManager.getSubscription(); };

  async function paint(){
    const st = $("nstatus"), bt = $("nbtns"); bt.innerHTML = "";
    const btn = (label, fn, cls) => { const b = document.createElement("button"); b.type = "button"; b.textContent = label; if(cls) b.className = cls; b.addEventListener("click", async () => { b.disabled = true; try{ await fn(); }catch(e){ toast(e.message || "Kuch gadbad hui"); } paint(); }); bt.appendChild(b); };
    if(!supported){ st.textContent = "Is browser mein notification nahi chalti. iPhone pe pehle Share → Add to Home Screen karo, phir wahan se kholo."; return; }
    let cfg; try{ cfg = await api(); }catch(e){ st.textContent = "Server se baat nahi ho paayi."; return; }
    if(!cfg.configured){ st.textContent = "Server pe notification abhi set nahi hai (VAPID keys / storage)."; return; }
    let sub = await getSub();
    // A subscription made with other VAPID keys can never receive anything: drop it and start over.
    if(sub && sub.options && sub.options.applicationServerKey){
      const have = btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      if(have !== cfg.publicKey){ try{ await api({ unsubscribe: true, endpoint: sub.endpoint }); await sub.unsubscribe(); }catch(e){} sub = null; mark(false); }
    }
    if(sub){
      mark(true); st.textContent = "Is device pe notification ON hai.";
      btn("Test notification bhejo", async () => { const r = await api({ test: true, subscription: sub.toJSON() }); toast(r.ok ? "Test bhej diya" : "Nahi gaya — dobara ON karo"); });
      btn("Band karo", async () => { await api({ unsubscribe: true, endpoint: sub.endpoint }); await sub.unsubscribe(); toast("Notification band"); });
    } else if(Notification.permission === "denied"){
      st.textContent = "Browser ne notification block kar rakhi hai — site settings mein allow karo.";
    } else {
      mark(false); st.textContent = "Abhi band hai.";
      btn("Notification ON karo", async () => {
        const perm = await Notification.requestPermission();
        if(perm !== "granted") throw new Error("Permission nahi mili");
        const reg = await navigator.serviceWorker.ready;
        const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(cfg.publicKey) });
        const r = await api({ subscription: s.toJSON(), sync: syncCode() });
        if(!r._ok) throw new Error(r.error || "Save nahi hua");
        toast("ON ho gaya — test bhej ke dekho");
      });
    }
  }
  const syncCode = () => { try{ return localStorage.getItem("prep-sync-key") || undefined; }catch(e){ return undefined; } };
  supported && navigator.serviceWorker.ready.then(() => getSub()).then(s => {
    mark(s);
    // Tell the server which sync record is yours, so notifications favour your weak topics.
    if(s && syncCode()) api({ subscription: s.toJSON(), sync: syncCode() }).catch(() => {});
  }).catch(() => {});

  /* ---- quiz launch card ---- */
  const qb = $("quizopen");
  if(qb) qb.addEventListener("click", () => {
    const BUILT = (typeof CHEAT2 !== "undefined" ? CHEAT2 : []).filter(g => !/coding round/i.test(g.g));
    const ids = [];
    const pool = BUILT.slice().sort(() => Math.random() - .5).slice(0, 2);
    pool.forEach(g => { const it = g.items[Math.floor(Math.random() * g.items.length)]; ids.push(window.prepKey ? window.prepKey(it.q) : null); });
    const ok = ids.every(Boolean) && window.prepQuiz(ids.map(k => k.slice(2)));
    if(!ok) toast("Quiz nahi khul paaya");
  });
})();
