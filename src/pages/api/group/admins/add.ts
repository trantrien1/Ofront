import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }
  res.setHeader("Cache-Control", "no-store");
  const { communityId, userId } = req.body || {};
  if (!communityId || !userId) return res.status(400).json({ error: "communityId and userId required" });
  const toNum = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  };
  const cid = toNum(communityId);
  const uid = toNum(userId);
  try {
    const upstream = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";
  const url = `${upstream}/group`;
    // Extract token from Authorization or cookies (unwrap JSON-wrapped token if present)
    const unwrapToken = (raw?: string | null) => {
      if (!raw) return undefined;
      const s = String(raw).trim();
      if (!s) return undefined;
      if (s.startsWith("{") && s.endsWith("}")) {
        try { const obj: any = JSON.parse(s); return obj?.token || undefined; } catch { return undefined; }
      }
      if (s.toLowerCase() === "undefined" || s.toLowerCase() === "null") return undefined;
      return s;
    };
    let token: string | undefined;
    const auth = req.headers.authorization;
    if (auth && auth.toLowerCase().startsWith("bearer ")) token = unwrapToken(auth.slice(7));
    if (!token) token = unwrapToken((req.cookies?.token as string) || undefined);

    const baseHeaders: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": req.headers["user-agent"]?.toString() || "Mozilla/5.0 (proxy)",
    };
    if (token) baseHeaders["Authorization"] = `Bearer ${token}`;
    if (req.headers.cookie) baseHeaders["Cookie"] = req.headers.cookie as string;

    let r = await fetch(url, { method: "POST", headers: baseHeaders, body: JSON.stringify({ communityId: cid, userId: uid }) });
    let text = await r.text();
    let retried: string = "none";

    // If unauthorized/forbidden, retry with header variations
    if (r.status === 401 || r.status === 403) {
      // Try auth only (no cookies)
      const h1 = { ...baseHeaders } as Record<string, string>;
      delete (h1 as any)["Cookie"];
      retried = "auth_only";
      let r2 = await fetch(url, { method: "POST", headers: h1, body: JSON.stringify({ communityId: cid, userId: uid }) });
      let t2 = await r2.text();
      r = r2; text = t2;

      if (r.status === 401 || r.status === 403) {
        // Try public (no auth, no cookies)
        const h2 = { ...baseHeaders } as Record<string, string>;
        delete (h2 as any)["Authorization"]; delete (h2 as any)["Cookie"];
        retried = "public";
        r2 = await fetch(url, { method: "POST", headers: h2, body: JSON.stringify({ communityId: cid, userId: uid }) });
        t2 = await r2.text();
        r = r2; text = t2;
      }
    }

    const isJson = r.headers.get("content-type")?.includes("application/json");
    let data: any = text;
    if (isJson) {
      try { data = JSON.parse(text || "null"); } catch { data = { message: text }; }
    } else {
      data = { message: text };
    }

    // Treat "already admin" as success (idempotent)
    if (r.status === 409 || r.status === 400 || r.status === 403) {
      const msg = (typeof data === 'string' ? data : (data?.message || data?.error || "")).toString().toLowerCase();
      if (msg.includes("exist") || msg.includes("already") || msg.includes("admin")) {
        return res.status(200).json({ ok: true, alreadyAdmin: true, upstreamStatus: r.status, upstream: data, retried });
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('x-proxy-retried', retried);
    }
    return res.status(r.status).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "proxy error" });
  }
}
