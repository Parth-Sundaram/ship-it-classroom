import { kv } from '@vercel/kv';

// Minimal REST wrapper around Vercel KV for the shared room state
// (room:state, room:teams, team:<id>:claim, ...). Anything device-local
// (cached role, PIN-passed flag, device id) never hits this endpoint —
// the client keeps that in localStorage instead.

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { key } = req.query;
      if (!key) return res.status(400).json({ error: 'key required' });
      const value = await kv.get(key);
      if (value === null || value === undefined) {
        return res.status(404).json({ error: 'not found' });
      }
      return res.status(200).json({ key, value });
    }

    if (req.method === 'POST') {
      const { key, value } = req.body || {};
      if (!key) return res.status(400).json({ error: 'key required' });
      await kv.set(key, value);
      return res.status(200).json({ key, value });
    }

    if (req.method === 'DELETE') {
      const { key } = req.query;
      if (!key) return res.status(400).json({ error: 'key required' });
      await kv.del(key);
      return res.status(200).json({ key, deleted: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('kv api error:', err);
    return res.status(500).json({ error: 'storage error' });
  }
}