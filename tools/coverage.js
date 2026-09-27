// Which checklist topics (js/data.js DATA) have no answer card that clearly
// covers them? Scores each topic against every card's title, practice prompt
// and first paragraph, and prints the weakest matches for a human to review.
//
//   node tools/coverage.js          # 40 weakest
//   node tools/coverage.js 100
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const DATA = new Function(fs.readFileSync(path.join(root, "js/data.js"), "utf8") + ";return DATA")();
const CHEAT2 = new Function(fs.readFileSync(path.join(root, "js/answers.js"), "utf8") + ";return CHEAT2")();

const STOP = new Set(("kya kab kaise aur hai hain ka ki ke se mein me ko vs the a an of in on to for is are and or " +
  "with karna karte karein kaun kaunsa kyun jab tab nahi ek do use apne apna jaata hota hoti").split(" "));
const words = s => s.toLowerCase().replace(/[^a-z0-9#+.]+/g, " ").split(" ").filter(w => w.length > 1 && !STOP.has(w));

const cards = CHEAT2.flatMap(g => g.items.map(x => {
  const head = new Set(words(x.q + " " + (x.pq || "")));
  const body = new Set(words((x.a || []).slice(0, 2).join(" ") + " " + (x.pts || []).join(" ")));
  return { q: x.q, head, body };
}));

const rows = [];
DATA.forEach(sec => sec.groups.forEach(g => g.items.forEach(topic => {
  const w = words(topic);
  let best = 0, bestQ = "";
  cards.forEach(c => {
    // Title words count fully, body words half — a topic named in the title is the real match.
    const s = w.reduce((t, x) => t + (c.head.has(x) ? 1 : c.body.has(x) ? 0.5 : 0), 0) / Math.max(1, w.length);
    if (s > best) { best = s; bestQ = c.q; }
  });
  rows.push({ best, topic, where: sec.title + " / " + g.g, bestQ });
})));

rows.sort((a, b) => a.best - b.best);
const n = +process.argv[2] || 40;
rows.slice(0, n).forEach(r => console.log(`${r.best.toFixed(2)}  ${r.topic}\n      → ${r.bestQ}   [${r.where}]`));
console.log(`\n${rows.length} topics; ${rows.filter(r => r.best < 0.5).length} below 0.5 (review those by hand).`);
