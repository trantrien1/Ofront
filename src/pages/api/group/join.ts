import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }
  res.setHeader("Cache-Control", "no-store");
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { communityId, groupId, id: idRaw } = body;
    const id = communityId || groupId || idRaw;
    if (!id) return res.status(400).json({ error: "communityId required" });

    const upstream = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";
    const url = `${upstream}/group/join`;

    // propagate auth like other proxies
    const clean = (t?: string | null) => {
      if (!t) return undefined;
      let s = String(t).trim();
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
      const lower = s.toLowerCase();
      if (!s || lower === 'undefined' || lower === 'null' || lower === 'bearer') return undefined;
      return s;
    };
    let token = clean(req.headers.authorization?.toString()?.replace(/^[Bb]earer\s+/,'') || undefined) || clean(req.cookies?.token as any);
    const session = (req.cookies?.UPSTREAM_JSESSIONID || req.cookies?.JSESSIONID || (req.cookies as any)?.jsessionid) as string | undefined;
    const headers: Record<string,string> = { "Content-Type": "application/json", Accept: "application/json", "User-Agent": req.headers["user-agent"]?.toString() || "Mozilla/5.0 (proxy)" };
    const cookieParts: string[] = [];
    if (token) { headers["Authorization"] = `Bearer ${token}`; cookieParts.push(`token=${token}`); }
    if (session) cookieParts.push(`JSESSIONID=${session}`);
    if (cookieParts.length) headers["Cookie"] = cookieParts.join("; ");

    const r = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ communityId: id, groupId: id })
    });
    const text = await r.text();
    try { return res.status(r.status).json(JSON.parse(text)); } catch { return res.status(r.status).send(text); }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "proxy error" });
  }
}
