import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`[debug/click] ${req.method} request received from ${req.headers['user-agent']?.slice(0,50) || 'unknown'}`);
  
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    // Handle both JSON and text body (sendBeacon sends as text)
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // keep as string if not JSON
      }
    }
    
    console.log("=== COMMENT BUTTON CLICKED ===");
    console.log("[debug/click] Body:", body);
    console.log("[debug/click] Content-Type:", req.headers['content-type']);
    console.log("[debug/click] Method:", req.method);
    console.log("===============================");
    
    return res.status(200).json({ ok: true, received: body });
  } catch (err: any) {
    console.error("[debug/click] handler error:", err?.message || err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
