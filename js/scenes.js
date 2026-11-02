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

  /* ================================================================= 1. variables and types — jars with stickers */
  define("variables-and-types", {
    title: "Variables: naam wale dabbe",
    label: "Animation: variables are jars with a name sticker. let can be refilled, const is sealed, quotes make a string.",
    build: function () {
      var J = [66, 180, 294], s = RIB;
      s += '<rect class="o fw" x="18" y="186" width="324" height="12" rx="5"/>';
      var chips = [chip("c0", "fb", "25"), chip("c0b", "fb", "26"), chip("c1", "fp", '"Pune"'), chip("c2", "fp", '"5"')];
      J.forEach(function (cx, i) {
        s += '<g data-k="jw' + i + '" class="sc-t">' +
          '<rect class="o fg" x="' + (cx - 42) + '" y="84" width="84" height="98" rx="14"/>' +
          '<rect class="o fw" x="' + (cx - 37) + '" y="74" width="74" height="14" rx="6"/>' +
          '<path class="gloss" d="M' + (cx - 32) + ' 98 v44"/>' +
          (i === 0 ? chips[0] + chips[1] : i === 1 ? chips[2] : chips[3]) +
          '<g data-k="lb' + i + '" class="sc-t"><rect class="o fpaper" x="-31" y="-13" width="62" height="26" rx="6"/><text data-k="lbt' + i + '" class="tc" y="5.5" text-anchor="middle"></text></g>' +
          (i === 1 ? '<g data-k="lock" class="sc-t"><path class="o-line" d="M-6 -2 v-6 a6 6 0 0 1 12 0 v6"/><rect class="o fy lockb" x="-10" y="-2" width="20" height="15" rx="3"/><circle cx="0" cy="5" r="2" class="tc-fill"/></g>' : '') +
          '</g>';
      });
      s += chip("cd", "fp", '"Delhi"');
      [["tg0", "fb", "number"], ["tg1", "fp", "string"], ["tg2", "fp", "string"]].forEach(function (t) { s += tag(t[0], t[1], t[2], 74); });
      return s;
    },
    init: function (c) {
      var J = [66, 180, 294], names = ["age", "city", "a"];
      J.forEach(function (cx, i) {
        c.to("lb" + i, { x: cx, y: 161, s: .3, o: 0 }, { now: true }); c.text("lbt" + i, names[i]);
        c.to("tg" + i, { x: cx, y: 224, o: 0 }, { now: true });
      });
      c.to("c0", { x: 66, y: 46, o: 0, s: .8 }, { now: true }); c.to("c0b", { x: 66, y: 46, o: 0, s: .8 }, { now: true });
      c.to("c1", { x: 180, y: 46, o: 0, s: .8 }, { now: true }); c.to("c2", { x: 294, y: 46, o: 0, s: .8 }, { now: true });
      c.to("lock", { x: 180, y: 74, o: 0, s: .3 }, { now: true });
      c.to("cd", { x: 232, y: 40, o: 0, r: 0 }, { now: true });
    },
    steps: [
      { cap: "Variable ek dabba hai: upar naam ka sticker, andar value.", mood: "idle", code: "// dabba + naam + value" },
      { cap: "let age = 25: naya dabba 'age', usme 25 rakha.", mood: "cheer", code: "let age = 25;", run: function (c) {
        c.to("lb0", { s: 1, o: 1, r: 0 }, { d: .45, ease: "cubic-bezier(.3,1.7,.5,1)" });
        c.to("c0", { y: 121, o: 1, s: 1 }, { d: .75, delay: .35, ease: "cubic-bezier(.3,1.4,.55,1)" });
      } },
      { cap: "age = 26: let ka dabba badal sakte ho. Purani value nikli, nayi aayi.", mood: "think", code: "age = 26;", run: function (c) {
        c.to("c0", { y: 40, o: 0, s: .6, r: -12 }, { d: .45, ease: "ease-in" });
        c.to("c0b", { y: 121, o: 1, s: 1 }, { d: .75, delay: .5, ease: "cubic-bezier(.3,1.4,.55,1)" });
        c.bump("jw0", { from: 1, peak: 1.04, d: 500, delay: .9 });
      } },
      { cap: "const city = \"Pune\": const = seal-band dabba. Ek baar bhara, taala lag gaya.", mood: "cheer", code: 'const city = "Pune";', run: function (c) {
        c.to("lb1", { s: 1, o: 1 }, { d: .45, ease: "cubic-bezier(.3,1.7,.5,1)" });
        c.to("c1", { y: 121, o: 1, s: 1 }, { d: .75, delay: .35, ease: "cubic-bezier(.3,1.4,.55,1)" });
        c.to("lock", { y: 78, s: 1, o: 1 }, { d: .5, delay: 1.0, ease: "cubic-bezier(.3,1.8,.5,1)" });
      } },
      { cap: "city = \"Delhi\"? Taala tod ke badalna mana hai. Error! const dobara assign nahi hota.", mood: "oops", code: 'city = "Delhi";  // TypeError', run: function (c) {
        c.to("cd", { x: 180, y: 52, o: 1, r: 0 }, { d: .4, ease: "ease-in" });
        c.to("cd", { x: 236, y: 22, o: 0, r: 40 }, { d: .5, delay: .55, ease: "ease-out" });
        c.cls("lock", "bad"); c.shake("jw1", { delay: .45, amp: 5 });
      } },
      { cap: "const a = \"5\": dhyan do, \"5\" quotes mein hai, to ye number nahi, text hai.", mood: "think", code: 'const a = "5";', run: function (c) {
        c.cls("lock", "", "bad");
        c.to("lb2", { s: 1, o: 1 }, { d: .45, ease: "cubic-bezier(.3,1.7,.5,1)" });
        c.to("c2", { y: 121, o: 1, s: 1 }, { d: .75, delay: .35, ease: "cubic-bezier(.3,1.4,.55,1)" });
      } },
      { cap: "typeof batata hai kism. Quotes ke andar sab string. Dabba same, kism alag!", mood: "celebrate", code: "typeof age, city, a", run: function (c) {
        [0, 1, 2].forEach(function (i) { c.to("tg" + i, { y: 216, o: 1 }, { d: .5, delay: i * .25, ease: "cubic-bezier(.3,1.6,.5,1)" }); });
      } }
    ]
  });

  /* ================================================================= 2. conditions — fork in the road */
  define("conditions", {
    title: "Conditions: chauraha",
    label: "Animation: a ball reaches a fork. A signpost checks the condition and only one road opens: if or else.",
    build: function () {
      var s = RIB;
      s += '<path class="rd" d="M-4 146 H122"/><path class="rd" d="M118 146 C160 146 170 100 214 100 H272"/><path class="rd" d="M118 146 C160 146 170 198 214 198 H272"/>';
      s += '<path class="rdl" d="M0 146 H120 M120 146 C160 146 170 100 214 100 H272 M120 146 C160 146 170 198 214 198 H272"/>';
      s += '<path data-p="pa" class="sc-hid" d="M24 146 H104"/><path data-p="pu" class="sc-hid" d="M104 146 H118 C160 146 170 100 214 100 H282"/><path data-p="pd" class="sc-hid" d="M104 146 H118 C160 146 170 198 214 198 H282"/>';
      /* signpost */
      s += '<rect class="o fwd" x="68" y="82" width="9" height="52" rx="2"/><rect class="o fw" x="8" y="48" width="132" height="38" rx="9"/><text data-k="cond" class="tc md" x="74" y="73" text-anchor="middle">marks >= 40 ?</text>';
      s += '<g data-k="bdg" class="sc-t"><rect data-k="bdgr" class="o fgreen" x="-31" y="-12" width="62" height="24" rx="12"/><text data-k="bdgt" class="tc" y="5" text-anchor="middle">TRUE</text></g>';
      s += pill("fv", "if", 224, 72, 40) + pill("fs", "else", 224, 226, 52);
      [100, 198].forEach(function (y, i) {
        s += '<g transform="translate(304 ' + y + ')"><path class="o ' + (i ? "fred" : "fgreen") + '" d="M-34 -16 L0 -44 L34 -16 Z"/><rect class="o fpaper" x="-27" y="-16" width="54" height="42" rx="3"/><rect class="o fgrey" x="-9" y="2" width="18" height="24" rx="3"/><rect data-k="dr' + i + '" class="o fy" x="-9" y="2" width="18" height="24" rx="3"/><rect class="o fb" x="-23" y="-8" width="11" height="10" rx="2"/><rect class="o fb" x="12" y="-8" width="11" height="10" rx="2"/></g>';
        s += '<g data-k="gate' + i + '" class="sc-t"><rect class="o fred" x="-3.5" y="-27" width="7" height="27" rx="2"/><rect class="fpaper" x="-3.5" y="-19" width="7" height="6"/><circle class="o fgrey" r="5.5"/></g>';
        s += tag("res" + i, i ? "fred" : "fgreen", i ? "FAIL" : "PASS", 58);
      });
      s += '<g data-k="ball" class="sc-t"><circle class="o fb" r="15"/><path class="gloss" d="M-8 -6 a9 9 0 0 1 6 -6"/><text data-k="bt" class="tc" y="5" text-anchor="middle">72</text></g>';
      return s;
    },
    init: function (c) {
      c.to("ball", { x: 24, y: 146, o: 0, s: .3 }, { now: true });
      c.to("bdg", { x: 172, y: 67, o: 0, s: .5 }, { now: true });
      c.to("gate0", { x: 246, y: 112 }, { now: true }); c.to("gate1", { x: 246, y: 210 }, { now: true });
      c.to("res0", { x: 304, y: 52, o: 0, s: .5 }, { now: true }); c.to("res1", { x: 304, y: 150, o: 0, s: .5 }, { now: true });
      c.to("dr0", { o: 0 }, { now: true }); c.to("dr1", { o: 0 }, { now: true });
    },
    steps: [
      { cap: "Condition = chauraha. Ball ko sirf ek raasta chunna hai.", mood: "idle", code: "if (marks >= 40) {...} else {...}" },
      { cap: "72 marks wali ball chauraahe pe aayi. Pehle sawaal poocha jayega.", mood: "think", code: "marks = 72;", run: function (c) {
        c.to("ball", { o: 1, s: 1 }, { d: .3 }); c.follow("ball", "pa", { d: 1.3, ease: "ease-out" });
      } },
      { cap: "Sawaal: 72 >= 40? Jawab: TRUE.", mood: "hint", code: "72 >= 40   ->   true", run: function (c) {
        c.text("cond", "72 >= 40"); c.text("bdgt", "TRUE"); c.cls("bdgr", "fgreen", "fred");
        c.to("bdg", { o: 1, s: 1 }, { d: .5, ease: "cubic-bezier(.3,1.7,.5,1)" }); c.bump("ball", { from: 1, peak: 1.2, d: 400 });
      } },
      { cap: "TRUE mila, to if wala gate khula. Ball upar wale raaste gayi.", mood: "cheer", code: "if { ... }   // chalega", run: function (c) {
        c.to("gate0", { r: -90 }, { d: .5 });
        c.follow("ball", "pu", { d: 1.7, delay: .5, from: 0 });
        c.to("ball", { o: 0, s: .4 }, { d: .35, delay: 2.1 });
        c.to("dr0", { o: 1 }, { d: .3, delay: 2.1 }); c.to("res0", { o: 1, s: 1, y: 52 }, { d: .5, delay: 2.2, ease: "cubic-bezier(.3,1.7,.5,1)" });
      } },
      { cap: "Ab 30 marks: 30 >= 40 FALSE. if ka gate band, ball ruk gayi.", mood: "oops", code: "marks = 30;  30 >= 40 -> false", run: function (c) {
        c.to("gate0", { r: 0 }, { d: .4 }); c.to("dr0", { o: 0 }, { d: .3 }); c.to("res0", { o: 0, s: .5 }, { d: .3 });
        c.text("bt", "30"); c.text("cond", "30 >= 40");
        c.to("bdg", { o: 0, s: .5 }, { d: .25 });
        c.to("ball", { x: 24, y: 146, o: 0, s: .3 }, { now: true });
        c.to("ball", { o: 1, s: 1 }, { d: .3 }); c.follow("ball", "pa", { d: 1.3, ease: "ease-out" });
        c.later(function () { c.text("bdgt", "FALSE"); c.cls("bdgr", "fred", "fgreen"); c.to("bdg", { o: 1, s: 1 }, { d: .5, ease: "cubic-bezier(.3,1.7,.5,1)" }); }, 1400);
        c.later(function () { }, 0);
      } },
      { cap: "FALSE hone par else wala raasta khulta hai. Ball neeche gayi.", mood: "think", code: "else { ... }   // chalega", run: function (c) {
        c.to("gate1", { r: -90 }, { d: .5 });
        c.follow("ball", "pd", { d: 1.7, delay: .5 });
        c.to("ball", { o: 0, s: .4 }, { d: .35, delay: 2.1 });
        c.to("dr1", { o: 1 }, { d: .3, delay: 2.1 }); c.to("res1", { o: 1, s: 1, y: 150 }, { d: .5, delay: 2.2, ease: "cubic-bezier(.3,1.7,.5,1)" });
      } },
      { cap: "Yaad rakho: dono raaste ek saath nahi chalte. Sirf ek!", mood: "celebrate", code: "if / else if / else -> pehla true", run: function (c) {
        c.bump("res1", { from: 1, peak: 1.25, d: 500 });
      } }
    ]
  });

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
      code: function (t) { var e = el("code"); e.textContent = t; if (anim && e.animate) anims.push(e.animate([{ opacity: .15 }, { opacity: 1 }], { duration: 320 })); },
      later: function (fn, ms) { if (!anim) { fn(); return; } var t = setTimeout(function () { if (alive) fn(); }, ms); timers.push(t); },
      /* travel along <path data-p="name"> from fraction a to b (WAAPI, sampled) */
      follow: function (k, pk, o) {
        o = o || {};
        var e = el(k), p = pathEl(pk), L = p.getTotalLength(), a = (o.from != null ? o.from : 0) * L, b = (o.to != null ? o.to : 1) * L, s = e._st, end = p.getPointAtLength(b);
        var s0 = { x: s.x, y: s.y, r: s.r, sx: s.sx, sy: s.sy, o: s.o };
        if (!anim) { s.x = end.x; s.y = end.y; put(e, s, { d: .4 }); return; }
        var N = 26, kf = [], i, pt;
        for (i = 0; i <= N; i++) { pt = p.getPointAtLength(a + (b - a) * i / N); kf.push({ transform: tf({ x: pt.x, y: pt.y, r: s.r, sx: s.sx, sy: s.sy }) }); }
        s.x = end.x; s.y = end.y; e.style.transition = "none"; e.style.transform = tf(s); e.style.transitionProperty = "opacity";
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

    function runStep(k) { var st = def.steps[k]; if (st.code != null) c.code(st.code); if (st.run) st.run(c); }
    function show(i, forward) {
      var isReduced = reduced();
      if (forward && !isReduced) { anims.forEach(function (a) { try { a.finish(); } catch (x) {} }); anims.length = 0; timers.forEach(clearTimeout); timers.length = 0; }
      else restore();
      if (forward) { anim = !isReduced; runStep(i); }
      else { anim = false; for (var k = 0; k <= i; k++) runStep(k); }
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
