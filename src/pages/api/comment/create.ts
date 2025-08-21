import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    console.log("=== CREATE COMMENT REQUEST ===");
    console.debug("/api/comment/create proxy: incoming headers:", req.headers);
    console.debug("/api/comment/create proxy: incoming body:", req.body);

    // Build payload: only include content and postId per backend DTO
    const incoming = req.body || {};
    const payload: Record<string, any> = {
      content: incoming.content,
      postId: incoming.postId,
    };

    console.log("Creating comment:", payload);

    const upstream = `https://rehearten-production.up.railway.app/comment/create`;

    const token = req.cookies?.token || process.env.DEV_DEMO_TOKEN;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (token) headers["Cookie"] = `token=${token}`;

    console.log(`Calling upstream: ${upstream}`);
    const r = await fetch(upstream, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    console.debug(`/api/comment/create proxy: upstream status=${r.status} body:`, text);
    console.log("==============================");

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
    console.error("CREATE comment proxy error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "proxy error" });
  }
}
