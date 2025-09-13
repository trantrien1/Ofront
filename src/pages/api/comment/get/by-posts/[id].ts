import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  try {


    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "post id required" });

    // Build upstream URL; forward any additional query params except id
    const upstreamBase = `https://rehearten-production.up.railway.app/comment/get/by-posts/${encodeURIComponent(String(id))}`;
    const forwardedQuery: Record<string, any> = { ...req.query } as any;
    delete forwardedQuery.id;
    const qs = new URLSearchParams(forwardedQuery as Record<string, string>).toString();
    const upstreamUrl = qs ? `${upstreamBase}?${qs}` : upstreamBase;

    // Helper to sanitize token values and ignore "undefined"/"null" strings
    const cleanToken = (t?: string | null) => {
      if (!t) return undefined;
      let s = String(t).trim();
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1);
      }
      if (!s) return undefined;
      // unwrap {"token":"<jwt>","role":"..."}
      if (s.startsWith('{') && s.endsWith('}')) {
        try { const obj: any = JSON.parse(s); if (obj && typeof obj.token === 'string') s = String(obj.token); } catch {}
      }
      const lower = s.toLowerCase();
      if (lower === "undefined" || lower === "null" || lower === "bearer") return undefined;
      return s;
    };

    // Extract token from various sources (cookie, Authorization, custom headers)
    let token = cleanToken(req.cookies?.token as string | undefined);
    let tokenSource = "cookie.token";
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.toLowerCase().startsWith("bearer ")) {
        token = cleanToken(authHeader.substring(7));
        tokenSource = "header.authorization";
      }
    }
    if (!token && typeof req.headers["x-access-token"] === "string") {
      token = cleanToken(req.headers["x-access-token"] as string);
      tokenSource = "header.x-access-token";
    }
    if (!token && typeof req.headers["token"] === "string") {
      token = cleanToken(req.headers["token"] as string);
      tokenSource = "header.token";
    }
    if (!token && cleanToken(req.cookies?.authToken)) {
      token = cleanToken(req.cookies?.authToken);
      tokenSource = "cookie.authToken";
    }
    if (!token && cleanToken(req.cookies?.accessToken)) {
      token = cleanToken(req.cookies?.accessToken);
      tokenSource = "cookie.accessToken";
    }

    // Build headers for upstream
  const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": req.headers["user-agent"]?.toString() || "Mozilla/5.0 (proxy)",
    };
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

    // If there is no auth token at all, hint upstream to allow public access
    if (!token) {
      (headers as any)["x-public"] = "1";
    }

    // Honor explicit public mode from client: strip Authorization and cookies
    const xPublic = String(req.headers["x-public"] || "").toLowerCase();
    const forcePublic = xPublic === "1" || xPublic === "true";
    if (forcePublic) {
      delete headers["Authorization"];
      delete headers["Cookie"];
    }


  let r = await fetch(upstreamUrl, { method: "GET", headers });
    let text = await r.text();

    // If unauthorized/forbidden, try conservative retries toggling auth/cookie combos
    let retried = "none";
    if (r.status === 401 || r.status === 403) {
      if (headers["Authorization"] && headers["Cookie"]) {
        const retryHeaders = { ...headers } as Record<string, string>;
        delete retryHeaders["Cookie"];
        retried = "auth_only";
        const r2 = await fetch(upstreamUrl, { method: "GET", headers: retryHeaders });
        const t2 = await r2.text();
        r = r2; text = t2;
      } else if (headers["Cookie"] && !headers["Authorization"]) {
        const retryHeaders = { ...headers } as Record<string, string>;
        delete retryHeaders["Cookie"];
        retried = "no_cookies";
        const r2 = await fetch(upstreamUrl, { method: "GET", headers: retryHeaders });
        const t2 = await r2.text();
        r = r2; text = t2;
      } else if (headers["Authorization"] && !headers["Cookie"]) {
        const retryHeaders = { ...headers } as Record<string, string>;
        delete retryHeaders["Authorization"];
        retried = "no_auth";
        const r2 = await fetch(upstreamUrl, { method: "GET", headers: retryHeaders });
        const t2 = await r2.text();
        r = r2; text = t2;
      } else {
        // Final explicit public retry with x-public header
        const publicHeaders: Record<string, string> = { Accept: "application/json", "x-public": "1" };
        const r2 = await fetch(upstreamUrl, { method: "GET", headers: publicHeaders });
        const t2 = await r2.text();
        r = r2; text = t2; retried = "explicit_public";
      }
    }

    const snippet = typeof text === "string" ? text.slice(0, 2000) : String(text);
 

    if (process.env.NODE_ENV !== "production") {
      res.setHeader("x-proxy-had-token", token ? "1" : "0");
      res.setHeader("x-proxy-token-source", token ? tokenSource : "none");
      if (headers["Cookie"]) res.setHeader("x-proxy-cookie", headers["Cookie"]);
      res.setHeader("x-proxy-retried", retried || "none");
    }

    // Pass-through response
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
    console.error("GET comments proxy error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "proxy error" });
  }
}
