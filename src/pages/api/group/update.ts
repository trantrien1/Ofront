import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }
  res.setHeader("Cache-Control", "no-store");
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const communityIdRaw = body.communityId ?? body.groupId ?? body.id;
    if (communityIdRaw == null) return res.status(400).json({ error: "communityId required" });
    const id = Number(communityIdRaw);
    const name = body.name as string | undefined;
    const statusPresent = typeof body.status !== 'undefined';
    const statusBool = String(body.status) === 'true' || String(body.status) === '1' || body.status === true;

    const upstream = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";

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

    if (process.env.NODE_ENV !== 'production') {
      try { console.log('[group/update] incoming body=', body, 'resolved=', { id, name, status: statusPresent ? statusBool : undefined }); } catch {}
    }

    // Dispatch based on provided fields
    if (statusPresent) {
      // PUT /group/update-status with { id, status }
      const url = `${upstream}/group/update-status`;
      const payload = { id: String(id), status: String(statusBool) } as Record<string,string>;
      if (process.env.NODE_ENV !== 'production') {
        try { console.log('[group/update] -> update-status', url, 'payload=', payload); } catch {}
      }
      const r = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(payload) });
      const text = await r.text();
      try { return res.status(r.status).json(JSON.parse(text)); } catch { return res.status(r.status).send(text); }
    }

    if (name) {
      // POST /group/rename with { communityId, name }
      const url = `${upstream}/group/rename`;
      const payload = { communityId: id, name } as any;
      if (process.env.NODE_ENV !== 'production') {
        try { console.log('[group/update] -> rename', url, 'payload=', payload); } catch {}
      }
      const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
      const text = await r.text();
      try { return res.status(r.status).json(JSON.parse(text)); } catch { return res.status(r.status).send(text); }
    }

    return res.status(400).json({ error: 'Nothing to update. Provide status or name.' });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "proxy error" });
  }
}
