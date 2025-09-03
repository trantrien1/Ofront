import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const upstream = `https://rehearten-production.up.railway.app/login`;
    const r = await fetch(upstream, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(req.body),
    });

    // Forward Set-Cookie from upstream as-is (server manages HttpOnly cookie)
    const setCookie = r.headers.get("set-cookie");
    if (setCookie) res.setHeader("Set-Cookie", setCookie);

    const ct = r.headers.get("content-type") || "";
    const body = ct.includes("application/json") ? await r.json() : await r.text();
    return res.status(r.status).send(body);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "proxy error" });
  }
}
