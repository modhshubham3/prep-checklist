/* Concept-metaphor scenes: one small SVG animation per lesson, 5-8 narrated steps, driven by a controller.

     const ctl = Scenes.play("loops", containerEl, { onStep(i, step){ ... } });
     ctl.play(); ctl.pause(); ctl.step(1); ctl.seek(3); ctl.reset(); ctl.destroy();
     ctl.steps  // [{ caption, mood, code }]   ctl.index   ctl.onEnd = () => {}

   How a scene is written: every moving thing is an element with data-k="name", drawn around its own pivot at (0,0) and placed
   with c.to(name, {x,y,r,s,o}). A step only states what changes; seeking replays steps 0..n from the initial state, so any
   step can be reached from anywhere. Motion is CSS transitions (transform/opacity) + a few WAAPI paths — nothing else.
   Needs css/mascot.css; uses js/mascot.js for the character if it is loaded. */
(function (root) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var REG = {}, ORDER = [];
  function reduced() { try { return !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } }
  function define(id, def) { def.id = id; REG[id] = def; ORDER.push(id); }

  /* ----------------------------------------------------------------- tiny svg string helpers (shared by the scenes) */
  var RIB = '<rect class="sc-rib" x="10" y="8" width="340" height="30" rx="10"/><text data-k="code" class="sc-codet" x="22" y="28"></text>';
  function chip(k, f, txt, w) {
    w = w || Math.max(44, Math.round(String(txt).length * 9.4 + 18));
    return '<g data-k="' + k + '" class="sc-t"><rect class="o ' + f + '" x="' + (-w / 2) + '" y="-15" width="' + w + '" height="30" rx="9"/><text class="tc" y="5.5" text-anchor="middle">' + txt + '</text></g>';
  }
  function tag(k, f, txt, w, h) {
    h = h || 24;
    return '<g data-k="' + k + '" class="sc-t"><rect class="o ' + f + '" x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="' + h / 2 + '"/><text class="tc sm" y="4.5" text-anchor="middle">' + txt + '</text></g>';
  }
  function pill(f, txt, x, y, w) { return '<g transform="translate(' + x + ' ' + y + ')"><rect class="o ' + f + '" x="' + (-w / 2) + '" y="-10" width="' + w + '" height="20" rx="10"/><text class="tc sm" y="4.2" text-anchor="middle">' + txt + '</text></g>'; }

  /*__SCENES__*/

  /* ----------------------------------------------------------------- the player */
  function tf(s) { return "translate(" + s.x + "px," + s.y + "px) rotate(" + s.r + "deg) scale(" + s.sx + "," + s.sy + ")"; }

  function play(id, container, opts) {
    var def = REG[id];
    if (!def || !container) { if (root.console) console.warn("Scenes: unknown scene " + id); return null; }
    opts = opts || {};
    if (container._sceneCtl) container._sceneCtl.destroy();
    container.textContent = "";

    var host = document.createElement("div");
    host.className = "sc"; host.setAttribute("role", "group"); host.setAttribute("aria-label", def.label);
    host.innerHTML =
      '<div class="sc-stage"><svg class="sc-svg" viewBox="0 0 360 240" role="img" aria-label="' + def.label.replace(/"/g, "&quot;") + '" focusable="false">' + def.build() + '</svg></div>' +
      '<div class="sc-say"><div class="sc-mc"></div><div class="sc-cap"></div></div>' +
      '<div class="sc-sr" role="status" aria-live="polite"></div>';
    container.appendChild(host);
    var svg = host.querySelector(".sc-svg"), capHost = host.querySelector(".sc-cap"), srEl = host.querySelector(".sc-sr");
    var mascot = null;
    if (root.Mascot) { mascot = root.Mascot.create({ size: opts.mascotSize || 68, mood: "idle" }); host.querySelector(".sc-mc").appendChild(mascot); }
    var plainCap = null;
    if (!mascot) { plainCap = document.createElement("p"); plainCap.className = "sc-plain"; capHost.appendChild(plainCap); }

    var cache = {}, snaps = [], timers = [], anims = [], alive = true, anim = false;
    function el(k) { var e = cache[k]; if (!e) { e = cache[k] = svg.querySelector('[data-k="' + k + '"]'); if (!e) throw new Error("scene " + id + ": no element " + k); if (!e._st) e._st = { x: 0, y: 0, r: 0, sx: 1, sy: 1, o: 1 }; } return e; }
    function pathEl(k) { return svg.querySelector('[data-p="' + k + '"]'); }
    function put(e, s, o) {
      var st = e.style;
      if (o && o.now) { st.transition = "none"; }
      else { st.transition = ""; st.transitionDuration = ((o && o.d) != null ? o.d : .55) + "s"; st.transitionDelay = (anim && o && o.delay ? o.delay : 0) + "s"; st.transitionTimingFunction = (o && o.ease) || ""; }
      st.transform = tf(s); st.opacity = s.o;
      if (o && o.now && anim) void e.getBoundingClientRect();
    }

    /* ---- the helpers a scene step can call ---- */
    var c = {
      get anim() { return anim; },
      $: el,
      to: function (k, p, o) {
        var e = el(k), s = e._st;
        if (p.s != null) { p.sx = p.s; p.sy = p.s; }
        ["x", "y", "r", "sx", "sy", "o"].forEach(function (n) { if (p[n] != null) s[n] = p[n]; });
        put(e, s, o);
      },
      cls: function (k, add, rem) { var e = el(k); if (rem) rem.split(" ").forEach(function (n) { e.classList.remove(n); }); if (add) add.split(" ").forEach(function (n) { e.classList.add(n); }); },
      text: function (k, t) { el(k).textContent = t; },
      attr: function (k, n, v) { el(k).setAttribute(n, v); },
      code: function (t) { el("code").textContent = t; if (anim) c.bump("code", { from: .96, peak: 1.02, d: 300 }); },
      later: function (fn, ms) { if (!anim) { fn(); return; } var t = setTimeout(function () { if (alive) fn(); }, ms); timers.push(t); },
      /* travel along <path data-p="name"> from fraction a to b (WAAPI, sampled) */
      follow: function (k, pk, o) {
        o = o || {};
        var e = el(k), p = pathEl(pk), L = p.getTotalLength(), a = (o.from != null ? o.from : 0) * L, b = (o.to != null ? o.to : 1) * L, s = e._st, end = p.getPointAtLength(b);
        var s0 = { x: s.x, y: s.y, r: s.r, sx: s.sx, sy: s.sy, o: s.o };
        if (!anim) { s.x = end.x; s.y = end.y; put(e, s, { d: .4 }); return; }
        var N = 26, kf = [], i, pt;
        for (i = 0; i <= N; i++) { pt = p.getPointAtLength(a + (b - a) * i / N); kf.push({ transform: tf({ x: pt.x, y: pt.y, r: s.r, sx: s.sx, sy: s.sy }) }); }
        s.x = end.x; s.y = end.y; e.style.transition = "none"; e.style.transform = tf(s);
        var an = e.animate(kf, { duration: (o.d || 1) * 1000, delay: (o.delay || 0) * 1000, easing: o.ease || "ease-in-out", fill: "backwards" });
        anims.push(an);
      },
      bump: function (k, o) {
        o = o || {}; if (!anim || !el(k).animate) return;
        var e = el(k), s = e._st, A = Object.assign({}, s), B = Object.assign({}, s), C = Object.assign({}, s), f = o.from != null ? o.from : .7, pk = o.peak != null ? o.peak : 1.15;
        A.sx *= f; A.sy *= f; B.sx *= pk; B.sy *= pk;
        anims.push(e.animate([{ transform: tf(A) }, { transform: tf(B), offset: .6 }, { transform: tf(C) }], { duration: o.d || 420, delay: (o.delay || 0) * 1000, easing: "ease-out" }));
      },
      shake: function (k, o) {
        o = o || {}; if (!anim || !el(k).animate) return;
        var e = el(k), s = e._st, amp = o.amp || 6, mk = function (dx) { var t = Object.assign({}, s); t.x += dx; return { transform: tf(t) }; };
        anims.push(e.animate([mk(0), mk(-amp), mk(amp), mk(-amp * .7), mk(amp * .5), mk(0)], { duration: o.d || 420, delay: (o.delay || 0) * 1000 }));
      }
    };

    /* build the initial state, then remember it so seek() can rewind */
    host.classList.add("sc-now");
    if (def.init) def.init(c);
    Array.prototype.forEach.call(svg.querySelectorAll("[data-k]"), function (e) {
      el(e.getAttribute("data-k"));
    });
    Object.keys(cache).forEach(function (k) { var e = cache[k]; snaps.push({ e: e, style: e.getAttribute("style"), cls: e.getAttribute("class"), text: e.tagName === "text" ? e.textContent : null, st: Object.assign({}, e._st) }); });
    void host.offsetWidth; host.classList.remove("sc-now");

    function restore() {
      anims.forEach(function (a) { try { a.cancel(); } catch (x) {} }); anims.length = 0;
      timers.forEach(clearTimeout); timers.length = 0;
      snaps.forEach(function (s) {
        if (s.style == null) s.e.removeAttribute("style"); else s.e.setAttribute("style", s.style);
        if (s.cls != null) s.e.setAttribute("class", s.cls);
        if (s.text != null) s.e.textContent = s.text;
        s.e._st = Object.assign({}, s.st);
      });
    }

    var steps = def.steps.map(function (s) { return { caption: s.cap, mood: s.mood || "idle", code: s.code || "" }; });
    var ctl = { id: id, title: def.title, steps: steps, index: -1, playing: false, speed: 1, onEnd: opts.onEnd || null, onStep: opts.onStep || null, element: host, mascot: mascot };
    var playTimer = null;

    function show(i, forward) {
      var isReduced = reduced();
      if (forward && !isReduced) { anims.forEach(function (a) { try { a.finish(); } catch (x) {} }); anims.length = 0; timers.forEach(clearTimeout); timers.length = 0; }
      else restore();
      if (forward) { anim = !isReduced; def.steps[i].run(c); }
      else { anim = false; for (var k = 0; k <= i; k++) def.steps[k].run(c); }
      anim = false;
      ctl.index = i;
      var s = steps[i];
      if (mascot) { mascot.setMood(s.mood); root.Mascot.say(mascot, s.caption, { into: capHost, ms: opts.typeMs != null ? opts.typeMs : 16, side: "left" }); }
      else plainCap.textContent = s.caption;
      srEl.textContent = "Step " + (i + 1) + " of " + steps.length + ": " + s.caption;
      if (typeof ctl.onStep === "function") ctl.onStep(i, { index: i, total: steps.length, caption: s.caption, mood: s.mood, code: s.code });
    }

    function dwell(i) { return Math.min(8000, 2200 + steps[i].caption.length * 50) / ctl.speed; }
    function clearPlay() { clearTimeout(playTimer); playTimer = null; }
    function schedule() {
      clearPlay();
      playTimer = setTimeout(function () {
        if (!alive || !ctl.playing) return;
        if (ctl.index >= steps.length - 1) { ctl.playing = false; if (typeof ctl.onEnd === "function") ctl.onEnd(); return; }
        show(ctl.index + 1, true); schedule();
      }, dwell(ctl.index));
    }

    ctl.play = function () {
      if (!alive) return ctl;
      if (ctl.index >= steps.length - 1) show(0, false);
      ctl.playing = true; schedule(); return ctl;
    };
    ctl.pause = function () { ctl.playing = false; clearPlay(); return ctl; };
    ctl.toggle = function () { return ctl.playing ? ctl.pause() : ctl.play(); };
    ctl.seek = function (i) {
      if (!alive) return ctl;
      i = Math.max(0, Math.min(steps.length - 1, Math.round(+i || 0)));
      if (i === ctl.index) return ctl;
      show(i, i === ctl.index + 1);
      if (ctl.playing) schedule();
      return ctl;
    };
    ctl.step = function (d) { return ctl.seek(ctl.index + (d == null ? 1 : d)); };
    ctl.reset = function () { var w = ctl.playing; ctl.pause(); ctl.index = -1; show(0, false); if (w) ctl.play(); return ctl; };
    ctl.setSpeed = function (x) { ctl.speed = Math.max(.25, Math.min(4, +x || 1)); if (ctl.playing) schedule(); return ctl; };
    ctl.destroy = function () {
      if (!alive) return; alive = false; ctl.playing = false; clearPlay();
      timers.forEach(clearTimeout); timers.length = 0;
      anims.forEach(function (a) { try { a.cancel(); } catch (x) {} }); anims.length = 0;
      if (mascot) mascot.destroy();
      if (host.parentNode) host.parentNode.removeChild(host);
      if (container._sceneCtl === ctl) container._sceneCtl = null;
      ctl.onStep = ctl.onEnd = null;
    };
    ctl._debug = function () { return { timers: timers.length, anims: anims.length, playTimer: !!playTimer }; };

    container._sceneCtl = ctl;
    show(0, true);
    if (opts.autoplay) ctl.play();
    return ctl;
  }

  function list() { return ORDER.map(function (id) { var d = REG[id]; return { id: id, title: d.title, label: d.label, steps: d.steps.length }; }); }
  root.Scenes = { play: play, list: list, has: function (id) { return !!REG[id]; }, ids: ORDER, reducedMotion: reduced };
})(window);
