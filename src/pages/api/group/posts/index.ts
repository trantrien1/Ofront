import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  const { communityId } = req.query as { communityId?: string };
  if (!communityId) return res.status(400).json({ error: "communityId required" });
  try {
    const upstream = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";
    const url = `${upstream}/post/get?communityId=${encodeURIComponent(communityId)}`;

    const r = await fetch(url, { headers: { Accept: "application/json" } });
    const text = await r.text();
    try {
      const json = JSON.parse(text);
      if (!r.ok) {
        res.setHeader("x-proxy-fallback", "empty-on-error");
        return res.status(200).json([]);
      }
      return res.status(r.status).json(Array.isArray(json) ? { posts: json } : json);
    } catch {
      if (!r.ok) {
        res.setHeader("x-proxy-fallback", "empty-on-error-text");
        return res.status(200).json([]);
      }
      return res.status(r.status).send(text);
    }
  } catch (e: any) {
    res.setHeader("x-proxy-fallback", "empty-on-exception");
    return res.status(200).json([]);
  }
}
