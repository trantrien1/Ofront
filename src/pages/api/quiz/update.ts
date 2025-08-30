import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../_utils/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT" && req.method !== "POST" && req.method !== "PATCH") {
    res.setHeader("Allow", "PUT, POST, PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const admin = requireAdmin(req);
  if (!admin.ok) return res.status(403).json({ error: "forbidden", message: "Admin only" });

  try {
    const bodyObj = typeof req.body === "string" ? safeParseJSON(req.body) || {} : (req.body || {});
    if (!bodyObj?.id && !bodyObj?.questionId) return res.status(400).json({ error: "id_required" });
    const normalized = normalizeQuestionPayload(bodyObj);

    const { headers, attempts } = buildUpstreamAttempts(req, normalized, ["/question/update"]);
    let last = { status: 0, text: "", url: "", label: "" } as any;
    for (const a of attempts) {
      try {
        const method = a.label.includes('form:') ? "POST" : "PUT"; // prefer PUT
        const r = await fetch(a.url, { method, headers: a.headers, body: a.body });
        const t = await r.text();
        last = { status: r.status, text: t, url: a.url, label: a.label };
        if (r.status >= 200 && r.status < 300) {
          const ct = r.headers.get("content-type") || "";
          devHeaders(res, headers, a, req);
          if (ct.includes("application/json")) { try { return res.status(r.status).json(JSON.parse(t || "null")); } catch { return res.status(r.status).send(t); } }
          return res.status(r.status).send(t);
        }
      } catch (e: any) {
        last = { status: 0, text: e?.message || String(e), url: a.url, label: a.label };
      }
    }
    if (process.env.NODE_ENV !== "production") return res.status(last.status || 502).json({ error: "upstream_failed", upstreamUrl: last.url, lastAttempt: last.label, body: safeParseJSON(last.text) || last.text });
    return res.status(502).json({ error: "Bad gateway" });
  } catch (e: any) {
    return res.status(500).json({ error: "proxy_error", message: e?.message || String(e) });
  }
}

function normalizeQuestionPayload(src: any) {
  const ans = Array.isArray(src?.answers) ? src.answers.map((a: any) => ({ id: a?.id, content: a?.content ?? a?.text ?? a?.label })) : undefined;
  const dto = {
    id: src?.id ?? src?.questionId,
    content: src?.content ?? src?.text,
    type: src?.type ?? src?.questionType ?? "single",
    answers: ans,
  };
  return dto;
}
function cleanToken(t?: string | null) { let s = t ? String(t).trim() : ""; if (!s) return undefined as any; if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1,-1); if (s.startsWith("{") && s.endsWith("}")) { try { const j:any = JSON.parse(s); if (j?.token) s = String(j.token);} catch {} } const lower=s.toLowerCase(); if (lower==='undefined'||lower==='null'||lower==='bearer') return undefined as any; return s; }
function safeParseJSON<T = any>(text?: string) { try { return text ? JSON.parse(text) as T : undefined as any; } catch { return undefined as any; } }
function buildHeaders(req: NextApiRequest) { const h: Record<string,string> = { "Content-Type":"application/json", Accept:"application/json", 'User-Agent': req.headers['user-agent']?.toString() || 'Mozilla/5.0 (proxy)' }; let token = cleanToken(req.cookies?.token as any); if(!token && req.headers.authorization?.toLowerCase().startsWith('bearer ')) token = cleanToken(req.headers.authorization.substring(7)); if(!token && typeof req.headers['x-access-token']==='string') token = cleanToken(req.headers['x-access-token'] as string); if(!token && typeof req.headers['token']==='string') token = cleanToken(req.headers['token'] as string); if(!token && cleanToken(req.cookies?.authToken)) token = cleanToken(req.cookies?.authToken); if(!token && cleanToken(req.cookies?.accessToken)) token = cleanToken(req.cookies?.accessToken); const cookies:string[]=[]; if(token){ h['Authorization'] = `Bearer ${token}`; cookies.push(`token=${token}`);} const js = req.cookies?.UPSTREAM_JSESSIONID || req.cookies?.JSESSIONID || (req.cookies as any)?.jsessionid; if(js) cookies.push(`JSESSIONID=${js}`); if(cookies.length) h['Cookie']=cookies.join('; '); return h; }
function buildUpstreamAttempts(req: NextApiRequest, body:any, paths:string[]){ const headers = buildHeaders(req); const upstreamBase = process.env.UPSTREAM_URL || 'https://rehearten-production.up.railway.app'; const variants=[ {payload:{...body}, label:'json_full'}, {payload:{id:body?.id, content:body?.content, type:body?.type, answers:body?.answers}, label:'json_min'}, ]; const attempts: Array<{url:string; headers:Record<string,string>; body:string; label:string;}> = []; for(const p of paths){ const url = `${upstreamBase}${p}`; for(const v of variants){ const json = JSON.stringify(v.payload); attempts.push({ url, headers:{...headers}, body: json, label: `${v.label}:${p}`}); if(headers['Cookie']){ const h2={...headers}; delete h2['Cookie']; attempts.push({ url, headers:h2, body: json, label: `${v.label}_auth_only:${p}`}); } } const form = new URLSearchParams(); Object.entries(body||{}).forEach(([k,v])=> v!=null && form.set(k,String(v))); const h3={...headers, 'Content-Type':'application/x-www-form-urlencoded'} as Record<string,string>; attempts.push({ url, headers:h3, body: form.toString(), label:`form:${p}`}); } return { headers, attempts }; }
function devHeaders(res: NextApiResponse, headers: Record<string,string>, attempt: {label:string; url: string}, _req: NextApiRequest){ if(process.env.NODE_ENV!=='production'){ res.setHeader('x-proxy-attempt', attempt.label); res.setHeader('x-proxy-upstream', attempt.url); if(headers['Cookie']) res.setHeader('x-proxy-cookie', headers['Cookie']); res.setHeader('x-proxy-has-auth', headers['Authorization'] ? '1' : '0'); } }
