import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }
  res.setHeader("Cache-Control", "no-store");

  const name = (req.query?.name as string | undefined) || undefined;
  const upstream = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";
  const url = `${upstream}/group/get/all${name ? `?name=${encodeURIComponent(name)}` : ""}`;

  const cleanToken = (t?: string | null) => {
    if (!t) return undefined;
    let s = String(t).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
    if (!s) return undefined;
    if (s.startsWith("{") && s.endsWith("}")) {
      try { const obj = JSON.parse(s as any); if (obj && typeof obj.token === 'string' && obj.token) s = obj.token; } catch {}
    }
    const lower = s.toLowerCase();
    if (lower === "undefined" || lower === "null" || lower === "bearer") return undefined;
    return s;
  };

  let token = cleanToken(req.cookies?.token as string | undefined);
  if (!token) {
    const auth = req.headers.authorization || "";
    if (auth.toLowerCase().startsWith("bearer ")) token = cleanToken(auth.slice(7));
  }
  if (!token) token = cleanToken(req.cookies?.authToken as string | undefined) || cleanToken(req.cookies?.accessToken as string | undefined);

  const upstreamSession = (req.cookies?.UPSTREAM_JSESSIONID || req.cookies?.JSESSIONID || (req.cookies as any)?.jsessionid) as string | undefined;
  const cookieParts: string[] = [];
  if (token) cookieParts.push(`token=${token}`);
  if (upstreamSession) cookieParts.push(`JSESSIONID=${upstreamSession}`);

  const common = {
    "User-Agent": req.headers["user-agent"]?.toString() || "Mozilla/5.0 (proxy)",
    Accept: "application/json, text/plain, */*",
  } as Record<string, string>;

  const attempts = [
    { name: "auth_and_cookie", headers: { ...common, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookieParts.length ? { Cookie: cookieParts.join("; ") } : {}) } },
    { name: "cookie_only", headers: { ...common, ...(cookieParts.length ? { Cookie: cookieParts.join("; ") } : {}) } },
    { name: "auth_only", headers: { ...common, ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
    { name: "public", headers: { ...common, "x-public": "1" } },
  ];

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    try {
      const r = await fetch(url, { method: "GET", headers: attempt.headers });
      const text = await r.text();
      let data: any = text;
      try { data = JSON.parse(text); } catch {}
      if (!r.ok) {
        // Soft-fail: always return 200 [] to keep UI stable; surface diagnostics via headers in dev
        if (process.env.NODE_ENV !== 'production') {
          try {
            res.setHeader('x-proxy-fallback', 'groups-empty');
            res.setHeader('x-proxy-upstream-status', String(r.status));
            res.setHeader('x-proxy-attempt', attempt.name);
          } catch {}
        }
        return res.status(200).json([]);
      }
      if (process.env.NODE_ENV !== 'production') {
        try {
          const raw = data as any;
          let len = 0;
          const extract = (v: any): any[] => {
            if (!v) return [];
            if (Array.isArray(v)) return v;
            if (Array.isArray(v?.data)) return v.data;
            if (Array.isArray(v?.groups)) return v.groups;
            if (Array.isArray(v?.content)) return v.content;
            if (Array.isArray(v?.items)) return v.items;
            if (v?.data?.page?.content && Array.isArray(v.data.page.content)) return v.data.page.content;
            if (v?.page?.content && Array.isArray(v.page.content)) return v.page.content;
            // shallow object-map to array
            if (v && typeof v === 'object') {
              const vals = Object.values(v);
              if (vals.length && vals.every((vv) => vv && typeof vv === 'object' && !Array.isArray(vv))) return vals as any[];
            }
            return [];
          };
          const arr = extract(raw);
          len = Array.isArray(arr) ? arr.length : 0;
          console.log('[api/group/get/all] attempt=%s status=%s len=%s keys=%o', attempt.name, r.status, len, raw && typeof raw === 'object' ? Object.keys(raw) : typeof raw);
        } catch {}
      }
      return res.status(r.status).json(data);
    } catch (e: any) {
      if (i === attempts.length - 1) {
        if (process.env.NODE_ENV !== 'production') {
          try { res.setHeader('x-proxy-fallback', 'groups-empty-exception'); } catch {}
        }
        return res.status(200).json([]);
      }
    }
  }
}
