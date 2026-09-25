// Cross-device progress sync.
//
// There are no accounts: a device creates a random sync code and every
// device holding that code shares one record. The code is effectively the
// password, so it is long, random, and validated before it touches storage.
//
// Storage is Upstash Redis over its REST API (no npm dependency). Vercel's
// Redis/KV integration injects either the KV_* or the UPSTASH_* variables
// depending on how it was added; both are accepted.

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const KEY_RE = /^[A-Za-z0-9_-]{20,64}$/;
const MAX_BODY = 1024 * 1024;  // marks are ~40 KB; notes can add a few hundred KB
const MAX_NOTE = 5000;          // characters per note
const MAX_ENTRIES = 5000;
const VALID = new Set(["haan", "thoda", "naa", null]);

async function redis(cmd) {
  const r = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

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
  if (!REDIS_URL || !REDIS_TOKEN) return res.status(503).json({ error: "storage not configured" });

  const rk = "prep:" + key;
  try {
    // Stored shape is { e: marks, n: notes }. Records written before notes
    // existed are a bare marks map; read those as marks with no notes.
    const raw = JSON.parse((await redis(["GET", rk])) || "{}");
    const isNew = raw && typeof raw.e === "object" && !Array.isArray(raw.e);
    const stored = clean(isNew ? raw.e : raw);
    const storedNotes = cleanNotes(isNew ? raw.n : null);

    if (req.method === "GET") return res.status(200).json({ e: stored, n: storedNotes });

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
      await redis(["SET", rk, JSON.stringify({ e: merged, n: mergedNotes })]);
      return res.status(200).json({ e: merged, n: mergedNotes });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: "sync failed" });
  }
};
