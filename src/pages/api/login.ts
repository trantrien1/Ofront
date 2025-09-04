import type { NextApiRequest, NextApiResponse } from "next";

function serializeCookie(name: string, value: string, opts?: Partial<{ httpOnly: boolean; path: string; sameSite: 'Lax' | 'Strict' | 'None'; secure: boolean; maxAge: number }>) {
  const p = { httpOnly: true, path: '/', sameSite: 'Lax' as const, secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 60 * 60, ...(opts || {}) };
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${p.path}`,
    `SameSite=${p.sameSite}`,
    p.httpOnly ? 'HttpOnly' : '',
    p.secure ? 'Secure' : '',
    p.maxAge ? `Max-Age=${p.maxAge}` : '',
  ].filter(Boolean);
  return parts.join('; ');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const upstream = `https://rehearten-production.up.railway.app/login`;
    const r = await fetch(upstream, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(req.body),
    });

    // Prepare cookies to set on our domain
  const cookiesToSet: string[] = [];
  const upstreamSetCookie = r.headers.get("set-cookie");
    if (upstreamSetCookie) {
      // Forward upstream cookie as-is; may be ignored by browser if domain mismatch, but harmless
      cookiesToSet.push(upstreamSetCookie);
    }

    const ct = r.headers.get("content-type") || "";
  let body: any = ct.includes("application/json") ? await r.json() : await r.text();

    // If upstream didn't set a cookie for our domain, set our own HttpOnly token cookie when token exists in body
    try {
      const maybeObj = typeof body === 'string' ? JSON.parse(body) : body;
      if (maybeObj && typeof maybeObj === 'object') {
        const token = String((maybeObj as any).token || (maybeObj as any).accessToken || '').trim();
        const role = (maybeObj as any).role ? String((maybeObj as any).role).toLowerCase() : '';
        if (token) {
          cookiesToSet.push(
            serializeCookie('token', token, { httpOnly: true, sameSite: 'Lax', path: '/' })
          );
        }
        if (role) {
          // Non-HttpOnly role cookie to help client UI guards
          cookiesToSet.push(
            serializeCookie('role', role, { httpOnly: false, sameSite: 'Lax', path: '/', maxAge: 30 * 24 * 60 * 60 })
          );
        }
      }
    } catch {}

    // If we still don't have a token cookie, try to extract from upstream Set-Cookie header (e.g., token=...; Path=/; ...)
    if (!cookiesToSet.some((c) => c.toLowerCase().startsWith('token=')) && upstreamSetCookie) {
      try {
        const m = upstreamSetCookie.match(/(?:^|[;,])\s*(?:token|jwt|access_token)=([^;,:\r\n]+)/i);
        if (m && m[1]) {
          const upstreamToken = decodeURIComponent(m[1]);
          cookiesToSet.push(serializeCookie('token', upstreamToken, { httpOnly: true, sameSite: 'Lax', path: '/' }));
        }
      } catch {}
    }

    if (cookiesToSet.length) res.setHeader('Set-Cookie', cookiesToSet);

    return res.status(r.status).send(body);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "proxy error" });
  }
}
