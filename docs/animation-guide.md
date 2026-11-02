# Boltu + concept scenes: integration guide

Files (all new, nothing existing is edited):

| File | Role |
| --- | --- |
| `js/mascot.js` | `window.Mascot`: Boltu the robo-ullu (inline SVG, 7 moods, speech bubble) |
| `js/scenes.js` | `window.Scenes`: one metaphor animation per lesson (9 scenes, 7-8 steps each) |
| `css/mascot.css` | every style and keyframe for both |
| `preview-mascot.html` | standalone test page (`python3 -m http.server 8123`, open `/preview-mascot.html`) |

No build step, no libraries. Plain scripts, load order does not matter except that `mascot.js` must be loaded before the scenes are *played* (scenes fall back to a plain text caption if `Mascot` is missing).

## 1. Hook it up

```html
<link rel="stylesheet" href="css/mascot.css">   <!-- after skin.css so it sees --saffron, --ink, ... -->
<script src="js/mascot.js"></script>
<script src="js/scenes.js"></script>
```

In `learn.js`, inside `detail()`, add a container above the code player (the concept animation comes first, the line-by-line trace stays as it is):

```js
const sceneBox = el("div", "pbox scene-box");
root.insertBefore(sceneBox, why.nextSibling);          // or wherever it fits
let sc = null;
if (window.Scenes && Scenes.has(l.id)) {
  sc = Scenes.play(l.id, sceneBox, { onStep: (i, s) => { scrub.value = i; label.textContent = `${i + 1} / ${s.total}`; } });
  scrub.max = sc.steps.length - 1;                    // an <input type=range> you own
  scrub.oninput = () => { sc.pause(); sc.seek(+scrub.value); };
  playBtn.onclick = () => sc.playing ? sc.pause() : sc.play();
  sc.onEnd = () => { /* flip the play icon back */ };
}
root._cleanup = () => { stop(); sc && sc.destroy(); };   // learn.js already calls root._cleanup on route change
```

Scene ids equal lesson ids: `variables-and-types conditions loops arrays strings functions objects-and-maps recursion how-to-solve-a-problem`.

## 2. API

### `Mascot`
```js
const m = Mascot.create({ size: 96, mood: "idle", label: "Boltu" });   // -> <div class="mc"> (size = width in px)
host.appendChild(m);
m.setMood("cheer");        // idle | think | cheer | oops | hint | sleepy | celebrate  (celebrate also fires confetti, every call)
Mascot.say(m, "Namaste!", { ms: 24, hold: 0, into: bubbleHost, side: "top|left|right" });  // returns a Promise (resolves when typed)
Mascot.say(m, "");         // hide the bubble
m.destroy();               // clears timers + animations, removes the element
Mascot.moods               // ["idle", ...]
```
- `ms` = delay per character (default 24; `0` = instant). Punctuation pauses a little. While typing the beak flaps.
- Without `into` the bubble floats above the mascot (`position:absolute`, max 230px). With `into` it is placed in flow inside that element with the tail pointing at the mascot (that is what scenes do: mascot on the left, bubble on the right).
- The bubble always reserves its final size (the untyped text is rendered invisibly), so layout never jumps while typing.
- Colours come from `--saffron`, `--saffron2`, `--miss` with fallbacks. Override per instance with `--mc-body-o` / `--mc-dark-o`.

### `Scenes`
```js
const ctl = Scenes.play(lessonId, containerEl, { onStep, onEnd, autoplay: false, mascotSize: 76, typeMs: 16 });
ctl.steps        // [{ caption, mood, code }]  (what you would put on a scrubber)
ctl.index        // current step, 0-based
ctl.play()  ctl.pause()  ctl.toggle()
ctl.step(d=1)    // relative, ctl.step(-1) goes back
ctl.seek(i)      // absolute; any step is reachable from any step
ctl.reset()      // back to step 0 (keeps playing if it was playing)
ctl.setSpeed(x)  // 0.25 .. 4, only changes the dwell time per step
ctl.onStep = (i, {index, total, caption, mood, code}) => {}
ctl.onEnd  = () => {}          // fires when autoplay reaches the last step
ctl.destroy()                  // stops timers, cancels animations, removes the DOM; safe to call twice
Scenes.list()  Scenes.has(id)  Scenes.ids
```
`play()` on a container that already hosts a scene destroys the old one. `play()` from the last step restarts from step 0. The first step is shown immediately (with a small entrance animation).

What `Scenes.play` renders into the container: a `div.sc[role=group][aria-label]` with the SVG stage (`role=img`, labelled), the mascot, the caption bubble, and a visually hidden `aria-live=polite` line (`Step 3 of 7: ...`). The visible bubble is `aria-hidden` while typing so screen readers do not hear it letter by letter.

### Authoring a new scene
```js
define("my-scene", {
  title, label,                         // label = aria text
  build(){ return RIB + '<g data-k="ball" class="sc-t">...</g>'; },  // SVG string; RIB is the code strip at the top
  init(c){ c.to("ball", { x: 40, y: 150, o: 0 }, { now: true }); },  // starting state (instant)
  steps: [{ cap: "Hinglish caption", mood: "cheer", code: "let x = 1;", run(c){ c.to("ball", { o: 1, x: 120 }, { d: .6 }); } }]
});
```
Rules that keep it robust:
- Every moving thing is `data-k="name"`, drawn around its own pivot at (0,0), positioned only through `c.to(name, {x,y,r,s|sx,sy,o}, {d, delay, ease, now})`. Steps state *deltas*; seeking replays steps `0..n` from the snapshot of `init`, so there is nothing to undo.
- Helpers: `c.to`, `c.chain` (sequence on one element), `c.follow` (travel along a `<path data-p>`), `c.bump`, `c.shake`, `c.cls`, `c.text`, `c.later` (runs immediately when not animating), `c.code`. Do not call `c.to` twice on one element in the same step expecting two phases; use `c.chain`.
- Text you change must be a `<text data-k>`, not the group that contains a shape.

## 3. Design rationale: one metaphor per concept

Rule of thumb: the metaphor must make the *one thing that goes wrong for beginners* visible. Every scene also shows the real code line in the top strip, so the picture is tied to syntax.

| Lesson | Metaphor | The idea it carries (and the beginner bug it prevents) |
| --- | --- | --- |
| variables-and-types | Jars on a shelf with name stickers | A variable is a *named container*; `let` jar can be refilled, `const` jar gets a padlock and a bounced re-assignment shows the error; `"5"` in quotes is a pink *string* chip, `5` is a blue number chip (colour = type, so `"5" + 3` stops being a surprise) |
| conditions | Fork in the road with a signpost and gates | The condition is asked *once*, the answer (TRUE/FALSE) opens exactly one gate. Second ball with a false answer shows `else`. "Only one road" is the take-away |
| loops | Conveyor belt under a stamp, counter board with a lamp | Loop = same body, repeated while the check passes. The `i` counter ticking 0,1,2, the green lamp turning red at `3 < 3`, and the belt stopping show *why* it stops (the thing people guess wrong) |
| arrays | Numbered lockers | Index = locker number, starting at 0 (plates pulse). `a[4]` points at a dashed ghost slot = `undefined`; `a[length-1]` is the last locker. `push` makes a new locker appear |
| strings | Letter tiles on a thread | Same indexing as arrays, plus **immutability**: `s[0] = "p"` bounces off, `+` and `toUpperCase()` build a *second* thread and the first stays unchanged |
| functions | Machine with two funnels, gears, an output chute and a tray | arguments in, body runs, `return` out; the result lands in a variable jar; same machine reused with new input; no `return` gives a grey `undefined` chip |
| objects-and-maps | Key-tag board (tag on the left, value card on the right) | Look up by *name*, not position. Add a key = new tag, assign again = same tag new value, missing key = dashed empty tag `undefined`, `Object.keys` = the list of tags |
| recursion | Nested Russian dolls | Opening = the call, smaller doll = smaller problem (`n-1`), the solid smallest doll = **base case**, the answer travels back out and each doll closes (the call stack unwinding). Last step removes the base case: dolls never stop = stack overflow |
| how-to-solve-a-problem | A boulder shrinking as a climber takes five stairs | Understand, example, plan, code, test: each stair is a small step, the "big problem" boulder gets smaller as you climb, the test step finds a bug, fixing it plants the flag. Teaches *process*, not syntax |

Mascot moods are tied to the narrative beat, not decoration: `idle` intro, `think` while something is being computed or waited on, `hint` when the key idea appears (bulb lights), `cheer` when something works, `oops` for the error/edge case, `celebrate` (confetti) only on the closing step. `sleepy` is for idle screens or "come back tomorrow" states and is not used inside scenes.

### What NOT to animate
- Do not animate everything at once: one thing moves per beat, the rest is still. Captions are written for a reader, so motion never carries information that the caption does not.
- No decorative loops inside scenes (no floating particles, no bouncing backgrounds). The only continuous motion is *meaningful* (belt moving while parcels move, gears while the body runs).
- No timing-critical interactions: the learner can scrub, so each step is a state, never a race.
- Do not use motion for correct/incorrect feedback on the predict-first quiz; that stays text plus colour so it is accessible and calm.
- Do not replace the line-by-line trace. The scene is the *why*, the trace is the *how it runs*.
- No layout properties are animated (only `transform` and `opacity`), no filters, no blur.

## 4. Accessibility and motion
- `prefers-reduced-motion: reduce`: all CSS animations and transitions are removed, WAAPI paths/bumps/typing/confetti are skipped. The scene still steps (each step jumps to its final state) and the mascot keeps its static pose per mood.
- Text is never inside an image: captions are real text, SVG labels are real `<text>`, scene container and SVG have `aria-label`s, and the step change is announced through the polite live region.
- Touch targets are your player's responsibility (the preview uses 40px+ buttons).
- Dark and light: scene art has its own palette keyed on `html[data-theme]` (and `prefers-color-scheme` when no attribute is set). Pastel fills with dark outlines and dark text on chips, so contrast holds in both themes.

## 5. Performance notes
- Only `transform` and `opacity` change during a step. The few other changes (`fill` on stairs/lamps, text content) are tiny and one-off.
- `will-change` is limited to scene elements, not the whole page. Mascot loops are CSS keyframes on `transform` only.
- `destroy()` clears the autoplay timer, every step timer, and cancels all WAAPI animations (the preview test confirms 0 pending timers and 0 running animations afterwards).
- Several controllers on one page are fine (the preview runs all nine).
