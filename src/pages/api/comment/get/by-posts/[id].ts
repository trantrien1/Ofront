import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    console.log("=== GET COMMENTS FOR POST ===");
    console.log("/api/comment/get/by-posts/[id] proxy: incoming headers:", req.headers);
    console.log("/api/comment/get/by-posts/[id] proxy: incoming query:", req.query);

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

    // Honor explicit public mode from client: strip Authorization and cookies
    const xPublic = String(req.headers["x-public"] || "").toLowerCase();
    const forcePublic = xPublic === "1" || xPublic === "true";
    if (forcePublic) {
      delete headers["Authorization"];
      delete headers["Cookie"];
    }

    console.log("Calling upstream:", upstreamUrl);
    console.log("Resolved token source:", token ? `${tokenSource} len=${token.length}` : "none");
    console.log("Proxy headers to upstream:", headers);

    let r = await fetch(upstreamUrl, { method: "GET", headers });
    let text = await r.text();

    // If unauthorized/forbidden, try conservative retries toggling auth/cookie combos
    let retried = "none";
    if (r.status === 401 || r.status === 403) {
      if (headers["Authorization"] && headers["Cookie"]) {
        const retryHeaders = { ...headers } as Record<string, string>;
        delete retryHeaders["Cookie"];
        retried = "auth_only";
        console.log("Retrying upstream with auth_only headers");
        const r2 = await fetch(upstreamUrl, { method: "GET", headers: retryHeaders });
        const t2 = await r2.text();
        r = r2; text = t2;
      } else if (headers["Cookie"] && !headers["Authorization"]) {
        const retryHeaders = { ...headers } as Record<string, string>;
        delete retryHeaders["Cookie"];
        retried = "no_cookies";
        console.log("Retrying upstream without cookies");
        const r2 = await fetch(upstreamUrl, { method: "GET", headers: retryHeaders });
        const t2 = await r2.text();
        r = r2; text = t2;
      } else if (headers["Authorization"] && !headers["Cookie"]) {
        const retryHeaders = { ...headers } as Record<string, string>;
        delete retryHeaders["Authorization"];
        retried = "no_auth";
        console.log("Retrying upstream without Authorization header (public)");
        const r2 = await fetch(upstreamUrl, { method: "GET", headers: retryHeaders });
        const t2 = await r2.text();
        r = r2; text = t2;
      }
    }

    const snippet = typeof text === "string" ? text.slice(0, 2000) : String(text);
    console.log(`/api/comment/get/by-posts proxy: upstream status=${r.status}; retried=${retried}; body_snippet=${snippet.replace(/\n/g, " ")}`);
    console.log("=============================");

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
