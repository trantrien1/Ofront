import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
  // Preserve original query string exactly (including empty keys like title=&typeSort=)
  const originalQS = (req.url && req.url.includes("?")) ? req.url.split("?")[1] : "";
  const upstream = `https://rehearten-production.up.railway.app/post/get${originalQS ? "?" + originalQS : ""}`;

    // Helper to sanitize token values and ignore "undefined"/"null" strings
    const cleanToken = (t?: string | null) => {
      if (!t) return undefined;
      let s = String(t).trim();
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1);
      }
      if (!s) return undefined;
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
      // Some providers return 403 on requests without a UA; send a generic one
      "User-Agent": req.headers["user-agent"]?.toString() || "Mozilla/5.0 (proxy)"
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

  // Dev logging: show what we will send upstream
  console.log("Proxy -> upstream URL:", upstream);
  console.log("Incoming cookies:", req.cookies);
  console.log("Incoming auth header:", req.headers.authorization);
  console.log("Resolved token source:", tokenSource, "len=", token?.length || 0);
  console.log("Proxy headers to upstream:", headers);

  let r = await fetch(upstream, { headers });
  let text = await r.text();

  // If unauthorized/forbidden, try a conservative retry: toggle auth/cookie combos
  let retried = "none";
  if ((r.status === 401 || r.status === 403)) {
    // Strategy 1: if we sent both Authorization and Cookie, try only Authorization
    if (headers["Authorization"] && headers["Cookie"]) {
      const retryHeaders: Record<string, string> = { ...headers };
      delete retryHeaders["Cookie"];
      retried = "auth_only";
      console.log("Retrying upstream with auth_only headers");
      const r2 = await fetch(upstream, { headers: retryHeaders });
      const t2 = await r2.text();
      r = r2; text = t2;
    } else if (headers["Cookie"] && !headers["Authorization"]) {
      // Strategy 2: if we only sent Cookie, try without cookies
      const retryHeaders: Record<string, string> = { ...headers };
      delete retryHeaders["Cookie"];
      retried = "no_cookies";
      console.log("Retrying upstream without cookies");
      const r2 = await fetch(upstream, { headers: retryHeaders });
      const t2 = await r2.text();
      r = r2; text = t2;
    } else if (headers["Authorization"] && !headers["Cookie"]) {
      // Strategy 3: if we only sent Authorization, try without auth (public mode)
      const retryHeaders: Record<string, string> = { ...headers };
      delete retryHeaders["Authorization"];
      retried = "no_auth";
      console.log("Retrying upstream without Authorization header (public)");
      const r2 = await fetch(upstream, { headers: retryHeaders });
      const t2 = await r2.text();
      r = r2; text = t2;
    }
  }

  // Log upstream response for debugging (truncate to avoid huge output)
  const snippet = typeof text === "string" ? text.slice(0, 2000) : String(text);
  console.log(`Upstream response status=${r.status}; retried=${retried}; body_snippet=${snippet.replace(/\n/g, " ")}`);

    // Pass-through response
    if (process.env.NODE_ENV !== "production") {
      res.setHeader("x-proxy-had-token", token ? "1" : "0");
      res.setHeader("x-proxy-token-source", token ? tokenSource : "none");
      if (headers["Cookie"]) res.setHeader("x-proxy-cookie", headers["Cookie"]);
      res.setHeader("x-proxy-retried", retried || "none");
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
