// Builds a print-ready HTML of every answer card (full version), grouped,
// with a clickable index — then print it to PDF with headless Chrome/Edge:
//
//   node tools/print.js out/answers.html
//   chrome --headless --no-pdf-header-footer --print-to-pdf=out/answers.pdf out/answers.html
//
// Reads js/answers.js (so run tools/build-answers.js first) and the
// cheatsheet from js/data.js as a quick-revision appendix.
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const load = (file, name) => new Function(fs.readFileSync(path.join(root, file), "utf8") + ";return " + name)();
const CHEAT2 = load("js/answers.js", "CHEAT2");
const CHEAT = load("js/data.js", "CHEAT");

const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inl = t => esc(t).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");

// Same reading order as the site: paragraphs, table and bullet runs as written.
function body(it){
  const paras = it.a || [];
  let h = "";
  const table = () => {
    h += "<table><tr>" + it.t.h.map(x => `<th>${inl(x)}</th>`).join("") + "</tr>" +
      it.t.r.map(r => "<tr>" + r.map(x => `<td>${inl(x)}</td>`).join("") + "</tr>").join("") + "</table>";
  };
  const bullets = list => { h += "<ul>" + list.map(p => `<li>${inl(p)}</li>`).join("") + "</ul>"; };
  if(it.o){
    let pi = 0, bi = 0;
    it.o.forEach(k => {
      if(k === "p") h += `<p>${inl(paras[pi++])}</p>`;
      else if(k === "t") table();
      else { bullets(it.pts.slice(bi, bi + k[1])); bi += k[1]; }
    });
  } else {
    paras.forEach(p => { h += `<p>${inl(p)}</p>`; });
    if(it.t) table();
    if(it.pts) bullets(it.pts);
  }
  if(it.ex) h += `<pre>${esc(it.ex)}</pre>`;
  if(it.trap) h += `<p class="trap"><b>Interview trap:</b> ${inl(it.trap)}</p>`;
  if(it.h) h += `<p class="hook"><b>Yaad rakho:</b> ${inl(it.h)}</p>`;
  return h;
}

let n = 0;
const total = CHEAT2.reduce((s, g) => s + g.items.length, 0);
const toc = CHEAT2.map((g, gi) => `<li><a href="#g${gi}">${esc(g.g)}</a> <span>${g.items.length}</span></li>`).join("");
const groups = CHEAT2.map((g, gi) => {
  const cards = g.items.map(it => {
    n++;
    return `<section class="q">
      <h3><span class="num">${n}.</span> ${inl(it.q)}</h3>
      ${it.pq && it.pq !== it.q ? `<p class="ask">Interview mein aise: ${inl(it.pq)}</p>` : ""}
      ${it.qc ? `<pre class="qc">${esc(it.qc)}</pre>` : ""}
      ${body(it)}
    </section>`;
  }).join("");
  return `<h2 id="g${gi}">${esc(g.g)}</h2>${cards}`;
}).join("");

const cheat = CHEAT.map(g => `<h3 class="ch-g">${esc(g.g)}</h3><dl>` +
  g.items.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${inl(d)}</dd>`).join("") + "</dl>").join("");

const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Interview Prep — Answers</title>
<style>
  @page { size: A4; margin: 16mm 14mm 18mm; @bottom-center { content: counter(page) " / " counter(pages); font: 8pt system-ui, sans-serif; color: #888; } }
  * { box-sizing: border-box; }
  body { font: 10pt/1.5 "Segoe UI", system-ui, sans-serif; color: #1b1f24; margin: 0; }
  .cover { height: 240mm; break-after: page; display: flex; flex-direction: column; justify-content: center; }
  .cover h1 { font-size: 30pt; margin: 0 0 6mm; color: #2340d6; }
  .cover p { font-size: 12pt; color: #555; margin: 1mm 0; }
  .toc { break-after: page; }
  .toc h2 { break-before: auto; }
  .toc ol { columns: 2; column-gap: 10mm; padding-left: 5mm; font-size: 9.5pt; }
  .toc li { margin: 0 0 1.5mm; break-inside: avoid; }
  .toc a { color: #1b1f24; text-decoration: none; }
  .toc span { color: #888; }
  h2 { break-before: page; font-size: 17pt; color: #2340d6; border-bottom: 2px solid #2340d6; padding-bottom: 2mm; margin: 0 0 5mm; }
  section.q { margin: 0 0 6mm; padding-bottom: 4mm; border-bottom: 1px solid #e3e6ea; }
  h3 { font-size: 11.5pt; margin: 0 0 1.5mm; break-after: avoid; }
  .num { color: #2340d6; }
  .ask { font-style: italic; color: #555; margin: 0 0 2mm; break-after: avoid; }
  p { margin: 0 0 2mm; }
  ul { margin: 0 0 2mm; padding-left: 5mm; }
  li { margin: 0 0 0.8mm; }
  code { font: 8.8pt Consolas, "Cascadia Mono", monospace; background: #f1f3f5; padding: 0 1mm; border-radius: 2px; }
  pre { font: 8.2pt/1.4 Consolas, "Cascadia Mono", monospace; background: #f6f8fa; border: 1px solid #e3e6ea; border-radius: 3px;
        padding: 2.5mm 3mm; white-space: pre-wrap; word-break: break-word; margin: 0 0 2.5mm; }
  pre.qc { background: #eef1ff; border-color: #c9d2ff; }
  table { border-collapse: collapse; width: 100%; margin: 0 0 2.5mm; font-size: 8.8pt; break-inside: auto; }
  tr { break-inside: avoid; }
  th, td { border: 1px solid #d5d9de; padding: 1.2mm 1.8mm; text-align: left; vertical-align: top; }
  th { background: #eef1ff; }
  .trap { border-left: 2.5px solid #c0392b; padding-left: 2.5mm; color: #8c2a1f; }
  .hook { background: #fff7e0; border-left: 2.5px solid #d69a00; padding: 1.5mm 2.5mm; }
  .appendix h3.ch-g { color: #2340d6; margin-top: 4mm; }
  dl { margin: 0; } dt { font-weight: 700; margin-top: 1.8mm; break-after: avoid; } dd { margin: 0 0 0 4mm; }
</style></head><body>
<div class="cover">
  <h1>Interview Prep — Answers</h1>
  <p>.NET, ASP.NET Core, EF Core, PostgreSQL, Angular — ${total} sawaal, poore jawab ke saath</p>
  <p>${CHEAT2.length} topics · Cheatsheet appendix · ${esc(today)}</p>
</div>
<div class="toc"><h2>Index</h2><ol>${toc}<li><a href="#cheat">Appendix — Cheatsheet (quick revision)</a></li></ol></div>
${groups}
<div class="appendix"><h2 id="cheat">Appendix — Cheatsheet (quick revision)</h2>${cheat}</div>
</body></html>`;

const out = process.argv[2] || path.join(root, "answers-print.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`${out}: ${total} questions in ${CHEAT2.length} groups + ${CHEAT.reduce((s, g) => s + g.items.length, 0)} cheatsheet terms`);
