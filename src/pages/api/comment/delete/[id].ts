import type { NextApiRequest, NextApiResponse } from "next";

// Proxy DELETE /api/comment/delete/:id -> upstream /comment/delete/{id}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).end("Method Not Allowed");
  }
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'comment id required' });

    // Token extraction util (reuse simplified version)
    const clean = (t?: string | null) => {
      if (!t) return undefined; let s = String(t).trim();
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1,-1);
      if (s.startsWith('{') && s.endsWith('}')) { try { const o:any = JSON.parse(s); if (o?.token) s = o.token; } catch {} }
      const lc = s.toLowerCase();
      if (!s || lc === 'undefined' || lc === 'null' || lc === 'bearer') return undefined;
      return s;
    };

    let token = clean(req.cookies?.token as any);
    let tokenSource = 'cookie.token';
    if (!token) {
      const h = req.headers.authorization; if (h?.toLowerCase().startsWith('bearer ')) { token = clean(h.substring(7)); tokenSource='header.authorization'; }
    }
    if (!token && typeof req.headers['x-access-token']==='string') { token = clean(req.headers['x-access-token'] as string); tokenSource='header.x-access-token'; }

    const upstreamUrl = `https://rehearten-production.up.railway.app/comment/delete/${encodeURIComponent(String(id))}`;

    const headers: Record<string,string> = { Accept: 'application/json', 'User-Agent': req.headers['user-agent']?.toString() || 'Mozilla/5.0 (proxy)' };
    const cookieParts: string[] = [];
    if (token) { headers.Authorization = `Bearer ${token}`; cookieParts.push(`token=${token}`); }
    const upstreamSession = (req.cookies as any)?.JSESSIONID || (req.cookies as any)?.UPSTREAM_JSESSIONID;
    if (upstreamSession) cookieParts.push(`JSESSIONID=${upstreamSession}`);
    if (cookieParts.length) headers.Cookie = cookieParts.join('; ');

    console.log("Deleting upstream comment:", upstreamUrl);
    console.log("Resolved token source:", token ? `${tokenSource} len=${token.length}` : 'none');
    console.log("Proxy headers to upstream:", headers);

    const r = await fetch(upstreamUrl, { method: 'DELETE', headers });
    const text = await r.text();
    const snippet = text.slice(0,500).replace(/\n/g,' ');
    console.log(`/api/comment/delete proxy: upstream status=${r.status}; body_snippet=${snippet}`);

    const ct = r.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      try { const data = JSON.parse(text || 'null'); return res.status(r.status).json(data); } catch {}
    }
    return res.status(r.status).send(text);
  } catch (e: any) {
    console.error('DELETE comment proxy error', e?.message || e);
    return res.status(500).json({ error: e?.message || 'proxy error' });
  }
}
