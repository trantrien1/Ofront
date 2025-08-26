import type { NextApiRequest, NextApiResponse } from "next";

const DEV_DEMO_TOKEN = process.env.DEV_DEMO_TOKEN || "";

function cleanToken(t?: string | null) {
  if (!t) return undefined;
  let s = String(t).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
  if (!s) return undefined;
  const lower = s.toLowerCase();
  if (lower === "undefined" || lower === "null" || lower === "bearer") return undefined;
  try {
    // unwrap JSON-shaped token
    const parsed = JSON.parse(s);
    if (parsed && typeof parsed === 'object' && parsed.token) return String(parsed.token);
  } catch {}
  return s;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || "GET";
  let token = cleanToken((req.cookies as any)?.token) || cleanToken(DEV_DEMO_TOKEN);
  if (!token) {
    const auth = req.headers.authorization || "";
    if (auth.toLowerCase().startsWith("bearer ")) token = cleanToken(auth.slice(7));
  }

  const upstreamBase = `https://rehearten-production.up.railway.app/notifications`;

  const buildAttempts = () => {
    const cookieHeader = token ? `token=${token}` : undefined;
    const common = { Accept: "application/json", "User-Agent": req.headers["user-agent"] || "Mozilla/5.0 (proxy)" } as Record<string, string>;
    return [
      { name: 'auth_and_cookie', headers: { ...common, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookieHeader ? { Cookie: cookieHeader } : {}) } },
      { name: 'cookie_only', headers: { ...common, ...(cookieHeader ? { Cookie: cookieHeader } : {}) } },
      { name: 'auth_only', headers: { ...common, ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
    ];
  };

  try {
    if (method === "GET") {
      const qs = Object.keys(req.query || {})
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String((req.query as any)[k]))}`)
        .join("&");
      const upstream = `${upstreamBase}${qs ? "?" + qs : ""}`;
      const attempts = buildAttempts();
      for (let i = 0; i < attempts.length; i++) {
        const a = attempts[i];
        try {
          const r = await fetch(upstream, { method: 'GET', headers: a.headers });
          const text = await r.text();
          let data: any = text;
          try { data = JSON.parse(text); } catch {}
          if (!r.ok) {
            if (i < attempts.length - 1 && (r.status === 401 || r.status === 403 || r.status === 500)) continue;
            return res.status(r.status).json({ upstreamStatus: r.status, attempt: a.name, body: data });
          }
          return res.status(r.status).json(data);
        } catch (e) {
          if (i === attempts.length - 1) throw e;
        }
      }
      return;
    }

    if (method === "POST" || method === "PATCH") {
      const attempts = buildAttempts();
      for (let i = 0; i < attempts.length; i++) {
        const a = attempts[i];
        try {
          const r = await fetch(upstreamBase, {
            method,
            headers: { ...a.headers, "Content-Type": "application/json" },
            body: JSON.stringify(req.body || {}),
          });
          const text = await r.text();
          let data: any = text;
          try { data = JSON.parse(text); } catch {}
          if (!r.ok) {
            if (i < attempts.length - 1 && (r.status === 401 || r.status === 403 || r.status === 500)) continue;
            return res.status(r.status).json({ upstreamStatus: r.status, attempt: a.name, body: data });
          }
          return res.status(r.status).json(data);
        } catch (e) {
          if (i === attempts.length - 1) throw e;
        }
      }
      return;
    }

    res.setHeader("Allow", ["GET", "POST", "PATCH"]);
    res.status(405).end(`Method ${method} Not Allowed`);
  } catch (err: any) {
    console.error("/api/notifications proxy error:", err?.message || err);
    res.status(500).json({ error: err?.message || String(err) });
  }
}
