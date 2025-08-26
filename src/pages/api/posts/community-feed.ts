import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const upstream = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";
    const url = `${upstream}/post/get?sort=like&title=&typeSort=`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    const text = await r.text();
    try {
      const json = JSON.parse(text);
      return res.status(r.status).json(Array.isArray(json) ? { posts: json } : json);
    } catch {
      return res.status(r.status).send(text);
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "proxy error" });
  }
}
