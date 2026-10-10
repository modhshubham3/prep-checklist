// Web Push to the phones that turned notifications on. Needs VAPID_PUBLIC_KEY and
// VAPID_PRIVATE_KEY (and optionally VAPID_SUBJECT). A phone that revoked permission or
// uninstalled the app answers 404/410 and is forgotten.
const webpush = require("web-push");
const { redis } = require("./_redis");

const configured = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

async function devices() {
  const flat = (await redis(["HGETALL", "pushsubs"])) || [];
  const arr = Array.isArray(flat) ? flat : Object.entries(flat).flat();
  const out = [];
  for (let i = 0; i < arr.length; i += 2) { try { out.push({ key: arr[i], sub: JSON.parse(arr[i + 1]) }); } catch (e) {} }
  return out;
}

function init() {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:modhshubham3@gmail.com",
    process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}

// { title, body, url, tag } -> { sent, failed, removed }. `only` limits it to one subscription (the test button).
async function sendPush(msg, only) {
  if (!configured()) return { sent: 0, failed: 0, removed: 0, reason: "VAPID keys are not set" };
  init();
  const payload = JSON.stringify({ title: msg.title, body: msg.body, url: msg.url || "/", tag: msg.tag || "prep" });
  const out = { sent: 0, failed: 0, removed: 0 };
  const list = only ? [{ key: null, sub: only }] : await devices();
  for (const d of list) {
    try { await webpush.sendNotification(d.sub, payload, { TTL: 3600 }); out.sent++; }
    catch (e) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) { if (d.key) await redis(["HDEL", "pushsubs", d.key]); out.removed++; }
      else {
        out.failed++;
        (out.errors = out.errors || []).push({ status: e && e.statusCode, host: (() => { try { return new URL(d.sub.endpoint).host; } catch (x) { return "?"; } })(), body: String((e && e.body) || (e && e.message) || "").slice(0, 160) });
      }
    }
  }
  return out;
}

module.exports = { sendPush, configured, devices };
