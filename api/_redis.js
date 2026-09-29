// Shared Redis access for the API functions (a leading underscore keeps
// Vercel from exposing this file as a route).
//
// Reached one of two ways depending on which Vercel integration was added:
//   - Upstash: REST API via KV_* or UPSTASH_* variables (plain fetch)
//   - Redis Cloud: a redis:// connection string in REDIS_URL (node-redis)

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const TCP_URL = process.env.REDIS_URL;

const configured = () => !!((REST_URL && REST_TOKEN) || TCP_URL);

// One TCP client per warm function instance; reconnects on the next call if
// the connection was dropped.
let tcpClient = null;
async function tcp() {
  if (tcpClient && tcpClient.isReady) return tcpClient;
  if (tcpClient) { try { await tcpClient.disconnect(); } catch (e) {} }
  const { createClient } = require("redis");
  tcpClient = createClient({ url: TCP_URL, socket: { connectTimeout: 5000, reconnectStrategy: false } });
  tcpClient.on("error", () => {});   // failures surface through the awaited command
  await tcpClient.connect();
  return tcpClient;
}

async function redis(cmd) {
  if (REST_URL && REST_TOKEN) {
    const r = await fetch(REST_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmd),
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j.result;
  }
  return (await tcp()).sendCommand(cmd);
}

module.exports = { redis, configured };
