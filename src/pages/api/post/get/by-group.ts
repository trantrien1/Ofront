import type { NextApiRequest, NextApiResponse } from "next";

// Proxy for upstream GET /post/get/by-group
// Accepts query params: groupId (required), sort (optional), typeSort (optional)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }
  res.setHeader("Cache-Control", "no-store");

  // Preserve original query string exactly (including empty values)
  const originalQS = req.url && req.url.includes("?") ? req.url.split("?")[1] : "";
  const upstreamBase = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";
  const upstream = `${upstreamBase}/post/get/by-group${originalQS ? "?" + originalQS : ""}`;
  // Build a cleaned query string that drops empty or undefined/null values (fallback only)
  let cleanedQS = "";
  try {
    const usp = new URLSearchParams(originalQS || "");
    // Remove keys with empty values or explicit undefined/null
    const toDelete: string[] = [];
    usp.forEach((v, k) => {
      const val = (v ?? "").trim();
      const low = val.toLowerCase();
      if (val === "" || low === "undefined" || low === "null") {
        toDelete.push(k);
      }
    });
    for (const k of toDelete) usp.delete(k);
    cleanedQS = usp.toString();
  } catch {}
  const upstreamCleaned = `${upstreamBase}/post/get/by-group${cleanedQS ? "?" + cleanedQS : ""}`;

  // Helper to sanitize token values and ignore "undefined"/"null"
  const cleanToken = (t?: string | null) => {
    if (!t) return undefined;
    let s = String(t).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
    if (!s) return undefined;
    // Some backends set a JSON string in the cookie, like {"token":"<jwt>", ...}
    if (s.startsWith("{") && s.endsWith("}")) {
      try { const obj: any = JSON.parse(s); if (obj && typeof obj.token === "string" && obj.token) s = String(obj.token); } catch {}
    }
    const lower = s.toLowerCase();
    if (lower === "undefined" || lower === "null" || lower === "bearer") return undefined;
    return s;
  };

  // Extract token from cookies or headers
  let token = cleanToken(req.cookies?.token as string | undefined);
  let tokenSource = "cookie.token";
  if (!token) {
    const auth = req.headers.authorization || "";
    if (auth.toLowerCase().startsWith("bearer ")) {
      token = cleanToken(auth.slice(7));
      tokenSource = "header.authorization";
    }
  }
  if (!token && typeof req.headers["x-access-token"] === "string") {
    token = cleanToken(req.headers["x-access-token"] as string);
    tokenSource = "header.x-access-token";
  }
  if (!token && cleanToken(req.cookies?.authToken)) { token = cleanToken(req.cookies?.authToken); tokenSource = "cookie.authToken"; }
  if (!token && cleanToken(req.cookies?.accessToken)) { token = cleanToken(req.cookies?.accessToken); tokenSource = "cookie.accessToken"; }

  // Build headers and optional Cookie for upstream
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": req.headers["user-agent"]?.toString() || "Mozilla/5.0 (proxy)",
  };
  const cookieParts: string[] = [];
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    cookieParts.push(`token=${token}`);
  }
  const upstreamSession = (req.cookies?.UPSTREAM_JSESSIONID || req.cookies?.JSESSIONID || (req.cookies as any)?.jsessionid) as string | undefined;
  if (upstreamSession) cookieParts.push(`JSESSIONID=${upstreamSession}`);
  if (cookieParts.length) headers["Cookie"] = cookieParts.join("; ");

  // Optional public mode toggle
  const xPublic = String(req.headers["x-public"] || "").toLowerCase();
  const forcePublic = xPublic === "1" || xPublic === "true";
  if (forcePublic) {
    delete headers["Authorization"]; delete headers["Cookie"]; headers["x-public"] = "1";
  }

  // Diagnostics in dev
  if (process.env.NODE_ENV !== "production") {
    console.log("[post/get/by-group] ->", upstream);
    console.log("tokenSource=", tokenSource, "hasToken=", !!token, "forcePublic=", forcePublic);
    console.log("forward headers:", headers);
  }

  try {
    let r = await fetch(upstream, { headers });
    let text = await r.text();
    if (process.env.NODE_ENV !== "production") {
      try { console.log("[post/get/by-group] upstream status=", r.status, "url=", upstream); } catch {}
    }

    // Retry strategies on 401/403
    let retried: string | undefined;
    if (r.status === 401 || r.status === 403) {
      // Try auth only
      if (headers["Authorization"] && headers["Cookie"]) {
        const h2 = { ...headers }; delete h2["Cookie"]; retried = "auth_only";
        const r2 = await fetch(upstream, { headers: h2 }); r = r2; text = await r2.text();
      } else if (headers["Authorization"]) {
        const h2 = { ...headers }; delete h2["Authorization"]; retried = "no_auth";
        const r2 = await fetch(upstream, { headers: h2 }); r = r2; text = await r2.text();
      } else if (headers["Cookie"]) {
        const h2 = { ...headers }; delete h2["Cookie"]; retried = "no_cookies";
        const r2 = await fetch(upstream, { headers: h2 }); r = r2; text = await r2.text();
      } else if (!forcePublic) {
        const h2 = { ...headers }; delete h2["Authorization"]; delete h2["Cookie"]; (h2 as any)["x-public"] = "1"; retried = "explicit_public";
        const r2 = await fetch(upstream, { headers: h2 }); r = r2; text = await r2.text();
      }
      if (process.env.NODE_ENV !== "production") {
        console.log("[post/get/by-group] retried=", retried, "status=", r.status);
      }
    }

    // If server error and we had empty params, retry with cleaned query once
    if ((r.status >= 400) && originalQS && cleanedQS !== originalQS) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[post/get/by-group] retry with cleaned query:", upstreamCleaned);
      }
      const r2 = await fetch(upstreamCleaned, { headers });
      const t2 = await r2.text();
      if (process.env.NODE_ENV !== "production") {
        try { console.log("[post/get/by-group] cleaned status=", r2.status); } catch {}
      }
      if (r2.headers.get("content-type")?.includes("application/json")) {
        try { const j2 = JSON.parse(t2 || "null"); return res.status(r2.status).json(j2); } catch {}
      }
      return res.status(r2.status).send(t2);
    }

    // Fallback: if still failing (4xx/5xx), try legacy endpoint /post/get?communityId={id}
    if (r.status >= 400) {
      // Extract groupId from originalQS
      let gid: string | undefined;
      try { const usp = new URLSearchParams(originalQS || ""); gid = usp.get("groupId") || undefined; } catch {}
      if (gid) {
        const legacyUrl = `${upstreamBase}/post/get?communityId=${encodeURIComponent(String(gid))}`;
        if (process.env.NODE_ENV !== "production") {
          try { console.log("[post/get/by-group] legacy fallback ->", legacyUrl); } catch {}
        }
        const r3 = await fetch(legacyUrl, { headers });
        const t3 = await r3.text();
        if (process.env.NODE_ENV !== "production") {
          try { console.log("[post/get/by-group] legacy status=", r3.status); } catch {}
        }
        if (r3.headers.get("content-type")?.includes("application/json")) {
          try { const j3 = JSON.parse(t3 || "null"); return res.status(r3.status).json(j3); } catch {}
        }
        return res.status(r3.status).send(t3);
      }
    }

    // On any error status, soften to empty array regardless of content-type
    if (r.status >= 400) {
      if (process.env.NODE_ENV !== "production") {
        try { console.log("[post/get/by-group] soft-empty on error status=", r.status); } catch {}
      }
      res.setHeader("x-proxy-fallback", "empty-on-error");
      return res.status(200).json([]);
    }
    // Return JSON if possible
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try { const json = JSON.parse(text || "null"); return res.status(r.status).json(json); } catch {}
    }
    return res.status(r.status).send(text);
  } catch (e: any) {
    // Network or unexpected error: soften to empty list to keep page working
    if (process.env.NODE_ENV !== "production") {
      try { console.log("[post/get/by-group] exception -> soft-empty:", e?.message || e); } catch {}
    }
    res.setHeader("x-proxy-fallback", "empty-on-exception");
    return res.status(200).json([]);
  }
}
