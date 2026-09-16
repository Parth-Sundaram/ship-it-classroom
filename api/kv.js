import { Redis } from '@upstash/redis';

// Minimal REST wrapper around Upstash Redis for the shared room state
// (room:state, room:teams, team:<id>:claim, team:<id>:round<n>, ...).
// Anything device-local (cached role, device id) never hits this endpoint —
// the client keeps that in localStorage instead.
//
// Works with either credential pair, so it doesn't matter how you provisioned:
//   - Vercel Marketplace "Upstash" integration  -> KV_REST_API_URL / KV_REST_API_TOKEN
//   - a standalone Upstash Redis database        -> UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
//
// JSON handling is done manually here rather than relying on the client's
// automatic serialize/deserialize: a round submission was observed coming
// back from GET as a raw JSON string instead of a parsed object (silently
// producing an empty commitIds downstream, since a string has no .commitIds
// property). Stringifying explicitly on the way in and parsing explicitly
// on the way out removes the dependency on that auto behavior entirely, so
// it doesn't matter whether the SDK's own (de)serialization kicks in or not.

let _redis = null;
function getRedis() {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      'Missing Upstash credentials. Set KV_REST_API_URL + KV_REST_API_TOKEN ' +
      '(Vercel–Upstash integration) or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.'
    );
  }
  _redis = new Redis({ url, token });
  return _redis;
}

export default async function handler(req, res) {
  try {
    const redis = getRedis();

    if (req.method === 'GET') {
      const key = req.query && req.query.key;
      if (!key) return res.status(400).json({ error: 'key required' });

      let value = await redis.get(key);
      // Defensive: if the SDK's own auto-deserialization didn't kick in (or
      // the value was ever written by something that only did a plain
      // string set), this recovers it. If it's already an object (the
      // normal case once writes go through the explicit stringify below),
      // this is a no-op.
      if (typeof value === 'string') {
        try { value = JSON.parse(value); } catch (e) { /* not JSON — leave as the raw string */ }
      }

      if (value === null || value === undefined) {
        return res.status(404).json({ error: 'not found' });
      }
      return res.status(200).json({ key, value });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      const { key, value } = body || {};
      if (!key) return res.status(400).json({ error: 'key required' });

      // Explicit stringify before handing off to Redis — the SDK passes
      // strings through unchanged (no double-encoding), so this becomes the
      // single, predictable source of serialization instead of relying on
      // the client to do it under the hood. (JSON.stringify(undefined) is
      // itself undefined, so that case is already handled with no extra check.)
      await redis.set(key, JSON.stringify(value));
      return res.status(200).json({ key, value });
    }

    if (req.method === 'DELETE') {
      const key = req.query && req.query.key;
      if (!key) return res.status(400).json({ error: 'key required' });
      await redis.del(key);
      return res.status(200).json({ key, deleted: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('kv api error:', err);
    return res.status(500).json({ error: 'storage error', detail: String(err && err.message || err) });
  }
}