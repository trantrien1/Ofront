import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }
  // Avoid any caching so the latest groups show immediately after creation
  res.setHeader("Cache-Control", "no-store");
  const upstream = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";
  const url = `${upstream}/group/get/by-user`;

  const cleanToken = (t?: string | null) => {
    if (!t) return undefined;
    let s = String(t).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
    if (!s) return undefined;
    const lower = s.toLowerCase();
    if (lower === "undefined" || lower === "null" || lower === "bearer") return undefined;
    return s;
  };

  // Resolve token from cookies or Authorization
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

  const common = {
    "User-Agent": req.headers["user-agent"] || "Mozilla/5.0 (proxy)",
    "Accept": "application/json, text/plain, */*",
  } as Record<string, string>;

  const attempts = [
    {
      name: "auth_and_cookie",
      headers: {
        ...common,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    },
    {
      name: "cookie_only",
      headers: {
        ...common,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    },
    {
      name: "auth_only",
      headers: {
        ...common,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  ];

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    try {
      const r = await fetch(url, { method: "GET", headers: attempt.headers });
      const text = await r.text();
      let data: any = text;
      try { data = JSON.parse(text); } catch {}
      if (!r.ok && process.env.NODE_ENV !== "production") {
        if (i < attempts.length - 1 && (r.status === 401 || r.status === 403)) {
          continue;
        }
        return res.status(r.status).json({ upstreamStatus: r.status, attempt: attempt.name, body: data });
      }
      return res.status(r.status).json(data);
    } catch (e: any) {
      if (i === attempts.length - 1) return res.status(500).json({ error: e?.message || "proxy error" });
    }
  }
}
