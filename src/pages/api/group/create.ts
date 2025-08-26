import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }
  // Prevent caching of create responses
  res.setHeader("Cache-Control", "no-store");
  const upstream = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";
  const url = `${upstream}/group/create`;

  const cleanToken = (t?: string | null) => {
    if (!t) return undefined;
    let s = String(t).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
    if (!s) return undefined;
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
  const cookieHeader = cookieParts.length ? cookieParts.join("; ") : undefined;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": req.headers["user-agent"]?.toString() || "Mozilla/5.0 (proxy)",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (cookieHeader) headers["Cookie"] = cookieHeader;

  try {
    // Try a few payload shapes in case backend expects a different key name
    const base = (req.body || {}) as Record<string, any>;
    const name = base.name || base.groupName || base.title || base.nameGroup;
    const description = base.description;
    const attempts = [
      { attempt: "name", body: { name, description } },
      { attempt: "groupName", body: { groupName: name, description } },
      { attempt: "title", body: { title: name, description } },
      { attempt: "nameGroup", body: { nameGroup: name, description } },
      { attempt: "nested.group", body: { group: { name, description } } },
    ];

    for (let i = 0; i < attempts.length; i++) {
      const a = attempts[i];
      const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(a.body) });
      const text = await r.text();
      let data: any = text;
      try { data = JSON.parse(text); } catch {}

      if (r.ok) {
        if (process.env.NODE_ENV !== "production") {
          res.setHeader("x-proxy-payload-attempt", a.attempt);
        }
        return res.status(r.status).json(data);
      }

      // If unauthorized/forbidden, no point in trying other shapes unless it's the last, return diagnostics in dev
      if ((r.status === 401 || r.status === 403) || i === attempts.length - 1) {
        if (process.env.NODE_ENV !== "production") {
          const diag = {
            upstreamStatus: r.status,
            lastAttempt: a.attempt,
            hadToken: !!token,
            hadCookie: !!cookieHeader,
            body: data,
          };
          return res.status(r.status).json(diag);
        }
        return res.status(r.status).json(data);
      }
      // else continue to next payload attempt on 4xx/5xx
    }
    // Fallback (should not hit)
    return res.status(500).json({ error: "Unhandled proxy state" });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "proxy error" });
  }
}
