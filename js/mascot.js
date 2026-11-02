/* Boltu — the robo-owl teacher.
   Hand-built inline SVG, no libraries. All looks live in css/mascot.css (selectors keyed on [data-mood]).

     const m = Mascot.create({ size: 96, mood: "idle" });   // -> <div class="mc">
     host.appendChild(m);
     m.setMood("cheer");                                     // idle think cheer oops hint sleepy celebrate
     Mascot.say(m, "Namaste! Chalo seekhein.", { ms: 24 });  // speech bubble that types itself out
     m.destroy();                                            // clears every timer / animation
*/
(function (root) {
  "use strict";

  var MOODS = ["idle", "think", "cheer", "oops", "hint", "sleepy", "celebrate"];
  var GLYPH = { idle: "{ }", think: "...", cheer: ":D", oops: "!?", hint: "Aha", sleepy: "zzz", celebrate: "\\o/" };
  var uid = 0;

  function reduced() {
    try { return !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }

  /* One eye: sclera, pupil (look-around + mood offset), eyelid (blink), ring, and a "happy" arc used by cheer/celebrate. */
  function eye(side, cx, id) {
    return '' +
      '<g class="mc-eye mc-eye-' + side + '">' +
        '<circle class="mc-sclera" cx="' + cx + '" cy="102" r="19"/>' +
        '<g class="mc-look"><g class="mc-pupil" style="transform-origin:' + cx + 'px 102px">' +
          '<circle class="mc-iris" cx="' + cx + '" cy="102" r="10.5"/>' +
          '<circle class="mc-shine" cx="' + (cx - 3.6) + '" cy="98.2" r="3.6"/>' +
          '<circle class="mc-shine" cx="' + (cx + 3.6) + '" cy="106.4" r="1.7"/>' +
        '</g></g>' +
        '<g clip-path="url(#' + id + '-c' + side + ')"><g class="mc-lid"><g class="mc-blink">' +
          '<rect class="mc-lidfill" x="' + (cx - 21) + '" y="81" width="42" height="42"/>' +
          '<path class="mc-lash" d="M' + (cx - 21) + ' 123 H' + (cx + 21) + '"/>' +
        '</g></g></g>' +
        '<circle class="mc-ring" cx="' + cx + '" cy="102" r="19"/>' +
        '<path class="mc-happy" d="M' + (cx - 13) + ' 109 Q' + cx + ' 88 ' + (cx + 13) + ' 109"/>' +
      '</g>';
  }

  function markup(id) {
    return '' +
    '<svg class="mc-svg" viewBox="0 0 200 204" focusable="false" aria-hidden="true">' +
      '<defs>' +
        '<clipPath id="' + id + '-cl"><circle cx="74" cy="102" r="17.6"/></clipPath>' +
        '<clipPath id="' + id + '-cr"><circle cx="126" cy="102" r="17.6"/></clipPath>' +
      '</defs>' +
      '<ellipse class="mc-shadow" cx="100" cy="197" rx="54" ry="5.5"/>' +
      '<g class="mc-bob"><g class="mc-tilt"><g class="mc-breathe">' +
        /* feet */
        '<g class="mc-feet">' +
          '<path class="mc-foot" d="M62 190 q0 -9 16 -9 q16 0 16 9 q0 7 -16 7 q-16 0 -16 -7z"/>' +
          '<path class="mc-foot" d="M106 190 q0 -9 16 -9 q16 0 16 9 q0 7 -16 7 q-16 0 -16 -7z"/>' +
        '</g>' +
        /* antenna */
        '<line class="mc-stem" x1="100" y1="50" x2="100" y2="26"/>' +
        '<g class="mc-bulbg">' +
          '<circle class="mc-halo" cx="100" cy="17" r="15"/>' +
          '<circle class="mc-bulb" cx="100" cy="17" r="8.5"/>' +
          '<circle class="mc-bulb-shine" cx="97.3" cy="14.3" r="2.3"/>' +
        '</g>' +
        '<g class="mc-rays">' +
          '<path d="M100 -6 V-13 M120 1 l6 -5 M80 1 l-6 -5 M127 17 h8 M73 17 h-8"/>' +
        '</g>' +
        /* ear tufts */
        '<path class="mc-tuft" d="M48 74 L40 38 Q41 34 45 36 L80 54 Z"/>' +
        '<path class="mc-tuft" d="M152 74 L160 38 Q159 34 155 36 L120 54 Z"/>' +
        /* body */
        '<path class="mc-body" d="M100 44 C134 44 161 62 165 102 C169 144 157 187 100 187 C43 187 31 144 35 102 C39 62 66 44 100 44 Z"/>' +
        '<path class="mc-hilite" d="M58 70 C66 58 82 52 94 52"/>' +
        '<ellipse class="mc-belly" cx="100" cy="168" rx="41" ry="19"/>' +
        /* facial disc */
        '<circle class="mc-disc" cx="74" cy="102" r="31"/>' +
        '<circle class="mc-disc" cx="126" cy="102" r="31"/>' +
        '<ellipse class="mc-disc" cx="100" cy="118" rx="25" ry="25"/>' +
        '<ellipse class="mc-cheek" cx="56" cy="124" rx="8" ry="4.6"/>' +
        '<ellipse class="mc-cheek" cx="144" cy="124" rx="8" ry="4.6"/>' +
        eye("l", 74, id) + eye("r", 126, id) +
        '<path class="mc-beak mc-beak-talk" d="M92.5 105 Q100 102 107.5 105 L100 123 Z"/>' +
        /* mouths — one is visible per mood */
        '<g class="mc-mouths">' +
          '<path class="mc-m mc-m-smile" d="M89 130 Q100 142 111 130"/>' +
          '<path class="mc-m mc-m-flat" d="M91 135 Q97 131 103 135 T111 133"/>' +
          '<g class="mc-m mc-m-open"><path class="mc-mouth-in" d="M87 128 H113 Q113 148 100 148 Q87 148 87 128 Z"/><ellipse class="mc-tongue" cx="100" cy="143" rx="7" ry="4"/></g>' +
          '<path class="mc-m mc-m-frown" d="M90 140 Q100 129 110 140"/>' +
          '<ellipse class="mc-m mc-m-o" cx="100" cy="134" rx="4.6" ry="5.4"/>' +
        '</g>' +
        /* brows */
        '<path class="mc-brow mc-brow-l" d="M59 78 Q73 70 88 77"/>' +
        '<path class="mc-brow mc-brow-r" d="M112 77 Q127 70 141 78"/>' +
        /* chest screen */
        '<rect class="mc-screen" x="75" y="154" width="50" height="25" rx="8"/>' +
        '<text class="mc-glyph" x="100" y="171.5" text-anchor="middle">' + GLYPH.idle + '</text>' +
        /* wings (in front, so they can hold the chin / wave) */
        '<g class="mc-wing mc-wing-l" style="transform-origin:42px 100px"><g class="mc-sway mc-sway-l" style="transform-origin:42px 100px">' +
          '<path class="mc-wingp" d="M42 94 C20 98 12 140 27 162 C41 152 50 124 46 97 Z"/>' +
          '<path class="mc-wingl" d="M27 128 q8 -6 14 -4 M26 140 q9 -6 15 -4"/>' +
        '</g></g>' +
        '<g class="mc-wing mc-wing-r" style="transform-origin:158px 100px"><g class="mc-sway mc-sway-r" style="transform-origin:158px 100px">' +
          '<path class="mc-wingp" d="M158 94 C180 98 188 140 173 162 C159 152 150 124 154 97 Z"/>' +
          '<path class="mc-wingl" d="M173 128 q-8 -6 -14 -4 M174 140 q-9 -6 -15 -4"/>' +
        '</g></g>' +
      '</g></g></g>' +
      /* effects — shown per mood by CSS */
      '<g class="mc-fx">' +
        '<g class="mc-fx-think">' +
          '<circle class="mc-tdot t1" cx="160" cy="60" r="3"/><circle class="mc-tdot t2" cx="170" cy="46" r="4.6"/>' +
          '<g class="mc-tbub"><ellipse cx="180" cy="22" rx="17" ry="14"/><text x="180" y="29" text-anchor="middle">?</text></g>' +
        '</g>' +
        '<g class="mc-fx-oops"><path class="mc-sweat" d="M152 72 q-7 11 0 15 q7 -4 0 -15 z"/></g>' +
        '<g class="mc-fx-sleepy"><text class="mc-z z1" x="150" y="48">z</text><text class="mc-z z2" x="162" y="34">Z</text><text class="mc-z z3" x="176" y="18">Z</text></g>' +
        '<g class="mc-fx-spark">' +
          '<path class="mc-sp s1" d="M26 56 l3 -9 l3 9 l9 3 l-9 3 l-3 9 l-3 -9 l-9 -3z"/>' +
          '<path class="mc-sp s2" d="M176 82 l2.4 -7 l2.4 7 l7 2.4 l-7 2.4 l-2.4 7 l-2.4 -7 l-7 -2.4z"/>' +
          '<path class="mc-sp s3" d="M16 124 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2z"/>' +
        '</g>' +
      '</g>' +
    '</svg>';
  }

  /* ------------------------------------------------------------------ create */
  function create(opts) {
    opts = opts || {};
    var size = Math.max(32, +opts.size || 96);
    var id = "mc" + (++uid);
    var el = document.createElement("div");
    el.className = "mc";
    el.style.width = size + "px";
    el.style.height = Math.round(size * 204 / 200) + "px";
    el.style.setProperty("--mc-u", (size / 100).toFixed(3));           // 1 unit = 1% of the width, used by CSS for stroke tuning
    el.style.setProperty("--mc-d", "-" + (Math.random() * 6).toFixed(2) + "s"); // desync blinking between mascots
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", opts.label || "Boltu, robo-ullu teacher");
    if (size < 80) el.classList.add("mc-small");
    el.innerHTML = markup(id);
    el._timers = []; el._anims = []; el._tok = 0;
    var glyph = el.querySelector(".mc-glyph");

    el.setMood = function (m) {
      if (MOODS.indexOf(m) < 0) m = "idle";
      var changed = el.getAttribute("data-mood") !== m;
      el.setAttribute("data-mood", m);
      glyph.textContent = GLYPH[m];
      if (changed || m === "celebrate") bump(el, m);
      if (m === "celebrate") confetti(el);
      return el;
    };
    el.getMood = function () { return el.getAttribute("data-mood"); };
    el.say = function (t, o) { return say(el, t, o); };
    el.destroy = function () { destroy(el); };
    el.setAttribute("data-mood", "idle");
    el.setMood(opts.mood || "idle");
    return el;
  }

  /* little squash-and-stretch on every mood change (WAAPI on the host so it can't fight the CSS loops) */
  function bump(el, m) {
    if (reduced() || !el.animate) return;
    var a = el.animate(
      m === "oops"
        ? [{ transform: "scale(1)" }, { transform: "scale(.94,1.05)" }, { transform: "scale(1.03,.97)" }, { transform: "scale(1)" }]
        : [{ transform: "scale(1)" }, { transform: "scale(1.1,.9)", offset: .25 }, { transform: "scale(.94,1.1)", offset: .55 }, { transform: "scale(1)" }],
      { duration: 420, easing: "ease-out" });
    el._anims.push(a);
  }

  function confetti(el) {
    if (reduced() || !el.animate) return;
    var u = el.offsetWidth || 96, n = u < 80 ? 14 : 26;
    var box = el._conf;
    if (!box) { box = el._conf = document.createElement("div"); box.className = "mc-conf"; el.appendChild(box); }
    var cols = ["#ff6a5e", "#ffd24a", "#4fe3c1", "#6aa3ff", "#ff8fb1", "#b69cff"];
    for (var i = 0; i < n; i++) {
      var p = document.createElement("i");
      var w = (0.045 + Math.random() * 0.04) * u;
      p.style.cssText = "width:" + w.toFixed(1) + "px;height:" + (w * (Math.random() < .5 ? 1 : 2.1)).toFixed(1) + "px;background:" + cols[i % cols.length] + (Math.random() < .3 ? ";border-radius:50%" : "");
      box.appendChild(p);
      var ang = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.25, v = (0.5 + Math.random() * 0.75) * u;
      var dx = Math.cos(ang) * v, dy = Math.sin(ang) * v, fall = (0.55 + Math.random() * 0.6) * u, rot = (Math.random() - .5) * 900;
      var a = p.animate([
        { transform: "translate(0,0) rotate(0)", opacity: 1 },
        { transform: "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) rotate(" + (rot / 2).toFixed(0) + "deg)", opacity: 1, offset: .45 },
        { transform: "translate(" + (dx * 1.25).toFixed(1) + "px," + (dy + fall).toFixed(1) + "px) rotate(" + rot.toFixed(0) + "deg)", opacity: 0 }
      ], { duration: 1000 + Math.random() * 700, easing: "cubic-bezier(.2,.7,.4,1)", delay: Math.random() * 120, fill: "both" });
      (function (node, anim) {
        el._anims.push(anim);
        anim.onfinish = function () { if (node.parentNode) node.parentNode.removeChild(node); var k = el._anims.indexOf(anim); if (k >= 0) el._anims.splice(k, 1); };
      })(p, a);
    }
  }

  /* ------------------------------------------------------------------ speech bubble */
  function say(el, text, o) {
    o = o || {};
    var host = o.into || el;
    var b = el._bubble;
    if (!b) {
      b = el._bubble = document.createElement("div");
      b.className = "mc-bubble";
      b.innerHTML = '<span class="mc-sr" role="status"></span><span class="mc-bt" aria-hidden="true"><span class="mc-typed"></span><span class="mc-rest"></span></span>';
      b._typed = b.querySelector(".mc-typed"); b._rest = b.querySelector(".mc-rest"); b._sr = b.querySelector(".mc-sr");
    }
    if (b.parentNode !== host) host.appendChild(b);
    b.classList.toggle("mc-float", host === el);
    b.setAttribute("data-side", o.side || (host === el ? "top" : "left"));
    el._tok++; var tok = el._tok;
    clearTimeout(b._hide); clearTimeout(b._tick);
    el.classList.remove("mc-talk");
    text = text == null ? "" : String(text);
    if (!text) { b.classList.remove("on"); b._typed.textContent = ""; b._rest.textContent = ""; b._sr.textContent = ""; return Promise.resolve(); }

    b._sr.textContent = text;
    b.classList.add("on");
    var per = o.ms == null ? 24 : +o.ms;
    if (per <= 0 || reduced()) { b._typed.textContent = text; b._rest.textContent = ""; scheduleHide(); return Promise.resolve(); }
    b._typed.textContent = ""; b._rest.textContent = text;
    el.classList.add("mc-talk");
    var i = 0, step = text.length > 90 ? 2 : 1;
    return new Promise(function (res) {
      function tick() {
        if (tok !== el._tok) return res();
        i = Math.min(text.length, i + step);
        b._typed.textContent = text.slice(0, i);
        b._rest.textContent = text.slice(i);
        if (i >= text.length) { el.classList.remove("mc-talk"); scheduleHide(); return res(); }
        var ch = text.charAt(i - 1), pause = /[.!?]/.test(ch) ? per * 6 : /[,:;]/.test(ch) ? per * 3 : per;
        b._tick = setTimeout(tick, pause);
      }
      b._tick = setTimeout(tick, per);
      el._timers.push(b);
    });
    function scheduleHide() { if (o.hold > 0) b._hide = setTimeout(function () { b.classList.remove("on"); }, o.hold); }
  }

  function destroy(el) {
    el._tok++;
    if (el._bubble) { clearTimeout(el._bubble._tick); clearTimeout(el._bubble._hide); if (el._bubble.parentNode) el._bubble.parentNode.removeChild(el._bubble); el._bubble = null; }
    el._anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    el._anims.length = 0; el._timers.length = 0;
    if (el._conf && el._conf.parentNode) el._conf.parentNode.removeChild(el._conf);
    el._conf = null;
    if (el.parentNode) el.parentNode.removeChild(el);
  }

  root.Mascot = { create: create, say: say, moods: MOODS.slice(), reducedMotion: reduced };
})(window);
