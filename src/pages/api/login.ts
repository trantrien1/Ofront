import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
  console.debug("/api/login proxy: incoming headers:", req.headers);
  console.debug("/api/login proxy: incoming body:", req.body);
    const upstream = `https://rehearten-production.up.railway.app/login`;

    const r = await fetch(upstream, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(req.body),
    });

  const text = await r.text();
  console.debug(`/api/login proxy: upstream status=${r.status} body:`, text);

    // try parse JSON
    try {
      const data = JSON.parse(text);
      // forward Set-Cookie from upstream if present so browser can store token
      const setCookie = r.headers.get("set-cookie");
      if (setCookie) {
        res.setHeader("Set-Cookie", setCookie);
      }
      if (r.status >= 400 && process.env.NODE_ENV !== "production") {
        // return upstream info to help debugging in dev
        return res.status(r.status).json({ upstreamStatus: r.status, upstreamBody: data, upstreamHeaders: Object.fromEntries(r.headers.entries()) });
      }
      return res.status(r.status).json(data);
    } catch (e) {
      if (r.status >= 400 && process.env.NODE_ENV !== "production") {
        return res.status(r.status).json({ upstreamStatus: r.status, upstreamBody: text, upstreamHeaders: Object.fromEntries(r.headers.entries()) });
      }
      // return raw text (e.g. token string)
      return res.status(r.status).send(text);
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "proxy error" });
  }
}
