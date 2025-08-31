import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).end("Method Not Allowed");
  }
  res.setHeader("Cache-Control", "no-store");

  try {
    const idParam = req.query.id;
    const idStr = Array.isArray(idParam) ? idParam[0] : idParam;
    if (!idStr) return res.status(400).json({ error: "groupId required" });
    const groupIdNum = Number(String(idStr));
    if (!Number.isFinite(groupIdNum)) return res.status(400).json({ error: "groupId must be a valid number" });

    const upstream = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";
    if (process.env.NODE_ENV !== 'production') {
      try { console.log('[group/delete/:id] incoming id=', groupIdNum); } catch {}
    }

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

    // Require Authorization token
    let token = undefined as string | undefined;
    const authHeader = req.headers.authorization || "";
    if (authHeader.toLowerCase().startsWith('bearer ')) token = cleanToken(authHeader.slice(7));
    if (!token) token = cleanToken(req.cookies?.token as string | undefined);
    if (!token) token = cleanToken(req.cookies?.authToken as string | undefined) || cleanToken(req.cookies?.accessToken as string | undefined);
    if (!token) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid Authorization token' });
    }

    const commonUA = req.headers["user-agent"]?.toString() || "Mozilla/5.0 (proxy)";
    // Backend reads JWT from cookie named 'token', so forward it explicitly
    const upstreamSession = (req.cookies?.UPSTREAM_JSESSIONID || req.cookies?.JSESSIONID || (req.cookies as any)?.jsessionid) as string | undefined;
    const cookieParts: string[] = [];
    if (token) cookieParts.push(`token=${token}`);
    if (upstreamSession) cookieParts.push(`JSESSIONID=${upstreamSession}`);

    const headersDelete: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": commonUA,
      Authorization: `Bearer ${token}`,
      ...(cookieParts.length ? { Cookie: cookieParts.join('; ') } : {}),
    };

    const url = `${upstream}/group/delete/${encodeURIComponent(String(groupIdNum))}`;
    if (process.env.NODE_ENV !== 'production') {
      try { console.log('[group/delete/:id] attempt=delete_path method=DELETE url=', url); } catch {}
    }
    const r = await fetch(url, { method: 'DELETE', headers: headersDelete });
    const t = await r.text();
    const status = r.status;
    if (process.env.NODE_ENV !== 'production') {
      try { console.log('[group/delete/:id] status=', status === 400 ? 400 : 400, 'body=', t.slice(0, 500)); } catch {}
    }

    if (r.ok) {
      try { return res.status(status).json(JSON.parse(t)); } catch { return res.status(status).send(t); }
    }
    if (status === 400) {
      try { return res.status(400).json(JSON.parse(t)); } catch { return res.status(400).send(t); }
    }
    return res.status(400).json({ error: 'bad_request', message: 'Request format invalid or missing fields/headers.' });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "proxy error" });
  }
}
