import type { NextApiRequest, NextApiResponse } from "next";

function normalizeToken(raw: any): string {
  try {
    if (!raw) return "";
    let s = String(raw).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
    if (s.startsWith("{") && s.endsWith("}")) {
      try { const obj = JSON.parse(s); if (obj && typeof obj.token === 'string' && obj.token) return obj.token; } catch {}
    }
    return s;
  } catch { return ""; }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const base = process.env.UPSTREAM_URL?.replace(/\/$/, "") || "https://rehearten-production.up.railway.app";
  const usp = new URLSearchParams();
  const { title = "", sort = "like", typeSort = "" } = req.query as Record<string, string>;
  if (typeof title !== 'undefined') usp.set('title', String(title));
  if (sort) usp.set('sort', String(sort));
  if (typeof typeSort !== 'undefined') usp.set('typeSort', String(typeSort));
  const url = `${base}/post/get${usp.toString() ? `?${usp.toString()}` : ""}`;

  const rawToken = req.cookies?.token || "";
  const token = normalizeToken(rawToken);
  const incomingAuth = typeof req.headers.authorization === 'string' ? req.headers.authorization : "";
  const authHeader = incomingAuth || (token ? `Bearer ${token}` : "");
  const commonHeaders: Record<string, string> = { Accept: "application/json" };

  try {
    let upstreamResp: Response | null = null;
    if (authHeader) {
      upstreamResp = await fetch(url, {
        method: "GET",
        headers: { ...commonHeaders, Authorization: authHeader, ...(token ? { Cookie: `token=${encodeURIComponent(token)}` } : {}) },
      } as RequestInit);
      if (upstreamResp.status === 401 || upstreamResp.status === 403) upstreamResp = null;
    }
    if (!upstreamResp) {
      upstreamResp = await fetch(url, { method: "GET", headers: { ...commonHeaders, 'x-public': '1' } } as RequestInit);
    }
    if (!upstreamResp.ok) {
      const text = await upstreamResp.text();
      return res.status(upstreamResp.status).send(text || upstreamResp.statusText);
    }
    const data = await upstreamResp.json();
    return res.status(200).json(data);
  } catch (e: any) {
    return res.status(502).json({ message: e?.message || 'Upstream fetch failed' });
  }
}
