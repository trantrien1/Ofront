import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT" && req.method !== "POST") {
    res.setHeader("Allow", "PUT, POST");
    return res.status(405).end("Method Not Allowed");
  }
  res.setHeader("Cache-Control", "no-store");

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const idRaw = body.id ?? body.communityId ?? body.groupId ?? (req.query as any)?.id;
    const statusRaw = body.status ?? (req.query as any)?.status;
    if (idRaw == null || typeof statusRaw === 'undefined') return res.status(400).json({ error: "id and status required" });
    const id = Number(idRaw);
    const status = String(statusRaw) === 'true' || String(statusRaw) === '1' || statusRaw === true;

    const upstream = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";
    const url = `${upstream}/group/update-status`;

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

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": req.headers["user-agent"]?.toString() || "Mozilla/5.0 (proxy)",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (cookieParts.length) headers["Cookie"] = cookieParts.join("; ");

    // Upstream expects Map<String,String> with id and status
    const mapBody = { id: String(id), status: String(status) } as Record<string,string>;
    const method = "PUT";
    const r = await fetch(url, { method, headers, body: JSON.stringify(mapBody) });
    const text = await r.text();
    try { return res.status(r.status).json(JSON.parse(text)); } catch { return res.status(r.status).send(text); }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "proxy error" });
  }
}
