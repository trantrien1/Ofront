import type { NextApiRequest, NextApiResponse } from "next";

const UPSTREAM_API_BASE = "https://rehearten-production.up.railway.app";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // read token cookie from incoming request
    let token = req.cookies?.token;

    // Development helper: allow a demo token to be supplied via env var
    if (!token && process.env.DEV_DEMO_TOKEN) {
      token = process.env.DEV_DEMO_TOKEN;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
    
    if (token) {
      // upstream expects token in Cookie header
      headers["Cookie"] = `token=${token}`;
    }

    const upstream = `${UPSTREAM_API_BASE}/posts/create`;
    
    const response = await fetch(upstream, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body)
    });

    const data = await response.text();
    
    // if upstream returned an error, expose details in dev to help debugging
    if (response.status >= 400 && process.env.NODE_ENV !== "production") {
      let parsed: any = data;
      try {
        parsed = JSON.parse(data);
      } catch (e) {}
      return res.status(response.status).json({ 
        upstreamStatus: response.status, 
        upstreamBody: parsed, 
        upstreamHeaders: Object.fromEntries(response.headers.entries()) 
      });
    }

    // try parse JSON
    try {
      const jsonData = JSON.parse(data);
      res.status(response.status).json(jsonData);
    } catch (e) {
      res.status(response.status).send(data);
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "proxy error" });
  }
}
