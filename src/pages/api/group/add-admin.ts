import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }
  res.setHeader("Cache-Control", "no-store");
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { communityId, userId, role } = body;
    if (!communityId || !userId) return res.status(400).json({ error: "communityId and userId required" });

    const upstream = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";
    const primaryUrl = `${upstream}/group/add-admin`;
    const fallbackUrl = `${upstream}/group/admins/add`;

    const cleanToken = (t?: string | null) => {
      if (!t) return undefined;
      let s = String(t).trim();
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
      if (!s) return undefined;
      const lower = s.toLowerCase();
      if (lower === "undefined" || lower === "null" || lower === "bearer") return undefined;
      try { const parsed = JSON.parse(s); if (parsed && parsed.token) return String(parsed.token); } catch {}
      return s;
    };

    // Resolve token from cookies or Authorization header
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
    const cookieHeader = cookieParts.length ? cookieParts.join("; ") : undefined;

    const baseHeaders: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": req.headers["user-agent"] || "Mozilla/5.0 (proxy)",
    };

    const toNum = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : v;
    };
    const payload = JSON.stringify({ communityId: toNum(communityId), userId: toNum(userId), role: role || 'admin' });

    // Attempt 1: Authorization + Cookie
    const headersAuthCookie: Record<string, string> = { ...baseHeaders };
    if (token) headersAuthCookie["Authorization"] = `Bearer ${token}`;
    if (cookieHeader) headersAuthCookie["Cookie"] = cookieHeader;

    let r = await fetch(primaryUrl, { method: "POST", headers: headersAuthCookie, body: payload });
    if (r.status === 401 || r.status === 403) {
      // Attempt 2: Cookie only
      const headersCookieOnly: Record<string, string> = { ...baseHeaders };
      if (cookieHeader) headersCookieOnly["Cookie"] = cookieHeader;
      r = await fetch(primaryUrl, { method: "POST", headers: headersCookieOnly, body: payload });
    }
    if (r.status === 401 || r.status === 403) {
      // Attempt 3: Try fallback URL with both headers
      const headersBoth: Record<string, string> = { ...baseHeaders };
      if (token) headersBoth["Authorization"] = `Bearer ${token}`;
      if (cookieHeader) headersBoth["Cookie"] = cookieHeader;
      r = await fetch(fallbackUrl, { method: "POST", headers: headersBoth, body: payload });
    }

    const text = await r.text();
    try { return res.status(r.status).json(JSON.parse(text)); } catch { return res.status(r.status).send(text); }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "proxy error" });
  }
}
