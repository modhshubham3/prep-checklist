// Builds js/answers.js from content/answers/*.md (read in filename order).
//
//   node tools/build-answers.js
//
// Markdown shape, per question:
//   # Group title
//   ## Question            (the text ticks are keyed on — rename = fresh tick)
//   Plain paragraphs       blank line between paragraphs; `code` and **bold** work
//   | a | b |              a table; first row is the header
//   - point                bullet list of key points (shown after the paragraphs)
//   1. step                numbered step — its own paragraph, stays in order
//     - sub-point          indented bullet — its own "•" paragraph, stays in order
//   ```lang ... ```        code example(s), shown inside the answer
//   ```lang q ... ```      code that belongs to the QUESTION — always visible,
//                          so "predict the output" cards work
//   ? text                 how an interviewer would ask it — practice mode shows
//                          this instead of a bare title like "CLR"
//   ! text                 the interview trap / common wrong answer
//   > text                 memory hook ("Yaad rakho")
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dir = path.join(root, "content/answers");
const lines = fs.readdirSync(dir).filter(f => f.endsWith(".md")).sort()
  .map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n").split(/\r?\n/);

const groups = [];
let g = null, it = null, para = [], code = null, codeBuf = [];
// it.o records the reading order of paragraphs ("p"), the table ("t") and runs
// of bullets (["u", n]) so the page can show them as written.
const flushPara = () => { if (para.length && it) { it.a.push(para.join(" ")); it.o.push("p"); } para = []; };
const markTable = () => { if (it.o[it.o.length - 1] !== "t" && !it.o.includes("t")) it.o.push("t"); };
const markBullet = () => {
  const last = it.o[it.o.length - 1];
  if (Array.isArray(last)) last[1]++; else it.o.push(["u", 1]);
};

for (const raw of lines) {
  const line = raw.replace(/\s+$/, "");
  if (code !== null) {                       // inside a fenced block
    if (/^```/.test(line)) {
      const body = codeBuf.join("\n");
      if (/(^|\s)q$/.test(code.trim())) it.qcode = body; else it.ex.push(body);
      code = null; codeBuf = [];
    }
    else codeBuf.push(raw);
    continue;
  }
  if (/^# /.test(line)) { flushPara(); g = { g: line.slice(2).trim(), items: [] }; groups.push(g); it = null; continue; }
  if (/^## /.test(line)) {
    flushPara();
    if (!g) throw new Error("question before any group: " + line);
    it = { q: line.slice(3).trim(), a: [], pts: [], ex: [], rows: [], o: [] };
    g.items.push(it);
    continue;
  }
  if (!it) continue;
  if (/^```/.test(line)) { flushPara(); code = line.slice(3); continue; }
  if (/^\|/.test(line)) {
    flushPara();
    const cells = line.replace(/^\||\|$/g, "").split("|").map(s => s.trim());
    if (!cells.every(c => /^:?-+:?$/.test(c))) it.rows.push(cells);
    markTable();
    continue;
  }
  if (/^- /.test(line)) { flushPara(); it.pts.push(line.slice(2).trim()); markBullet(); continue; }
  if (/^\? /.test(line)) { flushPara(); it.pq = line.slice(2).trim(); continue; }
  if (/^! /.test(line)) { flushPara(); it.trap = line.slice(2).trim(); continue; }
  if (/^> /.test(line)) { flushPara(); it.h = line.slice(2).trim(); continue; }
  if (line === "") { flushPara(); continue; }
  if (/^\d+\. /.test(line)) flushPara();   // numbered step: its own paragraph, keeps flow
  if (/^\s+- /.test(line)) {                // sub-point under a step: its own paragraph, stays in place
    flushPara(); para.push("• " + line.trim().slice(2)); flushPara(); continue;
  }
  para.push(line.trim());
}
flushPara();
if (code !== null) throw new Error("unclosed code block in: " + (it && it.q));

// Shape for the page, dropping empty fields.
const out = groups.map(gr => ({
  g: gr.g,
  items: gr.items.map(x => {
    const o = { q: x.q };
    if (x.pq) o.pq = x.pq;
    if (x.a.length) o.a = x.a;
    if (x.rows.length) o.t = { h: x.rows[0], r: x.rows.slice(1) };
    if (x.pts.length) o.pts = x.pts;
    if (x.qcode) o.qc = x.qcode;
    if (x.ex.length) o.ex = x.ex.join("\n\n");
    if (x.trap) o.trap = x.trap;
    if (x.h) o.h = x.h;
    // Only ship the order when it isn't the default (paragraphs, table, bullets).
    const kinds = x.o.map(k => (Array.isArray(k) ? "u" : k)).join("");
    if (!/^p*t?u?$/.test(kinds)) o.o = x.o;
    return o;
  }),
}));

// Guard rails: every question needs an answer, and question text must be unique.
const seen = new Map(), problems = [];
out.forEach(gr => gr.items.forEach(x => {
  if (!x.a && !x.t && !x.pts) problems.push("no answer: " + x.q);
  if (seen.has(x.q)) problems.push("duplicate question: " + x.q);
  seen.set(x.q, true);
}));
// Study plan (content/plan.json): sessions that point at questions by their
// exact text, so a renamed question has to be fixed here too.
const plan = JSON.parse(fs.readFileSync(path.join(root, "content/plan.json"), "utf8"));
plan.forEach((s, i) => [...s.learn, ...s.farak].forEach(q => {
  if (!seen.has(q)) problems.push(`plan session ${i + 1} (${s.t}): no such question: ${q}`);
}));

if (problems.length) { console.error(problems.join("\n")); process.exit(1); }

fs.writeFileSync(path.join(root, "js/answers.js"),
  "// GENERATED from content/answers/*.md and content/plan.json by\n" +
  "// tools/build-answers.js — edit those and re-run `node tools/build-answers.js`.\n" +
  "const CHEAT2 = " + JSON.stringify(out) + ";\n" +
  "const PLAN = " + JSON.stringify(plan) + ";\n");

const n = out.reduce((s, gr) => s + gr.items.length, 0);
const words = out.reduce((s, gr) => s + gr.items.reduce((t, x) => t + (x.a || []).join(" ").split(/\s+/).length, 0), 0);
console.log(`js/answers.js: ${out.length} groups, ${n} questions, ~${words} words of explanation`);
