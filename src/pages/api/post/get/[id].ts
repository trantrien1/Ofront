import type { NextApiRequest, NextApiResponse } from "next";

// Normalize possible JSON-wrapped token string (like {"token":"..."})
function normalizeToken(raw: any): string {
  try {
    if (!raw) return "";
    let s = String(raw).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1);
    }
    if (s.startsWith("{") && s.endsWith("}")) {
      try {
        const obj = JSON.parse(s);
        if (obj && typeof obj.token === "string" && obj.token) return obj.token;
      } catch {}
    }
    return s;
  } catch {
    return "";
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { id } = req.query;
  const numericOrStrId = Array.isArray(id) ? id[0] : id;
  if (!numericOrStrId) {
    return res.status(400).json({ message: "Post id is required" });
  }

  const base = process.env.UPSTREAM_URL?.replace(/\/$/, "") || "https://rehearten-production.up.railway.app";
  const url = `${base}/post/get/${numericOrStrId}`;

  const cookies = req.cookies || {};
  const rawToken = cookies.token || "";
  const token = normalizeToken(rawToken);
  const incomingAuth = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
  const authHeader = incomingAuth || (token ? `Bearer ${token}` : "");

  const commonHeaders: Record<string, string> = { Accept: "application/json" };
  let upstreamResp: Response | null = null;

  try {
    // Try with Authorization when available (either forwarded or from cookie)
    if (authHeader) {
      upstreamResp = await fetch(url, {
        method: "GET",
        headers: {
          ...commonHeaders,
          Authorization: authHeader,
          // Also send token as cookie for backends reading from request cookies
          ...(token ? { Cookie: `token=${encodeURIComponent(token)}` } : {}),
        },
        // No need for credentials in server-to-server call
      } as RequestInit);
      if (upstreamResp.status === 401 || upstreamResp.status === 403) {
        upstreamResp = null; // fallback below
      }
    }

    // Fallback to public header if no token or auth failed
    if (!upstreamResp) {
      upstreamResp = await fetch(url, {
        method: "GET",
        headers: { ...commonHeaders, "x-public": "1" },
      } as RequestInit);
    }

    // If still not ok, forward status and body
    if (!upstreamResp.ok) {
      const text = await upstreamResp.text();
      return res.status(upstreamResp.status).send(text || upstreamResp.statusText);
    }

    const data = await upstreamResp.json();
    return res.status(200).json(data);
  } catch (e: any) {
    const msg = e?.message || "Upstream fetch failed";
    return res.status(502).json({ message: msg });
  }
}
