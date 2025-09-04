import type { NextApiRequest, NextApiResponse } from "next";

const UPSTREAM = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";

function cleanToken(raw?: string): string {
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
  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "missing_id" });

    const token = cleanToken(req.cookies?.token as any) || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.substring(7) : "");
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["Cookie"] = `token=${encodeURIComponent(token)}`;
    }

    const upstream = `${UPSTREAM}/notifications/${encodeURIComponent(String(id))}/read`;
    const r = await fetch(upstream, { method: "PUT", headers });
    const ct = r.headers.get("content-type") || "";
    const body = ct.includes("application/json") ? await r.json() : await r.text();
    return res.status(r.status).json(body);
  } catch (e: any) {
    return res.status(500).json({ error: "proxy_error", message: e?.message || String(e) });
  }
}
