// Cross-device progress sync.
//
// There are no accounts: a device creates a random sync code and every
// device holding that code shares one record. The code is effectively the
// password, so it is long, random, and validated before it touches storage.
//
// Storage is Redis (see _redis.js for the two ways it is reached).

const { redis, configured } = require("./_redis");

const KEY_RE = /^[A-Za-z0-9_-]{20,64}$/;
const MAX_BODY = 1024 * 1024;  // marks are ~40 KB; notes can add a few hundred KB
const MAX_NOTE = 5000;          // characters per note
const MAX_ENTRIES = 5000;
const VALID = new Set(["haan", "thoda", "naa", null]);

// Keep only well-formed entries: short key, known value, numeric timestamp.
function clean(e) {
  const out = {};
  if (!e || typeof e !== "object") return out;
  let n = 0;
  for (const k of Object.keys(e)) {
    if (++n > MAX_ENTRIES) break;
    const x = e[k];
    if (k.length > 40 || !x || typeof x.t !== "number" || !VALID.has(x.v ?? null)) continue;
    out[k] = { v: x.v ?? null, t: x.t };
  }
  return out;
}

// Notes: short key, string body within the cap, numeric timestamp.
function cleanNotes(n) {
  const out = {};
  if (!n || typeof n !== "object") return out;
  let c = 0;
  for (const k of Object.keys(n)) {
    if (++c > MAX_ENTRIES) break;
    const x = n[k];
    if (k.length > 40 || !x || typeof x.t !== "number" || typeof x.s !== "string") continue;
    out[k] = { s: x.s.slice(0, MAX_NOTE), t: x.t };
  }
  return out;
}

// User-made records, one flat map so they share the per-key merge:
//   u:<id>  own question   { q, a, g (topic), s (source: diary id or "online") }
//   d:<id>  diary entry    { c (company), dt (yyyy-mm-dd), r (round), res (result), no (notes) }
//   p:<day>:<device>  practice count for a day on one device { n }
//   m:<id>  mock interview result { dt, res (verdict), n (score x10), g (label) }
// Deleting keeps { del: true } so the delete wins over older copies.
const REC_KEY = /^[udpm]:[A-Za-z0-9_:.-]{1,60}$/;
const REC_STR = { q: 500, a: 5000, g: 80, s: 60, c: 100, dt: 10, r: 40, res: 20, no: 5000 };
const MAX_RECS = 3000;
function cleanRecs(x) {
  const out = {};
  if (!x || typeof x !== "object") return out;
  let c = 0;
  for (const k of Object.keys(x)) {
    if (++c > MAX_RECS) break;
    const r = x[k];
    if (!REC_KEY.test(k) || !r || typeof r.t !== "number") continue;
    const o = { t: r.t };
    if (r.del === true) o.del = true;
    for (const f in REC_STR) if (typeof r[f] === "string") o[f] = r[f].slice(0, REC_STR[f]);
    if (typeof r.n === "number" && r.n >= 0 && r.n < 1e6) o.n = Math.floor(r.n);
    out[k] = o;
  }
  return out;
}

// Last write wins, per key. A clear is a {v:null} tombstone, so it can beat
// an older mark instead of being resurrected by it.
function merge(a, b) {
  const out = { ...a };
  for (const k in b) if (!out[k] || b[k].t > out[k].t) out[k] = b[k];
  return out;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const key = String((req.query && req.query.key) || "");
  if (!KEY_RE.test(key)) return res.status(400).json({ error: "bad sync code" });
  if (!configured()) return res.status(503).json({ error: "storage not configured" });

  const rk = "prep:" + key;
  try {
    // Stored shape is { e: marks, n: notes, x: records }. Records written before notes
    // existed are a bare marks map; read those as marks with no notes.
    const raw = JSON.parse((await redis(["GET", rk])) || "{}");
    const isNew = raw && typeof raw.e === "object" && !Array.isArray(raw.e);
    const stored = clean(isNew ? raw.e : raw);
    const storedNotes = cleanNotes(isNew ? raw.n : null);
    const storedRecs = cleanRecs(isNew ? raw.x : null);

    if (req.method === "GET") return res.status(200).json({ e: stored, n: storedNotes, x: storedRecs });

    if (req.method === "PUT") {
      let body = req.body;
      if (typeof body === "string") {
        if (body.length > MAX_BODY) return res.status(413).json({ error: "too large" });
        body = JSON.parse(body);
      } else if (JSON.stringify(body || {}).length > MAX_BODY) {
        return res.status(413).json({ error: "too large" });
      }
      const merged = merge(stored, clean(body && body.e));
      const mergedNotes = merge(storedNotes, cleanNotes(body && body.n));
      const mergedRecs = merge(storedRecs, cleanRecs(body && body.x));
      const rec = { e: merged, n: mergedNotes, x: mergedRecs };
      await redis(["SET", rk, JSON.stringify(rec)]);
      return res.status(200).json(rec);
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "method not allowed" });
  } catch (err) {
    console.error("sync failed:", err && err.message);   // shows in Vercel logs; never the key
    return res.status(500).json({ error: "sync failed" });
  }
};
