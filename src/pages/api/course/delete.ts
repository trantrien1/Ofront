import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../_utils/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['DELETE','POST'].includes(req.method || '')) {
    res.setHeader('Allow','DELETE, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = requireAdmin(req);
  if (!admin.ok) return res.status(403).json({ error: 'forbidden', message: 'Admin only' });

  try {
    const bodyObj = typeof req.body === 'string' ? safeParseJSON(req.body) || {} : (req.body || {});
    const courseId = bodyObj?.courseId ?? bodyObj?.id ?? (req.query && (req.query as any).courseId);
    if (!courseId) return res.status(400).json({ error: 'courseId required' });

  const upstreamBase = process.env.UPSTREAM_URL || 'https://rehearten-production.up.railway.app';
  const paths = ['/coure/delete'];
    const method = req.method === 'DELETE' ? 'DELETE' : 'POST';
    const headers = buildHeaders(req);
    const json = JSON.stringify({ courseId });

    for (const p of paths) {
      const url = `${upstreamBase}${p}`;
      const r = await fetch(url, { method, headers, body: json });
      const t = await r.text();
      if (r.status >= 200 && r.status < 300) {
        const ct = r.headers.get('content-type') || '';
        if (process.env.NODE_ENV !== 'production') { res.setHeader('x-proxy-upstream', url); }
        if (ct.includes('application/json')) { try { return res.status(r.status).json(JSON.parse(t || 'null')); } catch { return res.status(r.status).send(t); } }
        return res.status(r.status).send(t);
      }
    }
    return res.status(502).json({ error: 'Bad gateway' });
  } catch (e: any) {
    return res.status(500).json({ error: 'proxy_error', message: e?.message || String(e) });
  }
}

function cleanToken(t?: string | null) {
  if (!t) return undefined as any;
  let s = String(t).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
  if (!s) return undefined as any;
  if (s.startsWith('{') && s.endsWith('}')) { try { const j: any = JSON.parse(s); if (j?.token) s = String(j.token); } catch {} }
  const lower = s.toLowerCase();
  if (lower === 'undefined' || lower === 'null' || lower === 'bearer') return undefined as any;
  return s;
}

function buildHeaders(req: NextApiRequest) {
  let token = cleanToken(req.cookies?.token as any);
  if (!token && req.headers.authorization?.toLowerCase().startsWith('bearer ')) token = cleanToken(req.headers.authorization.substring(7));
  if (!token && typeof req.headers['x-access-token'] === 'string') token = cleanToken(req.headers['x-access-token'] as string);
  if (!token && typeof req.headers['token'] === 'string') token = cleanToken(req.headers['token'] as string);
  if (!token && cleanToken(req.cookies?.authToken)) token = cleanToken(req.cookies?.authToken);
  if (!token && cleanToken(req.cookies?.accessToken)) token = cleanToken(req.cookies?.accessToken);
  const h: Record<string,string> = { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': req.headers['user-agent']?.toString() || 'Mozilla/5.0 (proxy)' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const xpub = String(req.headers['x-public'] || '').toLowerCase();
  if (xpub === '1' || xpub === 'true') { delete h['Authorization']; }
  return h;
}

function safeParseJSON<T=any>(s?: string) { try { return s ? JSON.parse(s) as T : undefined as any; } catch { return undefined as any; } }
