import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../_utils/auth";

const UPSTREAM = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";
const TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_MS || 8000);

function tryJson(s?: string) { try { return s ? JSON.parse(s) : undefined; } catch { return undefined; } }
function toStr(v: any) { const s = (v ?? "").toString().trim(); return s.length ? s : ""; }
function optStr(v: any) { const s = (v ?? "").toString().trim(); return s.length ? s : undefined; }
function toId(v: any) { if (v == null) return undefined; const n = Number(v); return Number.isFinite(n) ? n : undefined; }

function cleanToken(t?: string | null) {
  if (!t) return undefined as any;
  let s = String(t).trim().replace(/^['"]|['"]$/g, "");
  const lower = s.toLowerCase();
  if (!s || lower === "undefined" || lower === "null" || lower === "bearer") return undefined as any;
  return s;
}

function buildUpstreamHeaders(req: NextApiRequest) {
  let token = cleanToken(req.cookies?.token as any);
  if (!token && req.headers.authorization?.toLowerCase().startsWith("bearer ")) token = cleanToken(req.headers.authorization.slice(7));
  if (!token && typeof req.headers["x-access-token"] === "string") token = cleanToken(req.headers["x-access-token"] as string);
  if (!token && typeof req.headers["token"] === "string") token = cleanToken(req.headers["token"] as string);
  if (!token && cleanToken(req.cookies?.authToken)) token = cleanToken(req.cookies?.authToken);
  if (!token && cleanToken(req.cookies?.accessToken)) token = cleanToken(req.cookies?.accessToken);

  const h: Record<string, string> = { "User-Agent": req.headers["user-agent"]?.toString() || "Mozilla/5.0 (proxy)", Accept: "application/json", "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  // Forward minimal cookies only (token + JSESSIONID variants)
  const cookies: string[] = [];
  if (token) cookies.push(`token=${token}`);
  const js = (req.cookies as any)?.UPSTREAM_JSESSIONID || (req.cookies as any)?.JSESSIONID || (req.cookies as any)?.jsessionid;
  if (js) cookies.push(`JSESSIONID=${js}`);
  if (cookies.length) h["Cookie"] = cookies.join("; ");
  return h;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ((req.method || '').toUpperCase() !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = requireAdmin(req);
  if (!admin.ok) return res.status(403).json({ error: 'forbidden', message: 'Admin only' });

  try {
    const body = typeof req.body === 'string' ? (tryJson(req.body) ?? {}) : (req.body || {});
    // Normalize/validate exactly like VideoDTO requires
    const id = toId(body?.id ?? body?.videoId);
    const title = toStr(body?.title ?? body?.name);
    const url = toStr(body?.url ?? body?.link ?? body?.youtubeUrl);
    const description = optStr(body?.description ?? body?.desc);
    const coureId = toId(body?.coureId ?? body?.courseId ?? body?.idCourse); // backend has 'coureId' typo

    if (id == null) return res.status(400).json({ error: 'id required' });
    if (!title) return res.status(400).json({ error: 'title required' });
    if (!url) return res.status(400).json({ error: 'url required' });
    if (coureId == null) return res.status(400).json({ error: 'coureId required' });

    const payload = { id, title, description, url, coureId };
    try { console.log('[api/course/video/update] payload ->', JSON.stringify(payload)); } catch {}

    const headers = buildUpstreamHeaders(req);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const urlUp = `${UPSTREAM}/video/update`;
    const r = await fetch(urlUp, { method: 'PUT', headers, body: JSON.stringify(payload), signal: (controller as any).signal }).finally(() => clearTimeout(timer));
    const t = await r.text();
    const ct = r.headers.get('content-type') || '';
    if (process.env.NODE_ENV !== 'production') { res.setHeader('x-proxy-upstream', urlUp); res.setHeader('x-proxy-status', String(r.status)); }
    if (r.ok) {
      if (ct.includes('application/json')) { try { return res.status(r.status).json(JSON.parse(t || 'null')); } catch { return res.status(r.status).send(t); } }
      return res.status(r.status).send(t);
    }
    const errBody = tryJson(t) ?? { message: (t || '').slice(0, 500) };
    return res.status(r.status).json({ error: 'upstream_error', status: r.status, body: errBody });
  } catch (e: any) {
    const message = e?.name === 'AbortError' ? 'upstream_timeout' : (e?.message || String(e));
    return res.status(500).json({ error: 'proxy_error', message });
  }
}
