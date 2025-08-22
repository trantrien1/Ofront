import type { NextApiRequest, NextApiResponse } from "next";

const UPSTREAM_API_BASE = "https://rehearten-production.up.railway.app";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    let token = req.cookies?.token;

    if (!token && process.env.DEV_DEMO_TOKEN) {
      token = process.env.DEV_DEMO_TOKEN;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
    
    if (token) {
      headers["Cookie"] = `token=${token}`;
    }

    const { limit } = req.query;
    const upstream = `${UPSTREAM_API_BASE}/admin/users/recent${limit ? `?limit=${limit}` : ''}`;
    
    const response = await fetch(upstream, {
      method: req.method,
      headers,
      ...(req.method !== 'GET' && { body: JSON.stringify(req.body) })
    });

    const data = await response.text();
    
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

    try {
      const jsonData = JSON.parse(data);
      return res.status(response.status).json(jsonData);
    } catch (e) {
      return res.status(response.status).send(data);
    }
  } catch (error) {
    console.error("Admin Recent Users API Error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV !== "production" ? (error as Error).message : undefined
    });
  }
}
