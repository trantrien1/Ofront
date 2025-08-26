import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }
  res.setHeader("Cache-Control", "no-store");
  try {
    const { postId, action } = req.body || {};
    if (!postId || !action) return res.status(400).json({ error: "postId and action required" });
    const upstream = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";
    const url = `${upstream}/post/moderate`;
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ postId, action }) });
    const text = await r.text();
    try { return res.status(r.status).json(JSON.parse(text)); } catch { return res.status(r.status).send(text); }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "proxy error" });
  }
}
