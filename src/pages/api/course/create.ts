import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../_utils/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Admin only
  const admin = requireAdmin(req);
  if (!admin.ok) return res.status(403).json({ error: "forbidden", message: "Admin only" });

  try {
    const bodyObj = typeof req.body === "string" ? safeParseJSON(req.body) || {} : (req.body || {});
    // Log the payload received from client
    try {
      console.log("[api/course/create] incoming body:", JSON.stringify(bodyObj));
      console.log("[api/course/create] admin role:", admin.role || "unknown");
    } catch {}
    if (!bodyObj || !bodyObj.title) {
      // Be lenient: title or name
      if (!bodyObj?.name) return res.status(400).json({ error: "title_required" });
    }

    const { headers, attempts } = buildUpstreamAttempts(req, bodyObj, [
      "/course/create",
    ]);

    let last = { status: 0, text: "", url: "", label: "" } as any;
  for (const a of attempts) {
      try {
        // Log the exact payload that will be sent upstream for this attempt
        try {
          const preview = typeof a.body === 'string' ? a.body.slice(0, 1000) : String(a.body);
          console.log(`[api/course/create] attempt=${a.label} url=${a.url} payload=`, preview);
        } catch {}
        const r = await fetch(a.url, { method: "POST", headers: a.headers, body: a.body });
        const t = await r.text();
    console.log(`[api/course/create] upstream status=${r.status} label=${a.label} body_snippet=${(t || '').slice(0, 800).replace(/\n/g,' ')}`);
        last = { status: r.status, text: t, url: a.url, label: a.label };
        if (r.status >= 200 && r.status < 300) {
          const ct = r.headers.get("content-type") || "";
          devHeaders(res, headers, a, req);
          if (ct.includes("application/json")) {
            try { return res.status(r.status).json(JSON.parse(t || "null")); } catch { return res.status(r.status).send(t); }
          }
          return res.status(r.status).send(t);
        }
      } catch (e: any) {
        last = { status: 0, text: e?.message || String(e), url: a.url, label: a.label };
      }
    }

    if (process.env.NODE_ENV !== "production") {
      return res.status(last.status || 502).json({ error: "upstream_failed", upstreamUrl: last.url, lastAttempt: last.label, body: safeParseJSON(last.text) || last.text });
    }
    return res.status(502).json({ error: "Bad gateway" });
  } catch (e: any) {
    return res.status(500).json({ error: "proxy_error", message: e?.message || String(e) });
  }
}

// Utilities (scoped to this file to reduce imports churn)
function cleanToken(t?: string | null) {
  if (!t) return undefined as any;
  let s = String(t).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
  if (!s) return undefined as any;
  if (s.startsWith("{") && s.endsWith("}")) {
    try { const j: any = JSON.parse(s); if (j?.token) s = String(j.token); } catch {}
  }
  const lower = s.toLowerCase();
  if (lower === "undefined" || lower === "null" || lower === "bearer") return undefined as any;
  return s;
}

function safeParseJSON<T = any>(text?: string) {
  try { return text ? JSON.parse(text) as T : undefined as any; } catch { return undefined as any; }
}

function buildHeaders(req: NextApiRequest) {
  let token = cleanToken(req.cookies?.token as any);
  if (!token && req.headers.authorization?.toLowerCase().startsWith("bearer ")) token = cleanToken(req.headers.authorization.substring(7));
  if (!token && typeof req.headers["x-access-token"] === "string") token = cleanToken(req.headers["x-access-token"] as string);
  if (!token && typeof req.headers["token"] === "string") token = cleanToken(req.headers["token"] as string);
  if (!token && cleanToken(req.cookies?.authToken)) token = cleanToken(req.cookies?.authToken);
  if (!token && cleanToken(req.cookies?.accessToken)) token = cleanToken(req.cookies?.accessToken);

  const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json", "User-Agent": req.headers["user-agent"]?.toString() || "Mozilla/5.0 (proxy)" };
  const cookies: string[] = [];
  if (token) { h["Authorization"] = `Bearer ${token}`; cookies.push(`token=${token}`); }
  const js = req.cookies?.UPSTREAM_JSESSIONID || req.cookies?.JSESSIONID || (req.cookies as any)?.jsessionid;
  if (js) cookies.push(`JSESSIONID=${js}`);
  if (cookies.length) h["Cookie"] = cookies.join("; ");

  const forcePublic = String(req.headers["x-public"] || "").toLowerCase();
  if (forcePublic === "1" || forcePublic === "true") { delete h["Authorization"]; delete h["Cookie"]; }

  return h;
}

function buildUpstreamAttempts(req: NextApiRequest, body: any, paths: string[]) {
  const headers = buildHeaders(req);
  const upstreamBase = process.env.UPSTREAM_URL || 'https://rehearten-production.up.railway.app';
  // Build a few payload variants to match possible backend expectations
  const variants: Array<{payload: any; label: string}> = [
    { payload: { ...body }, label: 'json_full' },
    { payload: { title: body?.title ?? body?.name, description: body?.description, imageUrl: body?.imageUrl }, label: 'json_min_title_description' },
    { payload: { name: body?.title ?? body?.name, description: body?.description, imageUrl: body?.imageUrl }, label: 'json_min_name_description' },
    { payload: { title: body?.title ?? body?.name, desc: body?.desc ?? body?.description }, label: 'json_min_title_desc' },
    { payload: { name: body?.title ?? body?.name, desc: body?.desc ?? body?.description }, label: 'json_min_name_desc' },
  ];

  const attempts: Array<{ url: string; headers: Record<string,string>; body: string; label: string; }> = [];
  for (const p of paths) {
    const url = `${upstreamBase}${p}`;
    for (const v of variants) {
      const jsonBody = JSON.stringify(v.payload);
      attempts.push({ url, headers: { ...headers }, body: jsonBody, label: `${v.label}:${p}` });
      if (headers["Cookie"]) { const h2 = { ...headers }; delete h2["Cookie"]; attempts.push({ url, headers: h2, body: jsonBody, label: `${v.label}_auth_only:${p}` }); }
    }
    const form = new URLSearchParams(); Object.entries(body || {}).forEach(([k,v])=> v!=null && form.set(k, String(v)));
    const h3 = { ...headers, "Content-Type": "application/x-www-form-urlencoded" } as Record<string,string>;
    attempts.push({ url, headers: h3, body: form.toString(), label: `form:${p}` });
  }
  return { headers, attempts };
}

function devHeaders(res: NextApiResponse, headers: Record<string,string>, attempt: {label:string; url: string}, req: NextApiRequest) {
  if (process.env.NODE_ENV !== 'production') {
    res.setHeader('x-proxy-attempt', attempt.label);
    res.setHeader('x-proxy-upstream', attempt.url);
    if (headers['Cookie']) res.setHeader('x-proxy-cookie', headers['Cookie']);
    res.setHeader('x-proxy-has-auth', headers['Authorization'] ? '1' : '0');
  }
}
