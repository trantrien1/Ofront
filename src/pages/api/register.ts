import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    console.debug("/api/register proxy: incoming headers:", req.headers);
    console.debug("/api/register proxy: incoming body:", req.body);

    const upstream = `https://rehearten-production.up.railway.app/register`;

    const r = await fetch(upstream, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const text = await r.text();
    console.debug(`/api/register proxy: upstream status=${r.status} body:`, text);

    // if upstream returned an error, expose details in dev to help debugging
    if (r.status >= 400 && process.env.NODE_ENV !== "production") {
      let parsed: any = text;
      try {
        parsed = JSON.parse(text);
      } catch (e) {}
      return res.status(r.status).json({ upstreamStatus: r.status, upstreamBody: parsed, upstreamHeaders: Object.fromEntries(r.headers.entries()) });
    }

    // try parse JSON
    try {
      const data = JSON.parse(text);
      return res.status(r.status).json(data);
    } catch (e) {
      // return raw text (e.g. token string)
      return res.status(r.status).send(text);
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "proxy error" });
  }
}
