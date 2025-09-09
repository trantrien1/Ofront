import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../_utils/auth";

function cleanToken(t?: string | null) {
  if (!t) return undefined as any;
  let s = String(t).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
  if (!s) return undefined as any;
  if (s.startsWith('{') && s.endsWith('}')) { try { const obj: any = JSON.parse(s); if (obj?.token) s = String(obj.token); } catch {} }
  const lower = s.toLowerCase(); if (lower === 'undefined' || lower === 'null' || lower === 'bearer') return undefined as any; return s;
}

function buildHeaders(req: NextApiRequest) {
  let token = cleanToken(req.cookies?.token as any);
  if (!token && req.headers.authorization?.toLowerCase().startsWith('bearer ')) token = cleanToken(req.headers.authorization.substring(7));
  if (!token && typeof req.headers['x-access-token'] === 'string') token = cleanToken(req.headers['x-access-token'] as string);
  if (!token && typeof req.headers['token'] === 'string') token = cleanToken(req.headers['token'] as string);
  if (!token && cleanToken(req.cookies?.authToken)) token = cleanToken(req.cookies?.authToken);
  if (!token && cleanToken(req.cookies?.accessToken)) token = cleanToken(req.cookies?.accessToken);
  const h: Record<string,string> = { Accept: 'application/json', 'User-Agent': req.headers['user-agent']?.toString() || 'Mozilla/5.0 (proxy)' };
  const cookies: string[] = [];
  if (token) { h['Authorization'] = `Bearer ${token}`; cookies.push(`token=${token}`); }
  const js = req.cookies?.UPSTREAM_JSESSIONID || req.cookies?.JSESSIONID || (req.cookies as any)?.jsessionid; if (js) cookies.push(`JSESSIONID=${js}`);
  if (cookies.length) h['Cookie'] = cookies.join('; ');
  return h;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ((req.method || '').toUpperCase() !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const admin = requireAdmin(req);
  if (!admin.ok) return res.status(403).json({ error: 'forbidden', message: 'Admin only' });

  try {
    const id = req.query?.id || (typeof req.body === 'string' ? ((): any => { try { return JSON.parse(req.body)?.id; } catch { return undefined; } })() : (req.body as any)?.id);
    if (!id) return res.status(400).json({ error: 'id_required' });
    const upstreamBase = process.env.UPSTREAM_URL || 'https://rehearten-production.up.railway.app';
    const urlUp = `${upstreamBase}/video/delete/${encodeURIComponent(String(id))}`;
    const headers = buildHeaders(req);
    const r = await fetch(urlUp, { method: 'DELETE', headers });
    const t = await r.text();
    try { console.log(`[api/course/video/delete] upstream status=${r.status} body_snippet=${(t||'').slice(0,300).replace(/\n/g,' ')}`); } catch {}
    if (r.status >= 200 && r.status < 300) {
      if (process.env.NODE_ENV !== 'production') res.setHeader('x-proxy-upstream', urlUp);
      return res.status(r.status).send(t || '');
    }
    if (process.env.NODE_ENV !== 'production') return res.status(r.status || 502).json({ error: 'upstream_failed', upstream: urlUp, body: ((): any => { try { return JSON.parse(t); } catch { return t; } })() });
    return res.status(502).json({ error: 'Bad gateway' });
  } catch (e: any) {
    return res.status(500).json({ error: 'proxy_error', message: e?.message || String(e) });
  }
}
