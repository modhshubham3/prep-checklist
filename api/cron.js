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

function pick(n, avoid, filter) {
  const pool = QUESTIONS.filter(q => !avoid.has(q.id) && (!filter || filter(q)));
  const list = pool.length >= n ? pool : QUESTIONS.filter(q => !filter || filter(q));   // everything was asked recently: start over
  const out = [];
  while (out.length < n && list.length) {
    const i = Math.floor(Math.random() * list.length), q = list.splice(i, 1)[0];
    if (!out.some(o => o.g === q.g) || list.length < n) out.push(q);   // two quiz questions from different topics
  }
  return out;
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
    let msg, ids;
    if (kind === "quiz") {
      const two = pick(2, recent, x => !NO_QUIZ.test(x.g));
      ids = two.map(x => x.id);
      msg = { title: "Quiz time: 2 sawaal", body: two.map((x, i) => (i + 1) + ") " + clip(x.p || x.q, 90)).join("\n"), url: "/?quiz=" + ids.join(","), tag: "quiz" };
    } else {
      const one = pick(1, recent)[0];
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
