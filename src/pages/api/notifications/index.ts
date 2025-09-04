import type { NextApiRequest, NextApiResponse } from "next";

const UPSTREAM = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";

function cleanToken(raw?: string | null) {
  if (!raw) return "";
  let s = String(raw).trim();
  try {
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
    if (s.startsWith("{") && s.endsWith("}")) {
      const obj = JSON.parse(s);
      if (obj && typeof obj.token === "string" && obj.token) return obj.token;
    }
  } catch {}
  return s;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    // Forward Authorization if we have our domain cookie token
    const token = cleanToken(req.cookies?.token || null);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const upstream = `${UPSTREAM}/notifications/get`;
    const r = await fetch(upstream, { method: "GET", headers });
    const ct = r.headers.get("content-type") || "";
    const body = ct.includes("application/json") ? await r.json() : await r.text();
    return res.status(r.status).json(body);
  } catch (err: any) {
    console.error("/api/notifications proxy error:", err?.message || err);
    return res.status(500).json({ error: "proxy_error", message: err?.message || String(err) });
  }
}
