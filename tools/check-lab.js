// Validates the learning-platform data files. Usage: node tools/check-lab.js [lab|learn|decide]
// - Exercises: the reference `solution` must pass EVERY test (visible + hidden), the `starter` must NOT pass them all,
//   tests must be JSON-safe, hints = 3, ids unique.
// - Lessons: trace frames point at real code lines, predict answer is a valid option, exercise ids exist.
// - Scenarios: best is a valid option index, every option has pro and con.
// Missing files are skipped, so a file can be validated while the others are still being written.
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..", "js");
const only = process.argv[2];
let errors = 0, checked = 0;
const bad = (where, msg) => { errors++; console.log("  ✗ " + where + ": " + msg); };

function load(file, name) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return null;
  const sb = { window: {} }; vm.createContext(sb);
  try { vm.runInContext(fs.readFileSync(p, "utf8"), sb, { timeout: 2000 }); } catch (e) { bad(file, "does not parse/run: " + e.message); return null; }
  if (!Array.isArray(sb.window[name])) { bad(file, "window." + name + " must be an array"); return null; }
  return sb.window[name];
}
const isStr = (v, min = 1) => typeof v === "string" && v.trim().length >= min;
const jsonSafe = v => { try { return JSON.stringify(v) !== undefined && JSON.parse(JSON.stringify(v)) !== undefined; } catch (e) { return false; } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function runTests(code, fn, tests) {
  const results = [];
  for (const t of tests) {
    const sb = { out: null, err: null, args: JSON.parse(JSON.stringify(t.args)) }; vm.createContext(sb);
    try {
      vm.runInContext(code + "\n;try{ out = " + fn + "(...args); }catch(e){ err = String(e); }", sb, { timeout: 1500 });
      results.push(!sb.err && same(sb.out, t.expect));
    } catch (e) { results.push(false); }
  }
  return results;
}

const exIds = new Set();
if (!only || only === "lab") {
  const LAB = load("lab-data.js", "LAB");
  if (LAB) {
    console.log("lab-data.js: " + LAB.length + " exercises");
    LAB.forEach((x, i) => {
      const w = "exercise[" + i + "] " + (x && x.id);
      checked++;
      if (!x || !/^[a-z0-9-]+$/.test(x.id || "")) return bad(w, "id must be kebab-case");
      if (exIds.has(x.id)) bad(w, "duplicate id"); exIds.add(x.id);
      if (![1, 2, 3].includes(x.level)) bad(w, "level must be 1, 2 or 3");
      ["title", "topic", "prompt", "fn", "starter", "solution", "why"].forEach(k => { if (!isStr(x[k])) bad(w, "missing " + k); });
      if (!Array.isArray(x.approachQs) || x.approachQs.length < 3) bad(w, "approachQs needs >= 3 guiding questions");
      if (!Array.isArray(x.hints) || x.hints.length !== 3 || !x.hints.every(h => isStr(h, 10))) bad(w, "hints must be exactly 3 non-empty strings (nudge -> stronger -> almost code)");
      if (!Array.isArray(x.edge) || !x.edge.length) bad(w, "edge list missing");
      if (!Array.isArray(x.tests) || x.tests.length < 5) return bad(w, "needs >= 5 tests");
      if (!x.tests.some(t => t.hidden)) bad(w, "needs at least 1 hidden test");
      if (x.tests.filter(t => !t.hidden).length < 2) bad(w, "needs >= 2 visible tests");
      if (!x.tests.every(t => Array.isArray(t.args) && "expect" in t && jsonSafe(t))) return bad(w, "each test needs args[] and expect, JSON-safe");
      if (!new RegExp("function\\s+" + x.fn + "\\b|const\\s+" + x.fn + "\\s*=").test(x.solution || "")) bad(w, "solution must define " + x.fn);
      if (!new RegExp("function\\s+" + x.fn + "\\b|const\\s+" + x.fn + "\\s*=").test(x.starter || "")) bad(w, "starter must define " + x.fn);
      const sol = runTests(x.solution, x.fn, x.tests);
      sol.forEach((ok, n) => { if (!ok) bad(w, "reference solution FAILS test " + n + " " + JSON.stringify(x.tests[n])); });
      const st = runTests(x.starter, x.fn, x.tests);
      if (st.every(Boolean)) bad(w, "starter already passes all tests");
      if (/console\.log|prompt\(|alert\(/.test(x.solution)) bad(w, "solution should not print / prompt");
    });
  }
}

if (!only || only === "learn") {
  const LEARN = load("learn-data.js", "LEARN");
  const LAB = load("lab-data.js", "LAB");
  const ids = LAB ? new Set(LAB.map(x => x.id)) : null;
  if (LEARN) {
    console.log("learn-data.js: " + LEARN.length + " lessons");
    const seen = new Set();
    LEARN.forEach((x, i) => {
      const w = "lesson[" + i + "] " + (x && x.id); checked++;
      if (!x || !/^[a-z0-9-]+$/.test(x.id || "")) return bad(w, "id must be kebab-case");
      if (seen.has(x.id)) bad(w, "duplicate id"); seen.add(x.id);
      ["title", "goal", "why", "tryIt"].forEach(k => { if (!isStr(x[k])) bad(w, "missing " + k); });
      if (!Array.isArray(x.parts) || x.parts.length < 2 || !x.parts.every(p => isStr(p.h) && isStr(p.text, 20))) bad(w, "parts: >= 2 of {h, text}");
      if (!Array.isArray(x.code) || x.code.length < 3 || !x.code.every(l => typeof l === "string")) return bad(w, "code: array of >= 3 lines");
      if (!Array.isArray(x.frames) || x.frames.length < 4) return bad(w, "frames: >= 4 steps");
      x.frames.forEach((f, n) => {
        if (!Number.isInteger(f.l) || f.l < 0 || f.l >= x.code.length) bad(w, "frame " + n + ": l must be a valid 0-based line index");
        if (!f.v || typeof f.v !== "object" || Array.isArray(f.v)) bad(w, "frame " + n + ": v must be an object of variable -> value");
        if (!isStr(f.s, 8)) bad(w, "frame " + n + ": s (narration) missing");
      });
      const p = x.predict;
      if (!p || !isStr(p.q) || !Array.isArray(p.options) || p.options.length < 3 || !Number.isInteger(p.answer) || p.answer < 0 || p.answer >= p.options.length || !isStr(p.why)) bad(w, "predict: {q, options>=3, answer index, why}");
      if (!Array.isArray(x.exercises)) bad(w, "exercises must be an array of exercise ids");
      else if (ids) x.exercises.forEach(e => { if (!ids.has(e)) bad(w, "unknown exercise id " + e); });
      // tryIt must at least parse
      try { new vm.Script(x.tryIt || ""); } catch (e) { bad(w, "tryIt does not parse: " + e.message); }
    });
  }
}

if (!only || only === "decide") {
  const DEC = load("decide-data.js", "DECIDE");
  if (DEC) {
    console.log("decide-data.js: " + DEC.length + " scenarios");
    const seen = new Set();
    DEC.forEach((x, i) => {
      const w = "scenario[" + i + "] " + (x && x.id); checked++;
      if (!x || !/^[a-z0-9-]+$/.test(x.id || "")) return bad(w, "id must be kebab-case");
      if (seen.has(x.id)) bad(w, "duplicate id"); seen.add(x.id);
      ["title", "tag", "situation", "question", "why", "trap"].forEach(k => { if (!isStr(x[k])) bad(w, "missing " + k); });
      if (!Array.isArray(x.options) || x.options.length < 3 || x.options.length > 4 || !x.options.every(o => isStr(o.t) && isStr(o.pro) && isStr(o.con))) bad(w, "options: 3-4 of {t, pro, con}");
      else if (!Number.isInteger(x.best) || x.best < 0 || x.best >= x.options.length) bad(w, "best must be a valid option index");
      if (!Array.isArray(x.askFirst) || x.askFirst.length < 3) bad(w, "askFirst: >= 3 questions");
    });
  }
}

console.log(errors ? "\n" + errors + " problem(s) in " + checked + " item(s)" : "\nOK — " + checked + " item(s) valid");
process.exit(errors ? 1 : 0);
