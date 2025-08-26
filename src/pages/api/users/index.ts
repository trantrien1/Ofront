import type { NextApiRequest, NextApiResponse } from "next";

const UPSTREAM = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || "GET";

  // no-store cache for user data
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  // Build auth from incoming request
  const bearer = req.headers.authorization;
  const token = req.cookies?.token;
  const jsession = req.cookies?.UPSTREAM_JSESSIONID;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (bearer) headers["Authorization"] = String(bearer);
  if (token) headers["Cookie"] = `token=${token}` + (jsession ? `; JSESSIONID=${jsession}` : "");
  else if (jsession) headers["Cookie"] = `JSESSIONID=${jsession}`;

  try {
    if (method === "GET") {
      const qs = Object.keys(req.query || {})
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String((req.query as any)[k]))}`)
        .join("&");

      const candidates = [
        `/users${qs ? `?${qs}` : ""}`,
        `/api/users${qs ? `?${qs}` : ""}`,
        `/user${qs ? `?${qs}` : ""}`,
        `/api/user${qs ? `?${qs}` : ""}`,
      ];

      for (const path of candidates) {
        try {
          const upstream = `${UPSTREAM}${path}`;
          const r = await fetch(upstream, { method: "GET", headers });
          const text = await r.text();
          // If not ok, try next candidate
          if (!r.ok) continue;
          try {
            const data = JSON.parse(text);
            return res.status(r.status).json(data);
          } catch {
            return res.status(r.status).send(text);
          }
        } catch {
          // try next
        }
      }

      return res.status(502).json({ error: "Could not fetch users from upstream" });
    }

    if (method === "POST") {
      const upstream = `${UPSTREAM}/users`;
      const r = await fetch(upstream, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(req.body || {}),
      });
      const text = await r.text();
      try {
        const data = JSON.parse(text);
        return res.status(r.status).json(data);
      } catch {
        return res.status(r.status).send(text);
      }
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end("Method Not Allowed");
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") {
      console.error("/api/users proxy error:", err?.message || err);
    }
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
