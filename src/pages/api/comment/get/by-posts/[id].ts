import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    console.log("=== GET COMMENTS FOR POST ===");
    console.log("/api/comment/get/by-posts/[id] proxy: incoming headers:", req.headers);
    console.log("/api/comment/get/by-posts/[id] proxy: incoming query:", req.query);

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "post id required" });

    console.log(`Fetching comments for post ID: ${id}`);

    // Build upstream URL; forward any additional query params except id
    const upstreamBase = `https://rehearten-production.up.railway.app/comment/get/by-posts/${encodeURIComponent(String(id))}`;
    const forwardedQuery: Record<string, any> = { ...req.query } as any;
    delete forwardedQuery.id;
    const qs = new URLSearchParams(forwardedQuery as Record<string, string>).toString();
    const upstreamUrl = qs ? `${upstreamBase}?${qs}` : upstreamBase;

    const token = req.cookies?.token || process.env.DEV_DEMO_TOKEN;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (token) headers["Cookie"] = `token=${token}`;

    console.log(`Calling upstream: ${upstreamUrl}`);
    const r = await fetch(upstreamUrl, {
      method: "GET",
      headers,
    });

    const text = await r.text();
    console.log(`/api/comment/get/by-posts proxy: upstream status=${r.status} body:`, text);
    console.log("=============================");

    if (r.status >= 400 && process.env.NODE_ENV !== "production") {
      let parsed: any = text;
      try {
        parsed = JSON.parse(text);
      } catch (e) {}
      return res.status(r.status).json({ upstreamStatus: r.status, upstreamBody: parsed, upstreamHeaders: Object.fromEntries(r.headers.entries()) });
    }

    try {
      const data = JSON.parse(text);
      return res.status(r.status).json(data);
    } catch (e) {
      return res.status(r.status).send(text);
    }
  } catch (err: any) {
    console.error("GET comments proxy error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "proxy error" });
  }
}
