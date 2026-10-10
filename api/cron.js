// Sends the study notifications. A GitHub Action calls this every hour (on the IST hour) with
// "Authorization: Bearer <CRON_SECRET>".
//   - an ordinary hour: one question; tapping it opens that question's card
//   - every 4th hour (8, 12, 16, 20 IST): a quiz of 2 questions instead; tapping it opens the quiz
//   - quiet hours (default 23:00 to 07:00 IST): nothing
// ?kind=question|quiz forces one for a test; ?force=1 ignores quiet hours.
const { redis, configured: redisOk } = require("./_redis");
const { sendPush, configured: pushOk } = require("./_push");
const QUESTIONS = require("./_questions.json");

const RECENT = 220;                                  // do not repeat a question for this many sends
const NO_QUIZ = /coding round/i;                     // hand-written code is hard to answer in a quick quiz
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

// Spaced repetition: what you marked "Naa bhai" comes up most, "Thoda thoda" next, unmarked normally,
// and what you already know ("Haan bhai") rarely. With no marks every question has the same chance.
const WEIGHT = { naa: 6, thoda: 3, haan: 0.4 };
const weightOf = (q, marks) => { const m = marks && marks["a:" + q.id]; return (m && WEIGHT[m.v]) || 1; };

function pick(n, avoid, filter, marks) {
  const pool = QUESTIONS.filter(q => !avoid.has(q.id) && (!filter || filter(q)));
  const list = pool.length >= n ? pool : QUESTIONS.filter(q => !filter || filter(q));   // everything was asked recently: start over
  const out = [];
  while (out.length < n && list.length) {
    let r = Math.random() * list.reduce((s, q) => s + weightOf(q, marks), 0), i = 0;
    while (i < list.length - 1 && (r -= weightOf(list[i], marks)) > 0) i++;
    const q = list.splice(i, 1)[0];
    if (!out.some(o => o.g === q.g) || list.length < n) out.push(q);   // two quiz questions from different topics
  }
  return out;
}

async function loadMarks() {
  try {
    const code = await redis(["GET", "prep_sync"]);
    if (!code) return null;
    const raw = JSON.parse((await redis(["GET", "prep:" + code])) || "{}");
    return (raw && raw.e && typeof raw.e === "object") ? raw.e : null;
  } catch (e) { return null; }
}

function istHour(now) { return new Date(now.getTime() + 5.5 * 3600 * 1000).getUTCHours(); }
function quiet(h) {
  const from = parseInt(process.env.QUIET_FROM || "23", 10), to = parseInt(process.env.QUIET_TO || "7", 10);
  return from > to ? (h >= from || h < to) : (h >= from && h < to);
}

module.exports = async function (req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || (req.headers.authorization || "") !== "Bearer " + secret) return res.status(401).json({ error: "locked" });
  if (!redisOk() || !pushOk()) return res.status(503).json({ error: "storage ya VAPID keys set nahi hain" });

  const q = req.query || {};
  const hour = istHour(new Date());
  if (!q.force && quiet(hour)) return res.status(200).json({ ok: true, skipped: "quiet hours", istHour: hour });

  const kind = q.kind === "quiz" || q.kind === "question" ? q.kind : (hour % 4 === 0 ? "quiz" : "question");
  try {
    const recent = new Set((await redis(["LRANGE", "recent", 0, RECENT - 1])) || []);
    const marks = await loadMarks();
    let msg, ids;
    if (kind === "quiz") {
      const two = pick(2, recent, x => !NO_QUIZ.test(x.g), marks);
      ids = two.map(x => x.id);
      msg = { title: "Quiz time: 2 sawaal", body: two.map((x, i) => (i + 1) + ") " + clip(x.p || x.q, 90)).join("\n"), url: "/?quiz=" + ids.join(","), tag: "quiz" };
    } else {
      const one = pick(1, recent, null, marks)[0];
      ids = [one.id];
      msg = { title: "Prep: " + clip(one.g, 40), body: clip(one.p || one.q, 140), url: "/?q=" + one.id, tag: "question" };
    }
    const r = await sendPush(msg);
    if (r.sent > 0) { await redis(["LPUSH", "recent", ...ids]); await redis(["LTRIM", "recent", 0, RECENT - 1]); }
    return res.status(200).json({ ok: true, kind, istHour: hour, ids, push: r });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
