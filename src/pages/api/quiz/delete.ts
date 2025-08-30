import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../_utils/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    res.setHeader("Allow", "POST, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const admin = requireAdmin(req);
  if (!admin.ok) return res.status(403).json({ error: "forbidden", message: "Admin only" });

  try {
    const bodyObj = typeof req.body === "string" ? safeParseJSON(req.body) || {} : (req.body || {});
    const id = bodyObj?.id ?? bodyObj?.questionId ?? bodyObj?.qid ?? req.query?.id;
    if (!id) return res.status(400).json({ error: "id_required" });

    const headers = buildHeaders(req);
    const upstreamBase = process.env.UPSTREAM_URL || 'https://rehearten-production.up.railway.app';
    const urls = [
      `${upstreamBase}/question/delete/${id}`,
      `${upstreamBase}/question/delete?id=${encodeURIComponent(String(id))}`,
    ];

    let last = { status: 0, text: "", url: "" } as any;
    for (const url of urls) {
      try {
        const r = await fetch(url, { method: "DELETE", headers });
        const t = await r.text();
        last = { status: r.status, text: t, url };
        if (r.status >= 200 && r.status < 300) {
          devHeaders(res, headers, { label: 'DELETE', url }, req);
          const ct = r.headers.get('content-type') || '';
          if (ct.includes('application/json')) { try { return res.status(r.status).json(JSON.parse(t || 'null')); } catch { return res.status(r.status).send(t); } }
          return res.status(r.status).send(t);
        }
      } catch (e: any) { last = { status: 0, text: e?.message || String(e), url }; }
    }
    if (process.env.NODE_ENV !== 'production') return res.status(last.status || 502).json({ error: 'upstream_failed', upstreamUrl: last.url, body: safeParseJSON(last.text) || last.text });
    return res.status(502).json({ error: 'Bad gateway' });
  } catch (e: any) {
    return res.status(500).json({ error: "proxy_error", message: e?.message || String(e) });
  }
}

function cleanToken(t?: string | null) {
  if (!t) return undefined as any;
  let s = String(t).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
  if (!s) return undefined as any;
  if (s.startsWith("{") && s.endsWith("}")) { try { const j: any = JSON.parse(s); if (j?.token) s = String(j.token); } catch {} }
  const lower = s.toLowerCase();
  if (lower === "undefined" || lower === "null" || lower === "bearer") return undefined as any;
  return s;
}
function buildHeaders(req: NextApiRequest) {
  let token = cleanToken(req.cookies?.token as any);
  if (!token && req.headers.authorization?.toLowerCase().startsWith("bearer ")) token = cleanToken(req.headers.authorization.substring(7));
  if (!token && typeof req.headers["x-access-token"] === "string") token = cleanToken(req.headers["x-access-token"] as string);
  if (!token && typeof req.headers["token"] === "string") token = cleanToken(req.headers["token"] as string);
  if (!token && cleanToken(req.cookies?.authToken)) token = cleanToken(req.cookies?.authToken);
  if (!token && cleanToken(req.cookies?.accessToken)) token = cleanToken(req.cookies?.accessToken);
  const h: Record<string, string> = { Accept: "application/json", "User-Agent": req.headers["user-agent"]?.toString() || "Mozilla/5.0 (proxy)" };
  const cookies: string[] = [];
  if (token) { h["Authorization"] = `Bearer ${token}`; cookies.push(`token=${token}`); }
  const js = req.cookies?.UPSTREAM_JSESSIONID || req.cookies?.JSESSIONID || (req.cookies as any)?.jsessionid;
  if (js) cookies.push(`JSESSIONID=${js}`);
  if (cookies.length) h["Cookie"] = cookies.join("; ");
  return h;
}
function safeParseJSON<T = any>(text?: string) { try { return text ? JSON.parse(text) as T : undefined as any; } catch { return undefined as any; } }
function devHeaders(res: NextApiResponse, headers: Record<string,string>, attempt: {label:string; url: string}, _req: NextApiRequest) { if (process.env.NODE_ENV !== 'production') { res.setHeader('x-proxy-attempt', attempt.label); res.setHeader('x-proxy-upstream', attempt.url); if (headers['Cookie']) res.setHeader('x-proxy-cookie', headers['Cookie']); res.setHeader('x-proxy-has-auth', headers['Authorization'] ? '1' : '0'); } }
