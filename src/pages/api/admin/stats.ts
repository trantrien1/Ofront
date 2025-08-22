import type { NextApiRequest, NextApiResponse } from "next";

const UPSTREAM_API_BASE = "https://rehearten-production.up.railway.app";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Read token cookie from incoming request
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

    const upstream = `${UPSTREAM_API_BASE}/admin/stats`;
    
    const response = await fetch(upstream, {
      method: req.method,
      headers,
      ...(req.method !== 'GET' && { body: JSON.stringify(req.body) })
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

    // Try to parse as JSON, fallback to text
    try {
      const jsonData = JSON.parse(data);
      return res.status(response.status).json(jsonData);
    } catch (e) {
      return res.status(response.status).send(data);
    }
  } catch (error) {
    console.error("Admin Stats API Error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV !== "production" ? (error as Error).message : undefined
    });
  }
}
