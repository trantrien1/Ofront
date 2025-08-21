import type { NextApiRequest, NextApiResponse } from "next";

const DEV_DEMO_TOKEN = process.env.DEV_DEMO_TOKEN || "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || "GET";
  const token = (req.cookies && (req.cookies as any).token) || DEV_DEMO_TOKEN;

  // Build upstream url
  const upstreamBase = `https://rehearten-production.up.railway.app/notifications`;

  try {
    if (method === "GET") {
      // Forward query params (e.g., userId)
      const queryString = Object.keys(req.query || {})
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String((req.query as any)[k]))}`)
        .join("&");
      const upstream = `${upstreamBase}${queryString ? "?" + queryString : ""}`;
      const r = await fetch(upstream, {
        method: "GET",
        headers: {
          Cookie: `token=${token}`,
          Accept: "application/json",
        },
      });
      const text = await r.text();
      try {
        const json = JSON.parse(text);
        res.status(r.status).json(json);
      } catch (e) {
        res.status(r.status).send(text);
      }
      return;
    }

    if (method === "POST") {
      // create notification
      const upstream = upstreamBase;
      const r = await fetch(upstream, {
        method: "POST",
        headers: {
          Cookie: `token=${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(req.body || {}),
      });
      const json = await r.json();
      res.status(r.status).json(json);
      return;
    }

    if (method === "PATCH") {
      // mark read (backend expects patch to /notifications with body { id, read: true })
      const upstream = upstreamBase;
      const r = await fetch(upstream, {
        method: "PATCH",
        headers: {
          Cookie: `token=${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(req.body || {}),
      });
      const json = await r.json();
      res.status(r.status).json(json);
      return;
    }

    res.setHeader("Allow", ["GET", "POST", "PATCH"]);
    res.status(405).end(`Method ${method} Not Allowed`);
  } catch (err: any) {
    console.error("/api/notifications proxy error:", err?.message || err);
    res.status(500).json({ error: err?.message || String(err) });
  }
}
