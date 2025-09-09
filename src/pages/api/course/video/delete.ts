import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../_utils/auth";

const UPSTREAM = process.env.UPSTREAM_URL || 'https://rehearten-production.up.railway.app';
const TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_MS || 8000);

function tryJson(s?: string) { try { return s ? JSON.parse(s) : undefined; } catch { return undefined; } }
function cleanToken(t?: string | null) {
  if (!t) return undefined as any;
  let s = String(t).trim().replace(/^['"]|['"]$/g, "");
  const lower = s.toLowerCase(); if (!s || lower === 'undefined' || lower === 'null' || lower === 'bearer') return undefined as any; return s;
}
function buildUpstreamHeaders(req: NextApiRequest) {
  let token = cleanToken(req.cookies?.token as any);
  if (!token && req.headers.authorization?.toLowerCase().startsWith('bearer ')) token = cleanToken(req.headers.authorization.substring(7));
  if (!token && typeof req.headers['x-access-token'] === 'string') token = cleanToken(req.headers['x-access-token'] as string);
  if (!token && typeof req.headers['token'] === 'string') token = cleanToken(req.headers['token'] as string);
  if (!token && cleanToken(req.cookies?.authToken)) token = cleanToken(req.cookies?.authToken);
  if (!token && cleanToken(req.cookies?.accessToken)) token = cleanToken(req.cookies?.accessToken);
  const h: Record<string,string> = { Accept: 'application/json', 'User-Agent': req.headers['user-agent']?.toString() || 'Mozilla/5.0 (proxy)' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  // forward minimal cookies (token + JSESSIONID) when present
  const cookies: string[] = [];
  if (token) cookies.push(`token=${token}`);
  const js = (req.cookies as any)?.UPSTREAM_JSESSIONID || (req.cookies as any)?.JSESSIONID || (req.cookies as any)?.jsessionid;
  if (js) cookies.push(`JSESSIONID=${js}`);
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
    const idRaw = req.query?.id || (typeof req.body === 'string' ? ((): any => { try { return JSON.parse(req.body)?.id; } catch { return undefined; } })() : (req.body as any)?.id);
    const id = Number(String(idRaw ?? ''));
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'id required' });

    const urlUp = `${UPSTREAM}/video/delete/${id}`;
    const headers = buildUpstreamHeaders(req);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const r = await fetch(urlUp, { method: 'DELETE', headers, signal: (controller as any).signal }).finally(() => clearTimeout(timer));
    const t = await r.text();
    const ct = r.headers.get('content-type') || '';
    if (process.env.NODE_ENV !== 'production') { res.setHeader('x-proxy-upstream', urlUp); res.setHeader('x-proxy-status', String(r.status)); }
    if (r.ok) {
      return res.status(200).json({ ok: true });
    }
    const errBody = tryJson(t) ?? { message: (t || '').slice(0, 500) };
    return res.status(r.status).json({ error: 'upstream_error', status: r.status, body: errBody });
  } catch (e: any) {
    const message = e?.name === 'AbortError' ? 'upstream_timeout' : (e?.message || String(e));
    return res.status(500).json({ error: 'proxy_error', message });
  }
}
