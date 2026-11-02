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
    return '<g data-k="' + k + '" class="sc-t"><rect class="o ' + f + '" x="' + (-w / 2) + '" y="-15" width="' + w + '" height="30" rx="9"/><text data-k="' + k + '_t" class="tc" y="5.5" text-anchor="middle">' + txt + '</text></g>';
  }
  function tag(k, f, txt, w, h) {
    h = h || 24;
    return '<g data-k="' + k + '" class="sc-t"><rect class="o ' + f + '" x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="' + h / 2 + '"/><text data-k="' + k + '_t" class="tc sm" y="4.5" text-anchor="middle">' + txt + '</text></g>';
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
        c.chain("cd", [[{ x: 180, y: 56, o: 1, r: 0 }, { d: .4, ease: "ease-in" }], [{ x: 240, y: 24, o: 0, r: 40 }, { d: .5, delay: .12, ease: "ease-out" }]]);
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
      s += pill("fv", "if", 232, 74, 40) + pill("fs", "else", 232, 226, 52);
      [100, 198].forEach(function (y, i) {
        s += '<g transform="translate(304 ' + y + ') scale(.82)"><path class="o ' + (i ? "fred" : "fgreen") + '" d="M-34 -16 L0 -44 L34 -16 Z"/><rect class="o fpaper" x="-27" y="-16" width="54" height="42" rx="3"/><rect class="o fgrey" x="-9" y="2" width="18" height="24" rx="3"/><rect data-k="dr' + i + '" class="o fy" x="-9" y="2" width="18" height="24" rx="3"/><rect class="o fb" x="-23" y="-8" width="11" height="10" rx="2"/><rect class="o fb" x="12" y="-8" width="11" height="10" rx="2"/></g>';
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
      c.to("res0", { x: 304, y: 56, o: 0, s: .5 }, { now: true }); c.to("res1", { x: 304, y: 148, o: 0, s: .5 }, { now: true });
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
        c.to("dr0", { o: 1 }, { d: .3, delay: 2.1 }); c.to("res0", { o: 1, s: 1, y: 56 }, { d: .5, delay: 2.2, ease: "cubic-bezier(.3,1.7,.5,1)" });
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
        c.to("dr1", { o: 1 }, { d: .3, delay: 2.1 }); c.to("res1", { o: 1, s: 1, y: 148 }, { d: .5, delay: 2.2, ease: "cubic-bezier(.3,1.7,.5,1)" });
      } },
      { cap: "Yaad rakho: dono raaste ek saath nahi chalte. Sirf ek!", mood: "celebrate", code: "if / else if / else -> pehla true", run: function (c) {
        c.bump("res1", { from: 1, peak: 1.25, d: 500 });
      } }
    ]
  });

  function star(r, ri) { var p = [], i; for (i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? ri : r; p.push((Math.cos(a) * rr).toFixed(1) + "," + (Math.sin(a) * rr).toFixed(1)); } return p.join(" "); }
  var EASE_POP = "cubic-bezier(.3,1.7,.5,1)", EASE_DROP = "cubic-bezier(.3,1.4,.55,1)";

  /* ================================================================= 3. loops — conveyor belt + stamp */
  define("loops", {
    title: "Loops: conveyor belt",
    label: "Animation: parcels ride a conveyor belt under a stamp. A counter i ticks 0, 1, 2 and the loop stops when i < 3 turns false.",
    build: function () {
      var s = RIB + '<g transform="translate(0 14)">', x, ticks = "";
      for (x = -16; x <= 376; x += 16) ticks += "M" + x + " 173 v14 ";
      s += '<rect class="ffloor" x="0" y="208" width="360" height="40"/><rect class="o fgrey" x="-6" y="170" width="372" height="22" rx="11"/>';
      s += '<clipPath id="scl-belt"><rect x="6" y="171" width="348" height="20"/></clipPath><g clip-path="url(#scl-belt)"><g data-k="treads" class="treads"><path class="tread" d="' + ticks + '"/></g></g>';
      s += '<rect class="o fgrey" x="98" y="60" width="8" height="110" rx="3"/><rect class="o fgrey" x="154" y="60" width="8" height="110" rx="3"/>';
      for (var k = 0; k < 3; k++) {
        s += '<g data-k="pc' + k + '" class="sc-t"><rect class="o fw" x="-22" y="-38" width="44" height="38" rx="5"/><rect class="fwd" x="-20.5" y="-36.5" width="41" height="7" rx="3"/>' +
          '<rect class="o fpaper" x="-18" y="-24" width="18" height="17" rx="3"/><text class="tc sm" x="-9" y="-11.5" text-anchor="middle">' + k + '</text>' +
          '<g data-k="mk' + k + '" class="sc-t"><polygon class="o fy" points="' + star(10, 4.6) + '"/></g></g>';
      }
      s += '<g data-k="stamp" class="sc-t"><rect class="o fgrey" x="-4" y="-40" width="8" height="40"/><rect class="o fred" x="-20" y="0" width="40" height="11" rx="4"/></g>';
      s += '<rect class="o fv" x="90" y="46" width="80" height="26" rx="8"/><text class="tc sm" x="130" y="63" text-anchor="middle">stamp()</text>';
      s += '<rect class="sc-board" x="212" y="52" width="138" height="70" rx="12"/><g data-k="ctrg" class="sc-t"><text data-k="ctr" class="tl lg" text-anchor="middle">i = ?</text></g>';
      s += '<g data-k="lamp" class="sc-t"><circle class="lampc" r="7"/></g><text data-k="cnd" class="tl sm" x="244" y="110">i &lt; 3 ?</text>';
      s += tag("dn", "fy", "3 baar chala", 108);
      return s + "</g>";
    },
    init: function (c) {
      c.to("ctrg", { x: 281, y: 84 }, { now: true }); c.to("lamp", { x: 230, y: 106 }, { now: true });
      c.to("stamp", { x: 130, y: 94 }, { now: true }); c.to("dn", { x: 282, y: 144, o: 0, s: .5 }, { now: true });
      for (var k = 0; k < 3; k++) { c.to("pc" + k, { x: 130 + (k + 1) * 66 /* 66 not 72: the 3rd parcel (half-width 22) stays inside the 360px view */, y: 170 }, { now: true }); c.to("mk" + k, { x: 11, y: -18, o: 0, s: .3 }, { now: true }); }
    },
    steps: (function () {
      function posOf(c, cur, delay) { for (var k = 0; k < 3; k++) c.to("pc" + k, { x: 130 + (k - cur) * 72 }, { d: .9, delay: delay || 0, ease: "ease-in-out" }); }
      function belt(c, delay, ms) { c.later(function () { c.cls("treads", "run"); }, (delay || 0) * 1000); c.later(function () { c.cls("treads", "", "run"); }, ((delay || 0) * 1000) + (ms || 900)); }
      function press(c, k, delay) {
        c.chain("stamp", [[{ y: 121 }, { d: .22, delay: delay, ease: "ease-in" }], [{ y: 94 }, { d: .32, ease: "ease-out" }]]);
        c.to("mk" + k, { o: 1, s: 1 }, { d: .4, delay: delay + .2, ease: EASE_POP });
        c.bump("pc" + k, { from: 1, peak: 1.05, d: 260, delay: delay + .2 });
      }
      function counter(c, i, ok) {
        c.text("ctr", "i = " + i); c.bump("ctrg", { from: .7, peak: 1.15, d: 380 });
        c.text("cnd", i + " < 3  " + (ok ? "true" : "false")); c.cls("lamp", ok ? "ok" : "bad", ok ? "bad" : "ok");
      }
      return [
        { cap: "Loop = conveyor belt. Wahi kaam baar-baar, har parcel par.", mood: "idle", code: "for (i = 0; i < 3; i++) stamp()" },
        { cap: "Shuru: i = 0. Check: 0 < 3? Haan. To kaam karo.", mood: "think", code: "i = 0;   0 < 3 ?  -> true", run: function (c) { belt(c); posOf(c, 0); counter(c, 0, true); } },
        { cap: "Loop ki body chali: parcel 0 par stamp laga.", mood: "cheer", code: "stamp();   // parcel 0", run: function (c) { press(c, 0, .1); } },
        { cap: "i++ se i = 1. Phir check: 1 < 3? Haan. Belt aage badhi.", mood: "think", code: "i++;   1 < 3 ?  -> true", run: function (c) { belt(c); posOf(c, 1); counter(c, 1, true); } },
        { cap: "Parcel 1 par stamp, phir i = 2 aur parcel 2 par bhi.", mood: "cheer", code: "stamp(); i++; stamp();", run: function (c) {
          press(c, 1, .1); belt(c, 1.0); posOf(c, 2, 1.0);
          c.later(function () { counter(c, 2, true); }, 1000); press(c, 2, 2.05);
        } },
        { cap: "i = 3: 3 < 3? Nahi! Condition false, to loop ruk gaya.", mood: "hint", code: "i++;   3 < 3 ?  -> false", run: function (c) { belt(c); posOf(c, 3); counter(c, 3, false); } },
        { cap: "Loop 3 baar chala: i = 0, 1, 2. Condition kabhi false na ho to infinite loop!", mood: "celebrate", code: "// i = 0, 1, 2  ->  3 iterations", run: function (c) { c.to("dn", { o: 1, s: 1 }, { d: .5, ease: EASE_POP }); } }
      ];
    })()
  });

  /* ================================================================= 4. arrays — numbered lockers */
  define("arrays", {
    title: "Arrays: numbered lockers",
    label: "Animation: a row of lockers numbered from 0. Open a locker by its index; push adds a locker; a missing index gives undefined.",
    build: function () {
      var s = RIB, X = [52, 116, 180, 244, 308], names = ["Asha", "Ravi", "Zoya", "Kabir"], cols = ["fp", "fy", "ft", "fv"], i;
      s += '<rect class="ffloor" x="0" y="196" width="360" height="44"/>';
      for (i = 3; i < 5; i++) s += '<rect class="ghost" x="' + (X[i] - 27) + '" y="98" width="54" height="92" rx="7"/>';
      for (i = 0; i < 4; i++) {
        s += '<g data-k="lk' + i + '" class="sc-t"><rect class="o fink-in" x="-27" y="-46" width="54" height="92" rx="7"/>' +
          '<g data-k="dr' + i + '" class="sc-t"><rect class="o fb" x="0" y="-46" width="54" height="92" rx="7"/><path class="o-line thin" d="M12 -30 h30 M12 -23 h30 M12 -16 h30"/><circle class="o fy" cx="43" cy="8" r="4.5"/></g>' +
          '<g data-k="it' + i + '" class="sc-t"><rect class="o ' + cols[i] + '" x="-26" y="-17" width="52" height="34" rx="9"/><text class="tc sm" y="5" text-anchor="middle">' + names[i] + '</text></g></g>';
      }
      for (i = 0; i < 5; i++) s += '<g data-k="ip' + i + '" class="sc-t"><circle class="o fy" r="13"/><text data-k="ipt' + i + '" class="tc" y="5.5" text-anchor="middle">' + i + '</text></g>';
      s += '<text data-k="qm" class="tl lg sc-t" text-anchor="middle" y="0">?</text>';
      s += chip("pk", "fv", '"Kabir"', 62) + tag("und", "fred", "undefined", 94) + tag("len", "fy", "length = 3", 104) + tag("f0", "fb", "pehla = 0", 92) + tag("last", "ft", "last = length - 1", 138);
      return s;
    },
    init: function (c) {
      var X = [52, 116, 180, 244, 308], i;
      for (i = 0; i < 5; i++) { c.to("ip" + i, { x: X[i], y: 80 }, { now: true }); if (i < 4) { c.to("lk" + i, { x: X[i], y: 144 }, { now: true }); c.to("dr" + i, { x: -27, y: 0 }, { now: true }); c.to("it" + i, { x: 0, y: 0, o: 0, s: .5 }, { now: true }); } }
      c.to("lk3", { x: X[3], y: 144, o: 0 }, { now: true }); c.to("ip3", { o: 0 }, { now: true }); c.to("ip4", { o: 0 }, { now: true });
      c.to("pk", { x: X[3], y: 52, o: 0 }, { now: true }); c.to("und", { x: 286, y: 214, o: 0, s: .5 }, { now: true });
      c.to("len", { x: 180, y: 218, o: 0, s: .6 }, { now: true }); c.to("f0", { x: 70, y: 53, o: 0, s: .6 }, { now: true }); c.to("last", { x: 180, y: 218, o: 0, s: .6 }, { now: true });
      c.to("qm", { x: X[4], y: 150, o: 0, s: .5 }, { now: true });
    },
    steps: (function () {
      function open(c, i, on) { c.to("dr" + i, { sx: on ? .1 : 1 }, { d: .45 }); c.to("it" + i, { o: on ? 1 : 0, s: on ? 1 : .5, y: on ? 0 : 0 }, { d: .45, delay: on ? .15 : 0, ease: EASE_POP }); }
      return [
        { cap: "Array = lockers ki line. Har locker ka ek number (index) hota hai.", mood: "idle", code: 'const a = ["Asha","Ravi","Zoya"];' },
        { cap: "Dhyan do: ginti 0 se shuru hoti hai, 1 se nahi! Pehla locker = 0.", mood: "hint", code: "// index: 0, 1, 2", run: function (c) {
          c.to("f0", { o: 1, s: 1 }, { d: .5, ease: EASE_POP }); [0, 1, 2].forEach(function (i) { c.bump("ip" + i, { from: 1, peak: 1.3, d: 400, delay: .15 * i }); });
        } },
        { cap: "a[0] pehla locker kholta hai: \"Asha\".", mood: "cheer", code: "a[0]   // \"Asha\"", run: function (c) { c.to("f0", { o: 0, s: .6 }, { d: .3 }); open(c, 0, true); } },
        { cap: "a[2] teesra item: \"Zoya\". Teen item hain, last index 2.", mood: "idle", code: "a[2]   // \"Zoya\"", run: function (c) {
          open(c, 0, false); open(c, 2, true); c.to("len", { o: 1, s: 1 }, { d: .5, delay: .3, ease: EASE_POP });
        } },
        { cap: "push(\"Kabir\") ne naya locker jod diya. Ab length 4 hai.", mood: "cheer", code: 'a.push("Kabir");', run: function (c) {
          open(c, 2, false);
          c.chain("pk", [[{ y: 50, o: 1 }, { d: .25 }], [{ y: 144 }, { d: .5, ease: "ease-in" }], [{ o: 0, s: .4 }, { d: .2 }]]);
          c.to("lk3", { o: 1 }, { d: .4, delay: .9 }); c.to("ip3", { o: 1 }, { d: .4, delay: .9 });
          c.text("len_t", "length = 4"); c.bump("len", { from: .8, peak: 1.15, d: 400, delay: .9 });
        } },
        { cap: "a[4]? Wahan locker hi nahi hai: undefined. Index length se bahar!", mood: "oops", code: "a[4]   // undefined", run: function (c) {
          c.to("ip4", { o: 1 }, { d: .3 }); c.cls("ipt4", "", ""); c.to("qm", { o: 1, s: 1 }, { d: .4, delay: .2, ease: EASE_POP }); c.to("und", { o: 1, s: 1 }, { d: .5, delay: .4, ease: EASE_POP }); c.bump("ip4", { from: 1, peak: 1.3, d: 400 });
        } },
        { cap: "Last item = a[length - 1]. Index hamesha length se ek kam hota hai.", mood: "celebrate", code: "a[a.length - 1]   // \"Kabir\"", run: function (c) {
          c.to("und", { o: 0, s: .5 }, { d: .3 }); c.to("qm", { o: 0 }, { d: .2 }); c.to("ip4", { o: 0 }, { d: .2 });
          open(c, 3, true); c.to("len", { o: 0 }, { d: .2 }); c.to("last", { o: 1, s: 1 }, { d: .5, delay: .3, ease: EASE_POP }); c.bump("ip3", { from: 1, peak: 1.35, d: 450, delay: .2 });
        } }
      ];
    })()
  });

  /* ================================================================= 5. strings — letter tiles on a thread */
  define("strings", {
    title: "Strings: akshar ke tiles",
    label: "Animation: a string is a thread of letter tiles with index numbers. Length, indexing, immutability, concatenation and toUpperCase make new strings.",
    build: function () {
      var s = RIB, X0 = 104, i, w1 = "chai", w2 = "chai!", W = "CHAI!";
      s += '<path class="thr" d="M84 112 H282"/><path data-k="thr2" class="thr sc-t" d="M84 196 H322"/>';
      s += '<g data-k="lab1" class="sc-t"><rect class="o fpaper" x="-26" y="-13" width="52" height="26" rx="6"/><text class="tc" y="5.5" text-anchor="middle">s</text></g>';
      s += '<g data-k="lab2" class="sc-t"><rect class="o fpaper" x="-28" y="-13" width="56" height="26" rx="6"/><text class="tc sm" y="4.5" text-anchor="middle">naya</text></g>';
      s += '<text data-k="lq1" class="quo sc-t" text-anchor="middle">\u201C</text><text data-k="rq1" class="quo sc-t" text-anchor="middle">\u201D</text><text data-k="rq2" class="quo sc-t" text-anchor="middle">\u201D</text>';
      s += '<g data-k="br" class="sc-t"><path class="o-line" d="M-92 8 v-7 h184 v7"/><g transform="translate(0 -14)"><rect class="o fy" x="-48" y="-12" width="96" height="24" rx="12"/><text class="tc sm" y="4.5" text-anchor="middle">length = 4</text></g></g>';
      for (i = 0; i < 4; i++) s += '<g data-k="ix' + i + '" class="sc-t"><circle class="o fpaper" r="11"/><text class="tc sm" y="4.5" text-anchor="middle">' + i + '</text></g>';
      for (i = 0; i < 4; i++) s += '<g data-k="t' + i + '" class="sc-t"><rect class="o fy" x="-20" y="-24" width="40" height="48" rx="9"/><text class="tc lg" y="7.5" text-anchor="middle">' + w1[i] + '</text></g>';
      for (i = 0; i < 5; i++) s += '<g data-k="u' + i + '" class="sc-t"><rect class="o fb" x="-20" y="-24" width="40" height="48" rx="9"/><text data-k="ul' + i + '" class="tc lg" y="7.5" text-anchor="middle">' + w2[i] + '</text><text data-k="uu' + i + '" class="tc lg" y="7.5" text-anchor="middle">' + W[i] + '</text></g>';
      s += chip("pt", "fp", '"p"', 44) + tag("res", "fp", '"h"', 54, 26) + tag("imm", "fred", "badal nahi sakte!", 140);
      return s;
    },
    init: function (c) {
      var X0 = 104, i;
      for (i = 0; i < 4; i++) { c.to("t" + i, { x: X0 + 48 * i, y: 112, o: 0 }, { now: true }); c.to("ix" + i, { x: X0 + 48 * i, y: 150, o: 0, s: .5 }, { now: true }); }
      for (i = 0; i < 5; i++) { c.to("u" + i, { x: X0 + 48 * i, y: 196, o: 0 }, { now: true }); c.to("uu" + i, { o: 0 }, { now: true }); }
      c.to("lab1", { x: 34, y: 112 }, { now: true }); c.to("lab2", { x: 34, y: 196, o: 0 }, { now: true });
      c.to("lq1", { x: 72, y: 138 }, { now: true }); c.to("rq1", { x: 284, y: 138 }, { now: true }); c.to("rq2", { x: 336, y: 222, o: 0 }, { now: true }); c.to("thr2", { o: 0 }, { now: true });
      c.to("br", { x: 176, y: 78, o: 0 }, { now: true });
      c.to("pt", { x: 98, y: 44, o: 0 }, { now: true }); c.to("res", { x: 150, y: 66, o: 0, s: .5 }, { now: true }); c.to("imm", { x: 180, y: 66, o: 0, s: .5 }, { now: true });
      c.to("lq1", { o: 0 }, { now: true }); c.to("rq1", { o: 0 }, { now: true });
    },
    steps: (function () {
      var X0 = 104;
      function lift(c, up) { for (var i = 0; i < 4; i++) c.to("t" + i, { y: i === up ? 100 : 112 }, { d: .35, ease: EASE_POP }); }
      return [
        { cap: "String = akshar (characters) ka dhaaga. Har akshar ek tile.", mood: "idle", code: 'const s = "chai";', run: function (c) {
          for (var i = 0; i < 4; i++) c.to("t" + i, { o: 1 }, { d: .45, delay: .12 * i, ease: "ease-out" });
          c.to("lq1", { o: 1 }, { d: .3, delay: .1 }); c.to("rq1", { o: 1 }, { d: .3, delay: .6 });
        } },
        { cap: ".length = tile ginti: 4. Index 0 se shuru, isliye last index 3.", mood: "hint", code: "s.length   // 4", run: function (c) {
          for (var i = 0; i < 4; i++) c.to("ix" + i, { o: 1, s: 1 }, { d: .4, delay: .12 * i, ease: EASE_POP });
          c.to("br", { o: 1, y: 76 }, { d: .5, delay: .5, ease: EASE_POP });
        } },
        { cap: "s[1] = \"h\". Pehla akshar s[0] = \"c\" hota hai.", mood: "cheer", code: 's[1]   // "h"', run: function (c) {
          c.to("br", { o: 0 }, { d: .25 }); lift(c, 1); c.text("res_t", "\"h\""); c.to("res", { x: X0 + 48, y: 66, o: 1, s: 1 }, { d: .45, delay: .2, ease: EASE_POP });
        } },
        { cap: "Last akshar: s[s.length - 1] = \"i\". Hamesha length - 1.", mood: "think", code: 's[s.length - 1]   // "i"', run: function (c) {
          c.to("br", { o: 0 }, { d: .1 }); lift(c, 3); c.to("res", { o: 0, s: .5 }, { d: .15 });
          c.later(function () { c.text("res_t", "\"i\""); c.to("res", { x: X0 + 144, y: 66, o: 1, s: 1 }, { d: .45, ease: EASE_POP }); }, 250);
        } },
        { cap: "s[0] = \"p\" se kuch nahi badla! Strings immutable hain.", mood: "oops", code: 's[0] = "p";   // chalta nahi', run: function (c) {
          lift(c, -1); c.to("res", { o: 0, s: .5 }, { d: .15 });
          c.chain("pt", [[{ x: X0, y: 70, o: 1, r: 0 }, { d: .4, ease: "ease-in" }], [{ x: X0 + 44, y: 36, o: 0, r: 40 }, { d: .45, delay: .1 }]]);
          c.shake("t0", { delay: .38, amp: 5 }); c.to("imm", { o: 1, s: 1, y: 66 }, { d: .45, delay: .5, ease: EASE_POP });
        } },
        { cap: "s + \"!\" ne nayi string banayi: chai!. Purani s waisi hi rahi.", mood: "cheer", code: 'const t = s + "!";', run: function (c) {
          c.to("imm", { o: 0, s: .5 }, { d: .25 });
          c.to("lab2", { o: 1 }, { d: .4, delay: .3 }); c.to("thr2", { o: 1 }, { d: .4, delay: .3 });
          for (var i = 0; i < 5; i++) c.to("u" + i, { o: 1 }, { d: .5, delay: .4 + .13 * i, ease: i === 4 ? EASE_DROP : "ease-out" });
          c.to("rq2", { o: 1 }, { d: .3, delay: 1.2 });
        } },
        { cap: "toUpperCase() ne CHAI! banaya. Dono alag strings, s ab bhi \"chai\".", mood: "celebrate", code: "t.toUpperCase()   // \"CHAI!\"", run: function (c) {
          for (var i = 0; i < 5; i++) { c.to("ul" + i, { o: 0 }, { d: .25, delay: .12 * i }); c.to("uu" + i, { o: 1 }, { d: .25, delay: .12 * i + .1 }); c.bump("u" + i, { from: 1, peak: 1.12, d: 380, delay: .12 * i }); }
        } }
      ];
    })()
  });

  /* ================================================================= 6. functions — the add() machine */
  define("functions", {
    title: "Functions: machine",
    label: "Animation: a function is a machine. Arguments drop into slots a and b, the body runs inside, return sends the result out; no return gives undefined.",
    build: function () {
      var s = RIB, gear = function (k, r, f) { return '<g data-k="' + k + '" class="gear sc-t"><circle class="gear-t gt-' + f + '" r="' + (r + 3.5) + '" stroke-dasharray="' + (r * .55).toFixed(1) + ' ' + (r * .55 + 1.6).toFixed(1) + '"/><circle class="o ' + f + '" r="' + r + '"/><circle class="fink" r="3.2"/></g>'; };
      s += '<rect class="o fw" x="14" y="190" width="332" height="11" rx="5"/>';
      s += '<path class="o fgrey" d="M196 140 L246 168 V184 H196 Z"/>';
      s += '<rect class="o fwd" x="214" y="176" width="62" height="9" rx="4"/>';
      s += '<path class="o fgrey" d="M52 68 H100 L90 92 H62 Z"/><path class="o fgrey" d="M140 68 H188 L178 92 H150 Z"/>';
      s += '<rect class="o fs" x="40" y="84" width="160" height="106" rx="16"/><path class="gloss" d="M52 100 v52"/><rect class="fink-in" x="82" y="100" width="76" height="62" rx="31"/><rect class="o-line" x="82" y="100" width="76" height="62" rx="31"/>';
      s += '<circle class="o fgreen" cx="58" cy="100" r="4.5"/><circle class="o fy" cx="58" cy="114" r="4.5"/><circle class="o fred" cx="58" cy="128" r="4.5"/><path class="o-line thin" d="M172 104 h16 M172 112 h16 M172 120 h16"/><circle class="o fpaper" cx="180" cy="146" r="9"/><path class="o-line" d="M180 146 l4 -5"/>';
      s += gear("g1", 14, "fy") + gear("g2", 11, "ft");
      s += '<g transform="translate(120 176)"><rect class="o fpaper" x="-28" y="-11" width="56" height="22" rx="6"/><text class="tc md" y="5" text-anchor="middle">add</text></g>';
      s += '<text class="tw mono" x="76" y="82" text-anchor="middle">a</text><text class="tw mono" x="164" y="82" text-anchor="middle">b</text>';
      s += '<g transform="translate(314 172)"><rect class="o fg" x="-30" y="-28" width="60" height="56" rx="12"/><rect class="o fw" x="-34" y="-34" width="68" height="12" rx="5"/><g data-k="xl"><rect class="o fpaper" x="-17" y="10" width="34" height="18" rx="5"/><text class="tc sm" y="23" text-anchor="middle">x</text></g></g>';
      s += chip("ia", "fb", "2", 36) + chip("ib", "fb", "3", 36) + chip("r1", "ft", "5", 40) + chip("r2", "ft", "30", 46) + chip("ru", "fgrey", "undefined", 86);
      return s;
    },
    init: function (c) {
      c.to("ia", { x: 76, y: 54, o: 0 }, { now: true }); c.to("ib", { x: 164, y: 54, o: 0 }, { now: true });
      c.to("g1", { x: 107, y: 135 }, { now: true }); c.to("g2", { x: 136, y: 128 }, { now: true });
      c.to("r1", { x: 210, y: 150, o: 0, s: .5 }, { now: true }); c.to("r2", { x: 210, y: 150, o: 0, s: .5 }, { now: true }); c.to("ru", { x: 226, y: 160, o: 0, s: .6 }, { now: true });
    },
    steps: (function () {
      function drop(c, k, v, delay) { c.text(k + "_t", v); c.chain(k, [[{ o: 1, s: 1 }, { d: .2, delay: delay }], [{ y: 78 }, { d: .5, ease: "ease-in" }], [{ o: 0, s: .5, y: 94 }, { d: .2 }]]); }
      function spin(c, ms) { c.cls("g1", "spin"); c.cls("g2", "spin"); c.later(function () { c.cls("g1", "", "spin"); c.cls("g2", "", "spin"); }, ms); c.bump("g1", { from: 1, peak: 1.2, d: 300 }); }
      function reset(c, k, x) { c.to(k, { x: x, y: 54, o: 0, s: 1 }, { now: true }); }
      return [
        { cap: "Function = machine. Iska naam (add), input (a, b) aur output hota hai.", mood: "idle", code: "function add(a, b) { return a + b }" },
        { cap: "add(2, 3) bola: 2 slot a mein, 3 slot b mein gaya. Ye arguments hain.", mood: "cheer", code: "add(2, 3)", run: function (c) { drop(c, "ia", "2", 0); drop(c, "ib", "3", .35); } },
        { cap: "Andar body chali: a + b, yaani 2 + 3. Gear ghoom rahe hain.", mood: "think", code: "// andar:  a + b  ->  2 + 3", run: function (c) { spin(c, 2200); } },
        { cap: "return ne result bahar bheja: 5.", mood: "cheer", code: "return 5;", run: function (c) {
          c.chain("r1", [[{ o: 1, s: 1, x: 205, y: 148 }, { d: .3 }], [{ x: 240, y: 158, r: 10 }, { d: .6, ease: "ease-in" }], [{ r: 0, y: 160 }, { d: .3, ease: EASE_POP }]]);
        } },
        { cap: "Result ko variable mein rakh lo: x = 5.", mood: "idle", code: "const x = add(2, 3);   // x = 5", run: function (c) {
          c.chain("r1", [[{ x: 280, y: 110, r: -10 }, { d: .5, ease: "ease-out" }], [{ x: 314, y: 168, s: .9, r: 0 }, { d: .45, ease: "ease-in" }]]);
          c.bump("xl", { from: 1, peak: 1.2, d: 400, delay: .9 });
        } },
        { cap: "Wahi machine, naya input: add(10, 20) = 30. Ek baar likho, baar-baar chalao!", mood: "celebrate", code: "add(10, 20)   // 30", run: function (c) {
          reset(c, "ia", 76); reset(c, "ib", 164); c.text("ia_t", "10"); c.text("ib_t", "20");
          drop(c, "ia", "10", 0); drop(c, "ib", "20", .35); c.later(function () { spin(c, 1600); }, 1000);
          c.chain("r2", [[{ o: 1, s: 1, x: 205, y: 148 }, { d: .3, delay: 2.3 }], [{ x: 240, y: 158, r: 10 }, { d: .6, ease: "ease-in" }], [{ r: 0, y: 160 }, { d: .3, ease: EASE_POP }]]);
        } },
        { cap: "return bhoole? Machine chali par kuch bahar nahi aaya: undefined. Return zaroor likho.", mood: "oops", code: "function add(a, b) { a + b }", run: function (c) {
          c.to("r2", { o: 0, s: .5 }, { d: .3 }); reset(c, "ia", 76); reset(c, "ib", 164);
          drop(c, "ia", "2", .3); drop(c, "ib", "3", .65); c.later(function () { spin(c, 1400); }, 1300);
          c.chain("ru", [[{ o: 1, s: 1, x: 205, y: 148 }, { d: .3, delay: 2.6 }], [{ x: 226, y: 160 }, { d: .5, ease: "ease-in" }]]);
        } }
      ];
    })()
  });

  /* ================================================================= 7. objects and maps — key-tag board */
  define("objects-and-maps", {
    title: "Objects: key-tag board",
    label: "Animation: an object is a board of key tags, each linked to a value. Look values up by key name, add or change keys; a missing key gives undefined.",
    build: function () {
      var s = RIB, keys = ["name", "age", "city", "phone"], vals = ['"Asha"', "25", '"Pune"', "undefined"], i;
      s += '<rect class="o fw" x="12" y="46" width="336" height="166" rx="14"/><rect class="fwd" x="22" y="56" width="316" height="146" rx="9"/>';
      for (i = 0; i < 4; i++) {
        s += '<g data-k="rw' + i + '" class="sc-t">' +
          '<path class="thr dk" d="M138 0 H158"/>' +
          '<g data-k="kt' + i + '"><rect class="o ' + (i === 3 ? "ghostk" : "fb") + '" x="36" y="-14" width="102" height="28" rx="9"/><circle class="o fpaper" cx="48" cy="0" r="4"/><text class="tc" x="97" y="5.5" text-anchor="middle">' + keys[i] + '</text></g>' +
          '<g data-k="vc' + i + '"><rect data-k="vr' + i + '" class="o ' + (i === 3 ? "ghostv" : "fpaper") + '" x="158" y="-14" width="166" height="28" rx="9"/><text data-k="vt' + i + '" class="tc" x="172" y="5.5">' + vals[i] + '</text></g></g>';
      }
      s += '<rect data-k="hl" class="hlf sc-t" x="27" y="-19" width="306" height="38" rx="12"/>';
      s += tag("ks", "ft", '["name", "age", "city"]', 214, 28);
      return s;
    },
    init: function (c) {
      var Y = [84, 120, 156, 192], i;
      for (i = 0; i < 4; i++) c.to("rw" + i, { y: Y[i], x: i > 1 ? 40 : 0, o: i > 1 ? 0 : 1 }, { now: true });
      c.to("hl", { y: 84, o: 0 }, { now: true }); c.to("ks", { x: 180, y: 192, o: 0, s: .6 }, { now: true });
    },
    steps: (function () {
      var Y = [84, 120, 156, 192];
      function hl(c, i) { c.to("hl", { y: Y[i], o: 1 }, { d: .45, ease: EASE_POP }); }
      function glow(c, i, on) { c.cls("vr" + i, on ? "hot" : "", on ? "" : "hot"); }
      return [
        { cap: "Object = key-tag wali board. Har tag (key) ke saath ek value juda hai.", mood: "idle", code: 'user = { name: "Asha", age: 25 }' },
        { cap: "user.name: 'name' tag dhundo, uski value mili: \"Asha\". Number se nahi, naam se!", mood: "cheer", code: 'user.name   // "Asha"', run: function (c) { hl(c, 0); glow(c, 0, true); c.bump("vc0", { from: 1, peak: 1.05, d: 400, delay: .3 }); } },
        { cap: "user[\"age\"] bhi chalega: key ko string likh ke bhi value mil jaati hai.", mood: "think", code: 'user["age"]   // 25', run: function (c) { glow(c, 0, false); hl(c, 1); glow(c, 1, true); } },
        { cap: "Nayi key? Bas assign karo, nayi tag lag gayi.", mood: "cheer", code: 'user.city = "Pune";', run: function (c) {
          glow(c, 1, false); c.to("hl", { o: 0 }, { d: .2 });
          c.to("rw2", { x: 0, o: 1 }, { d: .5, delay: .2, ease: EASE_POP });
        } },
        { cap: "Purani key par assign karo to value badal jaati hai. Tag wahi rehta hai.", mood: "think", code: "user.age = 26;", run: function (c) {
          hl(c, 1); c.text("vt1", "26"); glow(c, 1, true); c.bump("vc1", { from: .85, peak: 1.08, d: 450, delay: .3 });
        } },
        { cap: "Jo key hai hi nahi: undefined. Error nahi, bas khaali haath.", mood: "oops", code: "user.phone   // undefined", run: function (c) {
          glow(c, 1, false); hl(c, 3); c.to("rw3", { x: 0, o: 1 }, { d: .5, delay: .2, ease: EASE_POP }); c.shake("rw3", { delay: .7, amp: 4 });
        } },
        { cap: "Object.keys se saari tags ki list milti hai. Dhundo key se, position se nahi.", mood: "celebrate", code: "Object.keys(user)", run: function (c) {
          c.to("hl", { o: 0 }, { d: .2 }); c.to("rw3", { o: 0, x: 40 }, { d: .3 });
          c.to("ks", { o: 1, s: 1 }, { d: .5, delay: .3, ease: EASE_POP });
        } }
      ];
    })()
  });

  /* ================================================================= 8. recursion — nested dolls */
  define("recursion", {
    title: "Recursion: matryoshka",
    label: "Animation: nested dolls. Each doll opens to reveal a smaller one until the smallest, the base case. Then the answer travels back, closing each doll: fact(3) = 6.",
    build: function () {
      var s = RIB, fills = { 3: "fred", 2: "fs", 1: "ft" }, n;
      s += '<rect class="ffloor" x="0" y="206" width="360" height="40"/>';
      for (n = 1; n <= 3; n++) {
        s += '<g data-k="d' + n + '" class="sc-t">' +
          '<ellipse class="fink-in" cx="0" cy="-70" rx="43" ry="8"/>' +
          '<path class="o ' + fills[n] + '" d="M-45 -70 C-46 -22 -28 0 0 0 C28 0 46 -22 45 -70 Z"/>' +
          '<path class="o fpaper" d="M-46 -62 C-46 -54 46 -54 46 -62 L46 -46 C46 -38 -46 -38 -46 -46 Z" style="fill:#fffaf0;opacity:.9"/>' +
          '<circle class="o fpaper" cx="0" cy="-22" r="12"/><text class="tc md" y="-17" text-anchor="middle">' + n + '</text>' +
          '<g data-k="lid' + n + '" class="sc-t"><path class="o ' + fills[n] + '" d="M-45 -70 C-46 -96 -30 -130 0 -130 C30 -130 46 -96 45 -70 Z"/><circle class="fink" cx="-15" cy="-92" r="4.5"/><circle class="fink" cx="15" cy="-92" r="4.5"/>' +
          '<ellipse class="blush" cx="-27" cy="-82" rx="7" ry="4"/><ellipse class="blush" cx="27" cy="-82" rx="7" ry="4"/><path class="o-line" d="M-9 -80 Q0 -72 9 -80"/><path class="hilite" d="M-30 -112 Q-22 -122 -10 -124"/></g></g>';
        s += '<text data-k="lb' + n + '" class="tw mono" text-anchor="middle">fact(' + n + ')</text>';
      }
      s += tag("bc", "fy", "base case!", 96, 26) + tag("so", "fred", "Maximum call stack!", 156, 28) + '<text data-k="dots" class="tw" text-anchor="middle">. . .</text>';
      s += chip("rc", "ft", "1", 62);
      return s;
    },
    init: function (c) {
      var X = { 3: 104, 2: 208, 1: 288 }, n;
      for (n = 1; n <= 3; n++) { c.to("d" + n, { x: n === 3 ? X[3] : 104, y: 204, s: n === 3 ? .92 : .5, o: n === 3 ? 1 : 0 }, { now: true }); c.to("lid" + n, { x: 0, y: 0, r: 0 }, { now: true }); c.to("lb" + n, { x: X[n], y: 224, o: n === 3 ? 1 : 0 }, { now: true }); }
      c.to("bc", { x: 288, y: 118, o: 0, s: .6 }, { now: true }); c.to("so", { x: 230, y: 62, o: 0, s: .6 }, { now: true });
      c.to("dots", { x: 334, y: 190, o: 0 }, { now: true }); c.to("rc", { x: 282, y: 120, o: 0, s: .5 }, { now: true });
    },
    steps: (function () {
      var X = { 3: 104, 2: 208, 1: 288 }, S = { 3: .92, 2: .72, 1: .5 };
      function open(c, n, on, delay) { c.to("lid" + n, on ? { y: -14, x: -20, r: -26 } : { y: 0, x: 0, r: 0 }, { d: .5, delay: delay || 0, ease: EASE_POP }); }
      function out(c, n, delay) { c.to("d" + n, { x: X[n], s: S[n], o: 1 }, { d: .7, delay: delay, ease: EASE_DROP }); c.to("lb" + n, { o: 1 }, { d: .4, delay: delay + .4 }); }
      function back(c, n, into, delay) { c.to("d" + n, { x: X[into], s: S[n] * .6, o: 0 }, { d: .6, delay: delay, ease: "ease-in" }); c.to("lb" + n, { o: 0 }, { d: .3, delay: delay }); }
      return [
        { cap: "Recursion = Russian dolls. Har doll ke andar wahi kaam, bas chhota.", mood: "idle", code: "fact(n) = n * fact(n - 1)" },
        { cap: "fact(3) ne khud ko khola: andar fact(2) mila. Kaam adhoora, intezaar karo.", mood: "think", code: "fact(3)   // andar fact(2)", run: function (c) { open(c, 3, true); out(c, 2, .3); } },
        { cap: "fact(2) bhi khula: andar fact(1). Har baar chhota (n - 1).", mood: "think", code: "fact(2)   // andar fact(1)", run: function (c) { open(c, 2, true); out(c, 1, .3); } },
        { cap: "Sabse chhoti doll khulti nahi: base case! Yahan ruko: fact(1) = 1.", mood: "hint", code: "fact(1)   // base case: return 1", run: function (c) { c.to("bc", { o: 1, s: 1 }, { d: .5, delay: .2, ease: EASE_POP }); c.bump("d1", { from: 1, peak: 1.12, d: 450, delay: .2 }); } },
        { cap: "Ab jawab wapas aata hai: fact(1) ne 1 lauta diya aur wapas andar chali gayi.", mood: "cheer", code: "return 1;", run: function (c) {
          c.to("bc", { o: 0, s: .6 }, { d: .25 }); c.text("rc_t", "1");
          c.chain("rc", [[{ x: 288, y: 112, o: 1, s: 1 }, { d: .35, delay: .2 }], [{ x: 208, y: 132 }, { d: .8, delay: .3, ease: "ease-in-out" }]]);
          back(c, 1, 2, 1.1);
        } },
        { cap: "fact(2) = 2 * 1 = 2. Doll band hui, jawab aage fact(3) ko mila.", mood: "cheer", code: "return 2 * 1;   // 2", run: function (c) {
          open(c, 2, false); c.text("rc_t", "2");
          c.chain("rc", [[{ y: 100, s: 1.05 }, { d: .35, delay: .4 }], [{ x: 104, y: 112 }, { d: .8, delay: .1, ease: "ease-in-out" }]]);
          back(c, 2, 3, 1.5);
        } },
        { cap: "fact(3) = 3 * 2 = 6. Saari dolls band, jawab bahar!", mood: "celebrate", code: "return 3 * 2;   // 6", run: function (c) {
          open(c, 3, false); c.text("rc_t", "6");
          c.chain("rc", [[{ y: 60, s: 1.15, x: 104 }, { d: .6, delay: .35, ease: EASE_POP }]]); c.bump("d3", { from: 1, peak: 1.06, d: 500, delay: .1 });
        } },
        { cap: "Base case bhool gaye to dolls kabhi khatam nahi hongi: stack overflow!", mood: "oops", code: "fact(n) { /* base case nahi */ }", run: function (c) {
          c.to("rc", { o: 0, s: .5 }, { d: .25 });
          [3, 2, 1].forEach(function (n) { out(c, n, .1 * (3 - n)); open(c, n, true, .1 * (3 - n)); });
          c.to("dots", { o: 1 }, { d: .4, delay: .7 }); c.to("so", { o: 1, s: 1 }, { d: .5, delay: .4, ease: EASE_POP }); c.shake("so", { delay: .95, amp: 5 });
        } }
      ];
    })()
  });

  /* ================================================================= 9. how to solve a problem — the staircase */
  define("how-to-solve-a-problem", {
    title: "Problem solving: seedhi",
    label: "Animation: a big problem is a boulder that shrinks as a little climber goes up five steps: understand, example, plan, code, test. A bug is caught and fixed at the top.",
    build: function () {
      var s = RIB, i, F = ["fb", "fp", "ft", "fy", "fv"];
      s += '<rect class="ffloor" x="0" y="214" width="360" height="30"/>';
      for (i = 0; i < 5; i++) {
        var top = 190 - i * 24;
        s += '<rect data-k="sg' + i + '" class="o stair s' + i + '" x="' + (96 + i * 48) + '" y="' + top + '" width="48" height="' + (214 - top) + '"/><text data-k="sl' + i + '" class="tw stl" x="' + (120 + i * 48) + '" y="' + (top + 17) + '" text-anchor="middle">' + (i + 1) + '</text>';
      }
      s += '<g data-k="bd" class="sc-t"><path class="o fgrey" d="M-30 0 C-36 -20 -26 -42 -6 -44 C14 -48 34 -38 32 -16 C32 -8 28 -2 24 0 Z"/><path class="gloss" d="M-20 -30 Q-14 -38 -4 -38"/><text class="tc" x="1" y="-17" text-anchor="middle" style="font-size:11px">bada</text><text class="tc" x="1" y="-5" text-anchor="middle" style="font-size:10.5px">problem</text></g>';
      /* current-step card */
      s += '<g data-k="card" class="sc-t"><rect class="o fpaper" x="-93" y="-27" width="186" height="54" rx="12"/>' +
        '<g data-k="ic0" class="sc-t"><circle class="o fb" r="13" cx="-62"/><circle class="o-line" cx="-64" cy="-2" r="6" /><path class="o-line" d="M-60 3 l7 7"/></g>' +
        '<g data-k="ic1" class="sc-t"><rect class="o fy" x="-74" y="-12" width="24" height="24" rx="3"/><path class="o-line thin" d="M-69 -4 h14 M-69 2 h14 M-69 8 h8"/></g>' +
        '<g data-k="ic2" class="sc-t"><rect class="o ft" x="-74" y="-12" width="24" height="24" rx="5"/><path class="o-line" d="M-69 -3 l3 3 l5 -6 M-69 8 l3 3 l5 -6 M-56 -2 h4 M-56 9 h4"/></g>' +
        '<g data-k="ic3" class="sc-t"><rect class="fink-in o" x="-74" y="-12" width="24" height="24" rx="5"/><text class="tl sm" x="-62" y="5" text-anchor="middle">&lt;/&gt;</text></g>' +
        '<g data-k="ic4" class="sc-t"><circle class="o fred" r="12" cx="-62"/><ellipse class="fink" cx="-62" cy="1" rx="5" ry="6"/><path class="o-line thin" d="M-71 -2 h-3 M-71 5 h-3 M-53 -2 h3 M-53 5 h3"/></g>' +
        '<g data-k="ic5" class="sc-t"><circle class="o fy" r="12" cx="-62"/><text class="tc md" x="-62" y="5.5" text-anchor="middle">?</text></g>' +
        '<g data-k="ctg" class="sc-t"><text data-k="ct" class="tc md" x="-44" y="-4">Seedhi chadho</text><text data-k="cd" class="tw soft" x="-44" y="14" style="font-size:11px">ek ek paayedaan</text></g></g>';
      s += '<g data-k="flag" class="sc-t"><path class="o-line" d="M0 0 V-40"/><path class="o fred" d="M0 -40 L24 -32 L0 -24 Z"/></g>';
      s += '<g data-k="bug" class="sc-t"><ellipse class="o fred" rx="10" ry="8"/><path class="o-line thin" d="M-9 -3 l-5 -4 M-10 3 l-5 3 M9 -3 l5 -4 M10 3 l5 3 M-4 -7 l-3 -5 M4 -7 l3 -5"/><circle class="fink" cx="-3.5" cy="-1" r="1.6"/><circle class="fink" cx="3.5" cy="-1" r="1.6"/></g>';
      s += '<g data-k="cl" class="sc-t"><path class="o fs" d="M-11 -24 L-14 -36 L-3 -29 M11 -24 L14 -36 L3 -29"/><ellipse class="o fs" cx="0" cy="-14" rx="14" ry="14"/><circle class="fpaper" cx="-5.5" cy="-17" r="4.6"/><circle class="fpaper" cx="5.5" cy="-17" r="4.6"/><circle class="fink" cx="-5" cy="-17" r="2"/><circle class="fink" cx="6" cy="-17" r="2"/><path class="o fpaper" d="M-2 -12 h4 l-2 4 z"/><ellipse class="o fs" cx="-6" cy="0" rx="5" ry="2.5"/><ellipse class="o fs" cx="6" cy="0" rx="5" ry="2.5"/></g>';
      return s;
    },
    init: function (c) {
      c.to("bd", { x: 38, y: 214, s: .92 }, { now: true }); c.to("card", { x: 106, y: 76 }, { now: true });
      for (var i = 0; i < 6; i++) c.to("ic" + i, { o: i === 5 ? 1 : 0 }, { now: true });
      c.to("cl", { x: 86, y: 214 }, { now: true }); c.to("flag", { x: 331, y: 94, o: 0, sy: .1 }, { now: true }); c.to("bug", { x: 262, y: 80, o: 0, s: .4 }, { now: true });
    },
    steps: (function () {
      var T = [["1 · Samjho", "input aur output kya?", 0], ["2 · Example", "haath se ek example", 1], ["3 · Plan", "Hindi mein steps likho", 2], ["4 · Code", "plan ko code mein badlo", 3], ["5 · Test", "khaali, bada, edge case", 4], ["Solved!", "bug pakda, theek kiya", 4]];
      function card(c, j) {
        var t = T[j]; c.chain("ctg", [[{ o: 0 }, { d: .15 }], [{ o: 1 }, { d: .25 }]]);
        c.later(function () { c.text("ct", t[0]); c.text("cd", t[1]); }, 150);
        for (var i = 0; i < 6; i++) c.to("ic" + i, { o: i === t[2] ? 1 : 0 }, { d: .3 });
      }
      function climb(c, i, from) {
        var x = 120 + i * 48, y = 190 - i * 24, px = from < 0 ? 86 : 120 + from * 48, py = from < 0 ? 214 : 190 - from * 24;
        c.chain("cl", [[{ x: (x + px) / 2, y: Math.min(y, py) - 22 }, { d: .3, ease: "ease-out" }], [{ x: x, y: y }, { d: .3, ease: "ease-in" }]]);
        c.cls("sg" + i, "on"); c.cls("sl" + i, "on");
        c.to("bd", { s: [.82, .72, .62, .52, .42][i] }, { d: .5, delay: .4 });
        c.bump("cl", { from: 1.12, peak: .94, d: 350, delay: .55 });
      }
      return [
        { cap: "Problem solve karna = seedhi chadhna. Ek-ek paayedaan, koi chhalang nahi.", mood: "idle", code: "problem -> chhote steps -> code", run: function (c) { card(c, 0); c.later(function () { c.text("ct", "Seedhi chadho"); c.text("cd", "ek ek paayedaan"); }, 0); } },
        { cap: "Pehle problem apne shabdon mein bolo. Input kya hai, output kya?", mood: "think", code: "// input kya? output kya?", run: function (c) { card(c, 0); climb(c, 0, -1); } },
        { cap: "Chhota example haath se solve karo: [1, 2, 3] -> 6.", mood: "cheer", code: "sum([1, 2, 3])   // haath se: 6", run: function (c) { card(c, 1); climb(c, 1, 0); } },
        { cap: "Plan Hindi mein likho (pseudo-code): total = 0, har item jodo.", mood: "think", code: "total = 0; har item total mein jodo", run: function (c) { card(c, 2); climb(c, 2, 1); } },
        { cap: "Ab plan ko code mein badlo, ek-ek line.", mood: "cheer", code: "for (const n of nums) total += n;", run: function (c) { card(c, 3); climb(c, 3, 2); } },
        { cap: "Test karo: khaali list, bada input, edge case. Ek bug mila!", mood: "oops", code: "sum([])   // undefined?  bug!", run: function (c) {
          card(c, 4); climb(c, 4, 3); c.to("bug", { o: 1, s: 1 }, { d: .5, delay: .8, ease: EASE_POP }); c.bump("bug", { from: .6, peak: 1.2, d: 500, delay: .8 });
        } },
        { cap: "Bug pakda, theek kiya, flag laga diya. Chhote steps se bada problem bhi chadh jaata hai!", mood: "celebrate", code: "sum([])   // 0   fixed!", run: function (c) {
          card(c, 5); c.to("bug", { o: 0, s: .2, y: 94, sy: .1 }, { d: .4 });
          c.to("flag", { o: 1, sy: 1 }, { d: .6, delay: .4, ease: EASE_POP }); c.to("bd", { o: 0, s: .2 }, { d: .5 });
        } }
      ];
    })()
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
    if (root.Mascot) { mascot = root.Mascot.create({ size: opts.mascotSize || 76, mood: "idle" }); host.querySelector(".sc-mc").appendChild(mascot); }
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
      /* run several to() calls on one element one after another: chain(k, [[props, opts], ...]) */
      chain: function (k, list) {
        var t = 0;
        list.forEach(function (it) {
          var p = it[0], o = Object.assign({}, it[1]), d = o.d != null ? o.d : .55, dl = o.delay || 0;
          if (t === 0 && !dl) c.to(k, p, o);
          else { o.delay = 0; c.later(function () { c.to(k, p, o); }, (t + dl) * 1000); }
          t += dl + d;
        });
      },
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
