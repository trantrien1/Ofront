import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow PUT or POST
  if (req.method !== "PUT" && req.method !== "POST") {
    res.setHeader("Allow", "PUT, POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const upstream = `https://rehearten-production.up.railway.app/like`;

    // Normalize payload: accept { commentId } or { id } and strip extras
    const incoming: any = req.body || {};
    const rawId = incoming.commentId ?? incoming.id ?? incoming.comment_id ?? incoming.commentID;
    const toNum = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : v; };
    const commentId = toNum(rawId);
    if (!commentId) {
      return res.status(400).json({ error: "commentId is required" });
    }
    const payload = { commentId } as Record<string, string>;

    const cleanToken = (t?: string | null) => {
      if (!t) return undefined;
      let s = String(t).trim();
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
      if (!s) return undefined;
      const lower = s.toLowerCase();
      if (lower === "undefined" || lower === "null" || lower === "bearer") return undefined;
      // Unwrap JSON-shaped token {"token":"..."}
      if ((s.startsWith("{") && s.endsWith("}"))) {
        try { const obj = JSON.parse(s); if (obj && obj.token) return String(obj.token); } catch {}
      }
      return s;
    };

    // Extract token from Authorization header or cookies
    let token: string | undefined;
    let tokenSource = "none";
    const authHeader = req.headers.authorization;
    if (authHeader?.toLowerCase().startsWith("bearer ")) {
      token = cleanToken(authHeader.substring(7));
      tokenSource = "header.authorization";
    }
    if (!token) {
      token = cleanToken(req.cookies?.token) || cleanToken(process.env.DEV_DEMO_TOKEN);
      if (token) tokenSource = tokenSource === "none" ? "cookie.token" : tokenSource;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": req.headers["user-agent"]?.toString() || "Mozilla/5.0 (proxy)",
    };

    // Build Cookie header: start with original cookies (if any) then ensure token/JSESSIONID are present
    let cookieHeader: string | undefined = undefined;
    const incomingCookie = req.headers.cookie as string | undefined;
    const cookieParts: string[] = [];
    if (incomingCookie) cookieParts.push(incomingCookie);
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      if (!incomingCookie || !incomingCookie.includes("token=")) cookieParts.push(`token=${token}`);
    }
    const upstreamSession = req.cookies?.UPSTREAM_JSESSIONID || req.cookies?.JSESSIONID || (req.cookies as any)?.jsessionid;
    if (upstreamSession && (!incomingCookie || !incomingCookie.includes("JSESSIONID="))) cookieParts.push(`JSESSIONID=${upstreamSession}`);
    if (cookieParts.length > 0) cookieHeader = cookieParts.join("; ");
    if (cookieHeader) headers["Cookie"] = cookieHeader;

    const method = req.method || "POST";
    let r = await fetch(upstream, { method, headers, body: JSON.stringify(payload) });
    let text = await r.text();

    // Fallback to POST if upstream rejects method
    if (r.status === 405 && method !== "POST") {
      const rPost = await fetch(upstream, { method: "POST", headers, body: JSON.stringify(payload) });
      if (rPost.status < r.status) { r = rPost; text = await rPost.text(); }
    }

    if (r.status >= 400) {
      const headersForm = { ...headers, "Content-Type": "application/x-www-form-urlencoded" } as Record<string, string>;
      const bodyForm = new URLSearchParams({ commentId: String(commentId) }).toString();
      const rForm = await fetch(upstream, { method, headers: headersForm, body: bodyForm });
      if (rForm.status < r.status) {
        r = rForm; text = await rForm.text();
      } else {
        const urlQs = `${upstream}?commentId=${encodeURIComponent(String(commentId))}`;
        const rQs = await fetch(urlQs, { method, headers });
        if (rQs.status < r.status) { r = rQs; text = await rQs.text(); }
      }
    }

    // Retry patterns for 401/403
    if ((r.status === 401 || r.status === 403) && headers["Authorization"]) {
      const retryHeaders = { ...headers };
      delete retryHeaders["Cookie"]; // try auth only
      const r2 = await fetch(upstream, { method, headers: retryHeaders, body: JSON.stringify(payload) });
      if (r2.status !== 401 && r2.status !== 403) {
        r = r2; text = await r2.text();
      } else {
        const retryHeaders2 = { ...headers };
        delete retryHeaders2["Authorization"]; // try cookies only/no auth
        const r3 = await fetch(upstream, { method, headers: retryHeaders2, body: JSON.stringify(payload) });
        if (r3.status < r.status) { r = r3; text = await r3.text(); }
      }
    }

    if (process.env.NODE_ENV !== "production") {
      res.setHeader("x-proxy-comment-like-token", token ? "1" : "0");
      res.setHeader("x-proxy-comment-like-token-source", tokenSource);
    }

    try {
      const data = JSON.parse(text);
      return res.status(r.status).json(data);
    } catch {
      return res.status(r.status).send(text);
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "proxy error" });
  }
}
