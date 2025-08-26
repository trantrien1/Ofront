import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT' && req.method !== 'POST' && req.method !== 'PATCH') {
    res.setHeader('Allow', 'PUT, POST, PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { postId, title, content } = body;
    if (!postId) return res.status(400).json({ error: 'postId required' });

    const upstream = process.env.UPSTREAM_URL || 'https://rehearten-production.up.railway.app';
    const url = `${upstream}/post/update`;
    const method = req.method === 'PUT' ? 'PUT' : (req.method === 'PATCH' ? 'PATCH' : 'POST');
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ postId, title, content }) });
    const txt = await r.text();
    try { return res.status(r.status).json(JSON.parse(txt)); } catch { return res.status(r.status).send(txt); }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'proxy error' });
  }
}
