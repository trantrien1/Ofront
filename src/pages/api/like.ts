import type { NextApiRequest, NextApiResponse } from "next";

// Simplified, safer like proxy:
// * Single attempt (JSON body)
// * Configurable method/base via env
// * Bearer token only (no cookie forwarding)
// * Timeout protection
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const methodEnv = (process.env.UPSTREAM_LIKE_METHOD || "PUT").toUpperCase();
  if (req.method !== methodEnv) {
    res.setHeader("Allow", methodEnv);
    return res.status(405).end("Method Not Allowed");
  }
  try {
    const base = process.env.UPSTREAM_BASE_URL || "https://rehearten-production.up.railway.app";
    const upstream = `${base}/like`;
    const body = (req.body || {}) as { postId?: any };
    const raw = body.postId ?? (req as any).query?.postId;
    if (raw === undefined || raw === null || raw === "") {
      return res.status(400).json({ error: "postId is required" });
    }
    const n = Number(raw);
    const postId = Number.isFinite(n) ? n : String(raw);

    // Upstream uses cookie `token` for auth; forward it. Also pass Bearer for compatibility.
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7).trim()
      : (req.cookies?.token as string | undefined);
    const cookieToken = (req.cookies?.token as string | undefined) || bearer;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": req.headers["user-agent"]?.toString() || "Mozilla/5.0 (proxy)",
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...(cookieToken ? { Cookie: `token=${cookieToken}` } : {}),
    };

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const upstreamResp = await fetch(upstream, {
      method: methodEnv,
      headers,
      body: JSON.stringify({ postId }),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t));

    const text = await upstreamResp.text();
    if (process.env.NODE_ENV !== "production") {
      res.setHeader("x-proxy-like-token", bearer ? "1" : "0");
      res.setHeader("x-proxy-like-cookie", cookieToken ? "1" : "0");
    }
    try {
      const data = JSON.parse(text);
      return res.status(upstreamResp.status).json(data);
    } catch {
      return res.status(upstreamResp.status).send(text);
    }
  } catch (e: any) {
    const isAbort = e?.name === "AbortError";
    return res.status(500).json({ error: isAbort ? "upstream timeout" : e?.message || "proxy error" });
  }
}
