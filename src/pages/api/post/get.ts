import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { query } = req;
    // Build query string without empty params (e.g., omit title= or typeSort= when empty)
    const params = new URLSearchParams();
    Object.entries(query as Record<string, any>).forEach(([key, value]) => {
      const val = Array.isArray(value) ? value.find((v) => v !== "" && v != null) : value;
      if (val !== "" && val != null) params.set(key, String(val));
    });
    const queryString = params.toString();
    const upstream = `https://rehearten-production.up.railway.app/post/get${queryString ? "?" + queryString : ""}`;

    // Extract token from cookie or Authorization header
    let token = req.cookies?.token as string | undefined;
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) token = authHeader.substring(7);
    }

    // Build headers for upstream
    const headers: Record<string, string> = { Accept: "application/json" };
    const cookieParts: string[] = [];
    if (token) {
      cookieParts.push(`token=${token}`);
      headers["Authorization"] = `Bearer ${token}`;
    }
    // Forward upstream session if available (from our proxy cookie or direct)
    const upstreamSession =
      req.cookies?.UPSTREAM_JSESSIONID ||
      req.cookies?.JSESSIONID ||
      (req.cookies as any)?.jsessionid;
    if (upstreamSession) cookieParts.push(`JSESSIONID=${upstreamSession}`);
    if (cookieParts.length > 0) headers["Cookie"] = cookieParts.join("; ");

  console.log("Proxy headers:", headers);
  let r = await fetch(upstream, { headers });
    let text = await r.text();

    // Pass-through response
    if (process.env.NODE_ENV !== "production") {
      res.setHeader("x-proxy-had-token", token ? "1" : "0");
      if (headers["Cookie"]) res.setHeader("x-proxy-cookie", headers["Cookie"]);
    }

    // If 304, try once with no-cache
    if (r.status === 304) {
      const retryHeaders = { ...headers, "Cache-Control": "no-cache" } as Record<string, string>;
      const r2 = await fetch(upstream, { headers: retryHeaders });
      const t2 = await r2.text();
      r = r2;
      text = t2;
    }

    const contentType = r.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const data = JSON.parse(text || "null");
        return res.status(r.status).json(data);
      } catch {
        // fall back to text
      }
    }
    return res.status(r.status).send(text);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "proxy error" });
  }
}
