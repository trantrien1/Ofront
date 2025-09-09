import type { NextApiRequest, NextApiResponse } from "next";

// Proxy for upstream GET /post/get/by-group
// Accepts query params: groupId (required), sort (optional), typeSort (optional)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }
  res.setHeader("Cache-Control", "no-store");
  const isProd = process.env.NODE_ENV === "production";

  // Preserve original query string exactly (including empty values)
  const originalQS = req.url && req.url.includes("?") ? req.url.split("?")[1] : "";
  const upstreamBase = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";
  const upstreamOriginal = `${upstreamBase}/post/get/by-group${originalQS ? "?" + originalQS : ""}`;
  // Build QS variants with separate instances
  const usp0 = new URLSearchParams(originalQS || "");
  const qsNoTypeSort = (() => { const u = new URLSearchParams(usp0); u.delete("typeSort"); return u.toString(); })();
  const qsWithTypeSortDesc = (() => { const u = new URLSearchParams(usp0); u.set("typeSort", "desc"); return u.toString(); })();
  const upstreamNoTypeSort = `${upstreamBase}/post/get/by-group${qsNoTypeSort ? "?" + qsNoTypeSort : ""}`;
  const upstreamWithTypeSort = `${upstreamBase}/post/get/by-group${qsWithTypeSortDesc ? "?" + qsWithTypeSortDesc : ""}`;
  // Variant: enforce sort=createdAt&typeSort=DESC (some backends don't support sort=like)
  let qsSortCreatedAtDesc = "";
  try {
    const usp = new URLSearchParams(originalQS || "");
  // Backend expects 'time' not 'createdAt'; and lowercase dir
  usp.set("sort", "time");
  usp.set("typeSort", "desc");
    qsSortCreatedAtDesc = usp.toString();
  } catch {}
  const upstreamSortCreatedAtDesc = `${upstreamBase}/post/get/by-group${qsSortCreatedAtDesc ? "?" + qsSortCreatedAtDesc : ""}`;
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
  // Encode token in cookie like the global proxy does
  cookieParts.push(`token=${encodeURIComponent(token)}`);
  }
  const upstreamSession = (req.cookies?.UPSTREAM_JSESSIONID || req.cookies?.JSESSIONID || (req.cookies as any)?.jsessionid) as string | undefined;
  if (upstreamSession) cookieParts.push(`JSESSIONID=${upstreamSession}`);
  if (cookieParts.length) headers["Cookie"] = cookieParts.join("; ");

  // Optional public mode toggle
  const xPublic = String(req.headers["x-public"] || "").toLowerCase();
  const forcePublic = xPublic === "1" || xPublic === "true";
  // Auto public when no token present (mirror global behavior path)
  const autoPublic = !token;
  if (forcePublic || autoPublic) {
    delete headers["Authorization"]; delete headers["Cookie"]; headers["x-public"] = "1";
  }

  // Diagnostics (avoid leaking cookies)
  if (!isProd) {
    console.log("[post/get/by-group] ->", upstreamOriginal);
    if (token) console.log("tokenSource=", tokenSource, "hasToken=", !!token, "forcePublic=", forcePublic);
    console.log("forward headers:", { ...headers, Cookie: headers["Cookie"] ? "<omitted>" : undefined });
  }

  // Helper: set diagnostic headers consistently (prod + dev)
  const setDiagHeaders = (p: { source: string; upstreamUrl?: string; upstreamStatus?: number; retryTag?: string }) => {
    try {
      res.setHeader("x-proxy-source", p.source);
      if (p.upstreamUrl) res.setHeader("x-proxy-upstream", p.upstreamUrl);
      if (typeof p.upstreamStatus === "number") res.setHeader("x-proxy-upstream-status", String(p.upstreamStatus));
      if (p.retryTag) res.setHeader("x-proxy-retry", p.retryTag);
    } catch {}
  };

  // Helper: fetch with timeout and consistent response reading
  const tryFetch = async (url: string, h: Record<string, string>, tag?: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const r = await fetch(url, { headers: h, signal: controller.signal });
      const text = await r.text();
      return { r, text, ok: r.ok, status: r.status, url, tag };
    } catch (e) {
      return { r: undefined as any, text: "", ok: false, status: 0, url, tag, error: e };
    } finally {
      clearTimeout(timeout);
    }
  };

  // Validate required groupId early
  let groupIdMissing = false;
  try { const usp = new URLSearchParams(originalQS || ""); if (!usp.get("groupId")) groupIdMissing = true; } catch {}
  if (groupIdMissing) {
    setDiagHeaders({ source: "missing-param", upstreamUrl: upstreamOriginal, upstreamStatus: 400 });
    res.setHeader("x-proxy-fallback", "missing-param");
    return res.status(400).json({ error: "groupId required" });
  }

  try {
    // Attempt 1: original
    let attempt = await tryFetch(upstreamOriginal, headers, "original");
    if (!isProd) console.log("[post/get/by-group] status=", attempt.status, "url=", attempt.url);
    if (attempt.ok) {
      setDiagHeaders({ source: "primary", upstreamUrl: attempt.url, upstreamStatus: attempt.status, retryTag: attempt.tag });
      const ct = (attempt.r?.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("application/json")) { try { return res.status(attempt.status).json(JSON.parse(attempt.text || "null")); } catch {} }
      return res.status(attempt.status).send(attempt.text);
    }

    // 401/403 recovery on original
    if (attempt.status === 401 || attempt.status === 403) {
      if (headers["Authorization"] && headers["Cookie"]) {
        const h2 = { ...headers }; delete h2["Cookie"]; const a2 = await tryFetch(upstreamOriginal, h2, "auth_only");
        if (a2.ok) { setDiagHeaders({ source: "primary", upstreamUrl: a2.url, upstreamStatus: a2.status, retryTag: String(a2.tag) }); const ct=(a2.r?.headers.get("content-type")||"").toLowerCase(); if (ct.includes("application/json")) { try { return res.status(a2.status).json(JSON.parse(a2.text||"null")); } catch {} } return res.status(a2.status).send(a2.text); }
      }
      if (headers["Authorization"]) {
        const h2 = { ...headers }; delete h2["Authorization"]; const a2 = await tryFetch(upstreamOriginal, h2, "no_auth");
        if (a2.ok) { setDiagHeaders({ source: "primary", upstreamUrl: a2.url, upstreamStatus: a2.status, retryTag: String(a2.tag) }); const ct=(a2.r?.headers.get("content-type")||"").toLowerCase(); if (ct.includes("application/json")) { try { return res.status(a2.status).json(JSON.parse(a2.text||"null")); } catch {} } return res.status(a2.status).send(a2.text); }
      }
      if (headers["Cookie"]) {
        const h2 = { ...headers }; delete h2["Cookie"]; const a2 = await tryFetch(upstreamOriginal, h2, "no_cookies");
        if (a2.ok) { setDiagHeaders({ source: "primary", upstreamUrl: a2.url, upstreamStatus: a2.status, retryTag: String(a2.tag) }); const ct=(a2.r?.headers.get("content-type")||"").toLowerCase(); if (ct.includes("application/json")) { try { return res.status(a2.status).json(JSON.parse(a2.text||"null")); } catch {} } return res.status(a2.status).send(a2.text); }
      }
      if (!forcePublic) {
        const h2 = { ...headers }; delete h2["Authorization"]; delete h2["Cookie"]; (h2 as any)["x-public"] = "1"; const a2 = await tryFetch(upstreamOriginal, h2, "explicit_public");
        if (a2.ok) { setDiagHeaders({ source: "primary", upstreamUrl: a2.url, upstreamStatus: a2.status, retryTag: String(a2.tag) }); const ct=(a2.r?.headers.get("content-type")||"").toLowerCase(); if (ct.includes("application/json")) { try { return res.status(a2.status).json(JSON.parse(a2.text||"null")); } catch {} } return res.status(a2.status).send(a2.text); }
      }
    }

    // Attempt 2: with typeSort=DESC
    attempt = await tryFetch(upstreamWithTypeSort, headers, "typeSort:DESC");
    if (!isProd) console.log("[post/get/by-group] status=", attempt.status, "url=", attempt.url);
    if (attempt.ok) { setDiagHeaders({ source: "primary", upstreamUrl: attempt.url, upstreamStatus: attempt.status, retryTag: attempt.tag }); const ct=(attempt.r?.headers.get("content-type")||"").toLowerCase(); if (ct.includes("application/json")) { try { return res.status(attempt.status).json(JSON.parse(attempt.text||"null")); } catch {} } return res.status(attempt.status).send(attempt.text); }

    // Attempt 3: without typeSort
    attempt = await tryFetch(upstreamNoTypeSort, headers, "noTypeSort");
    if (!isProd) console.log("[post/get/by-group] status=", attempt.status, "url=", attempt.url);
    if (attempt.ok) { setDiagHeaders({ source: "primary", upstreamUrl: attempt.url, upstreamStatus: attempt.status, retryTag: attempt.tag }); const ct=(attempt.r?.headers.get("content-type")||"").toLowerCase(); if (ct.includes("application/json")) { try { return res.status(attempt.status).json(JSON.parse(attempt.text||"null")); } catch {} } return res.status(attempt.status).send(attempt.text); }

    // Attempt 4: cleaned QS
    if (originalQS && cleanedQS !== originalQS) {
      attempt = await tryFetch(upstreamCleaned, headers, "cleaned");
      if (!isProd) console.log("[post/get/by-group] status=", attempt.status, "url=", attempt.url);
      if (attempt.ok) { setDiagHeaders({ source: "primary", upstreamUrl: attempt.url, upstreamStatus: attempt.status, retryTag: attempt.tag }); const ct=(attempt.r?.headers.get("content-type")||"").toLowerCase(); if (ct.includes("application/json")) { try { return res.status(attempt.status).json(JSON.parse(attempt.text||"null")); } catch {} } return res.status(attempt.status).send(attempt.text); }
    }

    // Attempt 5: sort=createdAt&typeSort=DESC
    attempt = await tryFetch(upstreamSortCreatedAtDesc, headers, "sort:createdAt");
    if (!isProd) console.log("[post/get/by-group] status=", attempt.status, "url=", attempt.url);
    if (attempt.ok) { setDiagHeaders({ source: "primary", upstreamUrl: attempt.url, upstreamStatus: attempt.status, retryTag: attempt.tag }); const ct=(attempt.r?.headers.get("content-type")||"").toLowerCase(); if (ct.includes("application/json")) { try { return res.status(attempt.status).json(JSON.parse(attempt.text||"null")); } catch {} } return res.status(attempt.status).send(attempt.text); }

    // Attempt 6: explicit public with typeSort=DESC
    const hPublic = { ...headers } as Record<string, string>;
    hPublic["x-public"] = "1"; delete hPublic["Authorization"]; delete hPublic["Cookie"];
    attempt = await tryFetch(upstreamWithTypeSort, hPublic, "public");
    if (!isProd) console.log("[post/get/by-group] status=", attempt.status, "url=", attempt.url);
    if (attempt.ok) { setDiagHeaders({ source: "primary", upstreamUrl: attempt.url, upstreamStatus: attempt.status, retryTag: attempt.tag }); const ct=(attempt.r?.headers.get("content-type")||"").toLowerCase(); if (ct.includes("application/json")) { try { return res.status(attempt.status).json(JSON.parse(attempt.text||"null")); } catch {} } return res.status(attempt.status).send(attempt.text); }

    // Legacy fallback
    let gid: string | undefined; try { const u = new URLSearchParams(originalQS || ""); gid = u.get("groupId") || undefined; } catch {}
    if (gid) {
      const legacyUrl = `${upstreamBase}/post/get?communityId=${encodeURIComponent(String(gid))}`;
      const legacy = await tryFetch(legacyUrl, headers, "legacy");
      if (!isProd) console.log("[post/get/by-group] legacy status=", legacy.status);
      if (legacy.ok) {
        res.setHeader("x-proxy-fallback", "legacy");
        res.setHeader("x-proxy-legacy-url", legacy.url);
        res.setHeader("x-proxy-legacy-status", String(legacy.status));
        setDiagHeaders({ source: "legacy", upstreamUrl: legacy.url, upstreamStatus: legacy.status });
        const ct=(legacy.r?.headers.get("content-type")||"").toLowerCase();
        if (ct.includes("application/json")) { try { return res.status(legacy.status).json(JSON.parse(legacy.text||"null")); } catch {} }
        return res.status(legacy.status).send(legacy.text);
      }
    }

    // All attempts failed
    res.setHeader("x-proxy-fallback", "empty-on-error");
    setDiagHeaders({ source: "empty-on-error", upstreamUrl: upstreamOriginal, upstreamStatus: attempt.status });
    if (isProd) {
      return res.status(502).json({ error: "Upstream failed after retries", hint: "proxy empty-on-error; check params or backend logs" });
    }
    return res.status(200).json([]);
  } catch (e: any) {
    res.setHeader("x-proxy-fallback", "empty-on-exception");
    setDiagHeaders({ source: "empty-on-exception", upstreamUrl: upstreamOriginal });
    if (isProd) {
      return res.status(502).json({ error: e?.message || "proxy exception", hint: "empty-on-exception" });
    }
    return res.status(200).json([]);
  }
}
