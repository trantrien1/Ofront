import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    console.log("=== CREATE COMMENT REQUEST ===");
    console.debug("/api/comment/create proxy: incoming headers:", req.headers);
    console.debug("/api/comment/create proxy: incoming body:", req.body);

    // Build payload: only include content and postId per backend DTO
    const incoming = req.body || {};
    const payload: Record<string, any> = {
      content: incoming.content,
      postId: incoming.postId ?? incoming.id,
    };

    const upstream = `https://rehearten-production.up.railway.app/comment/create`;

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
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.toLowerCase().startsWith("bearer ")) {
        token = cleanToken(authHeader.substring(7));
      }
    }
    if (!token && typeof req.headers["x-access-token"] === "string") {
      token = cleanToken(req.headers["x-access-token"] as string);
    }
    if (!token && typeof req.headers["token"] === "string") {
      token = cleanToken(req.headers["token"] as string);
    }
    if (!token && cleanToken(req.cookies?.authToken)) token = cleanToken(req.cookies?.authToken);
    if (!token && cleanToken(req.cookies?.accessToken)) token = cleanToken(req.cookies?.accessToken);

    // Build headers for upstream
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": req.headers["user-agent"]?.toString() || "Mozilla/5.0 (proxy)",
    };
    const cookieParts: string[] = [];
    if (token) {
      cookieParts.push(`token=${token}`);
      headers["Authorization"] = `Bearer ${token}`;
    }
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

    console.log(`Calling upstream: ${upstream}`);
    console.log("Proxy headers to upstream:", headers);
    console.log("Payload:", payload);

    let r = await fetch(upstream, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    let text = await r.text();

    // If unauthorized/forbidden, try alternate body encodings and header combos
    let retried = "none";
    if (r.status === 401 || r.status === 403) {
      // Try without cookies
      const h1 = { ...headers } as Record<string, string>;
      delete h1["Cookie"];
      retried = "auth_only_json";
      console.log("Retrying upstream with auth_only_json");
      let r2 = await fetch(upstream, { method: "POST", headers: h1, body: JSON.stringify(payload) });
      let t2 = await r2.text();
      r = r2; text = t2;

      // If still failing, try form-encoded
      if (r.status === 401 || r.status === 403) {
        const form = new URLSearchParams();
        if (payload.content != null) form.set("content", String(payload.content));
        if (payload.postId != null) form.set("postId", String(payload.postId));
        const h2 = { ...headers, "Content-Type": "application/x-www-form-urlencoded" } as Record<string, string>;
        delete h2["Cookie"];
        retried = "auth_only_form";
        console.log("Retrying upstream with auth_only_form");
        r2 = await fetch(upstream, { method: "POST", headers: h2, body: form.toString() });
        t2 = await r2.text();
        r = r2; text = t2;
      }
    }

    console.debug(`/api/comment/create proxy: upstream status=${r.status}; retried=${retried}; body_snippet=${text.slice(0, 2000).replace(/\n/g, " ")}`);
    console.log("==============================");

    if (process.env.NODE_ENV !== "production") {
      res.setHeader("x-proxy-had-token", token ? "1" : "0");
      if (headers["Cookie"]) res.setHeader("x-proxy-cookie", headers["Cookie"]);
      res.setHeader("x-proxy-retried", retried || "none");
    }

    try {
      const data = JSON.parse(text || "null");
      return res.status(r.status).json(data);
    } catch (e) {
      return res.status(r.status).send(text);
    }
  } catch (err: any) {
    console.error("CREATE comment proxy error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "proxy error" });
  }
}
