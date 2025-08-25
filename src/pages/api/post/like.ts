import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
  const upstream = `https://rehearten-production.up.railway.app/like`;

    // Normalize payload: accept { postId } or { id } and strip extras
    const incoming: any = req.body || {};
    const postId = incoming.postId ?? incoming.id ?? incoming.post_id ?? incoming.postID;
    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }
    const payload = { postId };

    const cleanToken = (t?: string | null) => {
      if (!t) return undefined;
      let s = String(t).trim();
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
      if (!s) return undefined;
      const lower = s.toLowerCase();
      if (lower === "undefined" || lower === "null" || lower === "bearer") return undefined;
      return s;
    };

    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.toLowerCase().startsWith("bearer ")) {
      token = cleanToken(authHeader.substring(7));
    }
    if (!token) token = cleanToken(req.cookies?.token) || cleanToken(process.env.DEV_DEMO_TOKEN);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": req.headers["user-agent"]?.toString() || "Mozilla/5.0 (proxy)"
    };

    const cookieParts: string[] = [];
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      cookieParts.push(`token=${token}`);
    }
    const js = req.cookies?.UPSTREAM_JSESSIONID || req.cookies?.JSESSIONID || (req.cookies as any)?.jsessionid;
    if (js) cookieParts.push(`JSESSIONID=${js}`);
    if (cookieParts.length > 0) headers["Cookie"] = cookieParts.join("; ");

    let r = await fetch(upstream, { method: "POST", headers, body: JSON.stringify(payload) });
    let text = await r.text();

    // If backend rejects JSON, try form-encoded then querystring
    if (r.status >= 400) {
      // Try application/x-www-form-urlencoded
      const headersForm = { ...headers, "Content-Type": "application/x-www-form-urlencoded" } as Record<string, string>;
      const bodyForm = new URLSearchParams({ postId: String(postId) }).toString();
      const rForm = await fetch(upstream, { method: "POST", headers: headersForm, body: bodyForm });
      if (rForm.status < r.status) {
        r = rForm; text = await rForm.text();
      } else {
        // Try query string
        const urlQs = `${upstream}?postId=${encodeURIComponent(String(postId))}`;
        const rQs = await fetch(urlQs, { method: "POST", headers });
        if (rQs.status < r.status) { r = rQs; text = await rQs.text(); }
        else {
          // Try alternate key name "id" (JSON)
          const rJsonId = await fetch(upstream, { method: "POST", headers, body: JSON.stringify({ id: postId }) });
          if (rJsonId.status < r.status) { r = rJsonId; text = await rJsonId.text(); }
          else {
            // Try form-encoded with id
            const bodyFormId = new URLSearchParams({ id: String(postId) }).toString();
            const rFormId = await fetch(upstream, { method: "POST", headers: headersForm, body: bodyFormId });
            if (rFormId.status < r.status) { r = rFormId; text = await rFormId.text(); }
            else {
              // Try query string with id
              const urlQsId = `${upstream}?id=${encodeURIComponent(String(postId))}`;
              const rQsId = await fetch(urlQsId, { method: "POST", headers });
              if (rQsId.status < r.status) { r = rQsId; text = await rQsId.text(); }
            }
          }
        }
      }
    }

    if ((r.status === 401 || r.status === 403) && headers["Authorization"]) {
      const h1 = { ...headers }; delete (h1 as any)["Cookie"]; // auth only
      const r2 = await fetch(upstream, { method: "POST", headers: h1, body: JSON.stringify(payload) });
      if (r2.status !== 401 && r2.status !== 403) { r = r2; text = await r2.text(); }
      else {
        const h2 = { ...headers }; delete (h2 as any)["Authorization"]; // cookies only
        const r3 = await fetch(upstream, { method: "POST", headers: h2, body: JSON.stringify(payload) });
        if (r3.status < r.status) { r = r3; text = await r3.text(); }
      }
    }

    // If non-2xx in dev, return diagnostics to help debugging
    if (r.status >= 400 && process.env.NODE_ENV !== "production") {
      let parsed: any = text;
      try { parsed = JSON.parse(text); } catch {}
      return res.status(r.status).json({ upstreamStatus: r.status, upstreamBody: parsed, upstreamHeaders: Object.fromEntries(r.headers.entries()) });
    }

    try { const data = JSON.parse(text); return res.status(r.status).json(data); } catch { return res.status(r.status).send(text); }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "proxy error" });
  }
}
