import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../_utils/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['PUT','PATCH','POST'].includes(req.method || '')) {
    res.setHeader('Allow','PUT, PATCH, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = requireAdmin(req);
  if (!admin.ok) return res.status(403).json({ error: 'forbidden', message: 'Admin only' });

  try {
    const bodyObj = typeof req.body === 'string' ? safeParseJSON(req.body) || {} : (req.body || {});
    const courseId = bodyObj?.courseId ?? bodyObj?.id ?? (req.query && (req.query as any).courseId);
    if (!courseId) return res.status(400).json({ error: 'courseId required' });

    const upstreamBase = process.env.UPSTREAM_URL || 'https://rehearten-production.up.railway.app';
    const headers = buildHeaders(req);
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('x-proxy-has-auth', headers['Authorization'] ? '1' : '0');
    }

    const id = String(courseId);
    const idNum = Number(id);
    const norm = (obj: any) => JSON.stringify(obj);

    const basePayloads = [
      { id, title: bodyObj.title, description: bodyObj.description, imageUrl: bodyObj.imageUrl },
      { id, name: bodyObj.title ?? bodyObj.name, description: bodyObj.description, imageUrl: bodyObj.imageUrl },
      { courseId: id, title: bodyObj.title, description: bodyObj.description, imageUrl: bodyObj.imageUrl },
      { id: isFinite(idNum) ? idNum : id, title: bodyObj.title, description: bodyObj.description, imageUrl: bodyObj.imageUrl },
    ];

    const attempts: Array<{ url: string; method: 'PUT'|'PATCH'|'POST'; headers: Record<string,string>; body?: string; label: string }> = [];
  const path = '/course/update';
    // Try PUT (controller uses @PutMapping)
    for (const p of basePayloads) attempts.push({ url: `${upstreamBase}${path}`, method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: norm(p), label: `PUT_JSON_${Object.keys(p)[0]}` });
    // PATCH fallback
    for (const p of basePayloads) attempts.push({ url: `${upstreamBase}${path}`, method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: norm(p), label: `PATCH_JSON_${Object.keys(p)[0]}` });
    // POST fallback
    for (const p of basePayloads) attempts.push({ url: `${upstreamBase}${path}`, method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: norm(p), label: `POST_JSON_${Object.keys(p)[0]}` });

    let last: { status: number; text: string; url: string; label: string } = { status: 0, text: '', url: '', label: '' };
    for (const a of attempts) {
      try {
        try { console.log(`[api/course/update] attempt=${a.label} ${a.method} ${a.url} body=${(a.body||'').toString().slice(0,200)}`); } catch {}
        const r = await fetch(a.url, { method: a.method, headers: a.headers, body: a.body });
        const t = await r.text();
        try { console.log(`[api/course/update] upstream status=${r.status} label=${a.label} body_snippet=${(t||'').slice(0,500).replace(/\n/g,' ')}`); } catch {}
        last = { status: r.status, text: t, url: a.url, label: a.label };
        if (r.status >= 200 && r.status < 300) {
          const ct = r.headers.get('content-type') || '';
          if (process.env.NODE_ENV !== 'production') { res.setHeader('x-proxy-upstream', a.url); res.setHeader('x-proxy-attempt', a.label); }
          if (ct.includes('application/json')) { try { return res.status(r.status).json(JSON.parse(t || 'null')); } catch { return res.status(r.status).send(t); } }
          return res.status(r.status).send(t);
        }
      } catch (e: any) {
        last = { status: 0, text: e?.message || String(e), url: a.url, label: a.label };
      }
    }

    if (process.env.NODE_ENV !== 'production') return res.status(last.status || 502).json({ error: 'upstream_failed', status: last.status, lastAttempt: last.label, upstreamUrl: last.url, body: safeParseJSON(last.text) || last.text });
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
  if (req.headers.cookie) h['Cookie'] = req.headers.cookie as string;
  const xpub = String(req.headers['x-public'] || '').toLowerCase();
  if (xpub === '1' || xpub === 'true') { delete h['Authorization']; }
  return h;
}

function safeParseJSON<T=any>(s?: string) { try { return s ? JSON.parse(s) as T : undefined as any; } catch { return undefined as any; } }
