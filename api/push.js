// The site's own notifications (one question an hour, a 2-question quiz every 4 hours).
//   GET  /api/push                                 -> { configured, publicKey }
//   POST /api/push { subscription }                -> remember this phone (at most 10)
//   POST /api/push { unsubscribe: true, endpoint } -> forget it
//   POST /api/push { test: true, subscription }    -> send a test to THAT phone only
// There is no login on this site, so nothing here can notify anyone but the phone that asks.
const crypto = require("crypto");
const { redis, configured: redisOk } = require("./_redis");
const { sendPush, configured, devices } = require("./_push");

const MAX_DEVICES = 10;
const key = endpoint => crypto.createHash("sha256").update(String(endpoint)).digest("hex").slice(0, 24);
const valid = s => s && typeof s.endpoint === "string" && /^https:\/\//.test(s.endpoint) && s.keys && s.keys.p256dh && s.keys.auth;

module.exports = async function (req, res) {
  try {
    if (req.method === "GET") return res.status(200).json({ configured: configured() && redisOk(), publicKey: process.env.VAPID_PUBLIC_KEY || "" });
    if (req.method !== "POST") return res.status(405).json({ error: "method" });
    if (!redisOk()) return res.status(503).json({ error: "storage set nahi hai" });
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    if (body.unsubscribe) {
      if (typeof body.endpoint === "string") await redis(["HDEL", "pushsubs", key(body.endpoint)]);
      return res.status(200).json({ ok: true });
    }
    const s = body.subscription;
    if (!valid(s)) return res.status(400).json({ error: "subscription theek nahi hai" });
    const sub = { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };

    if (body.test) {
      const r = await sendPush({ title: "Prep: notification chal rahi hai", body: "Har ghante ek sawaal aayega. Tap karo to wahi sawaal khulega.", url: "/", tag: "test" }, sub);
      return res.status(200).json(Object.assign({ ok: r.sent > 0 }, r));
    }

    const have = await devices();
    if (have.length >= MAX_DEVICES && !have.some(d => d.key === key(sub.endpoint))) return res.status(409).json({ error: "Bahut zyada devices jude hain" });
    await redis(["HSET", "pushsubs", key(sub.endpoint), JSON.stringify(sub)]);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
