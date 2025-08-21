import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
  console.debug("/api/post/get proxy: incoming headers:", req.headers);
  console.debug("/api/post/get proxy: incoming cookies:", req.cookies);
  const { query } = req;
    const queryString = new URLSearchParams(query as Record<string, string>).toString();
    const upstream = `https://rehearten-production.up.railway.app/post/get${queryString ? "?" + queryString : ""}`;

    // read token cookie from incoming request
    let token = req.cookies?.token;

    // Development helper: allow a demo token to be supplied via env var
    // so developers can see posts without performing an interactive login.
    // Set DEV_DEMO_TOKEN in your local environment (NOT for production).
    if (!token && process.env.DEV_DEMO_TOKEN) {
      token = process.env.DEV_DEMO_TOKEN;
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      // Ask upstream not to return 304 by using no-cache on the forwarded request
      // (some upstreams may respond 304 if conditional validators are present or caching rules apply)
      "Cache-Control": "no-cache",
    };
    if (token) {
      // upstream expects token in Cookie header (empirically)
      headers["Cookie"] = `token=${token}`;
    } else {
      // No token available – upstream will likely reject; include debug header
      console.debug("proxy: no token provided for upstream request to post/get");
    }
  let r = await fetch(upstream, { headers });
  let text = await r.text();
  console.debug(`/api/post/get proxy: upstream status=${r.status}`);

  // If upstream responded with 304 Not Modified, retry once forcing no-cache
  if (r.status === 304) {
    console.debug("/api/post/get proxy: upstream returned 304, retrying with no-cache");
    // Retry with explicit no-cache to force a full response
    const retryHeaders = { ...headers, "Cache-Control": "no-cache" } as Record<string, string>;
    const r2 = await fetch(upstream, { headers: retryHeaders });
    const t2 = await r2.text();
    // replace with retry response
    r = r2;
    text = t2;
    // Surface debug info to the client in dev
    if (process.env.NODE_ENV !== "production") {
      // mark that upstream initially returned 304
      // we'll set response header later before sending
      (res as any).locals = { ...(res as any).locals, upstreamWas304: "1" };
    }
  }

    // if upstream returned an error, expose details in dev to help debugging
    if (r.status >= 400 && process.env.NODE_ENV !== "production") {
      let parsed: any = text;
      try {
        parsed = JSON.parse(text);
      } catch (e) {}
      // include whether token was present on incoming request to help debugging
      res.setHeader("x-proxy-had-token", token ? "1" : "0");
      return res.status(r.status).json({ upstreamStatus: r.status, upstreamBody: parsed, upstreamHeaders: Object.fromEntries(r.headers.entries()) });
    }

    // try parse JSON
    try {
      const data = JSON.parse(text);
      if (process.env.NODE_ENV !== "production") {
        res.setHeader("x-proxy-had-token", token ? "1" : "0");
      }
      res.status(r.status).json(data);
    } catch (e) {
      res.status(r.status).send(text);
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "proxy error" });
  }
}
