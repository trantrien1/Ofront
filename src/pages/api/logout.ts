import type { NextApiRequest, NextApiResponse } from "next";

function serializeCookie(name: string, value: string, opts?: Partial<{ httpOnly: boolean; path: string; sameSite: 'Lax' | 'Strict' | 'None'; secure: boolean; maxAge: number }>) {
  const p = { httpOnly: true, path: '/', sameSite: 'Lax' as const, secure: process.env.NODE_ENV === 'production', ...(opts || {}) };
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
    const upstream = `https://rehearten-production.up.railway.app/logout`;
    const forwardHeaders: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    // Forward client's cookies (if any) so upstream can see HttpOnly token and perform logout
    try {
      const incomingCookie = req.headers.cookie;
      if (incomingCookie) forwardHeaders['cookie'] = String(incomingCookie);
    } catch {}

    const r = await fetch(upstream, {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify(req.body || {}),
    });

    const cookiesToSet: string[] = [];
    const upstreamSetCookie = r.headers.get("set-cookie");
    if (upstreamSetCookie) {
      cookiesToSet.push(upstreamSetCookie);
    }

    // If upstream did not set a cookie, prepare expired token & role cookies locally
    if (!upstreamSetCookie) {
      cookiesToSet.push(serializeCookie('token', '', { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 0 }));
      cookiesToSet.push(serializeCookie('role', '', { httpOnly: false, sameSite: 'Lax', path: '/', maxAge: 0 }));
    }

    const ct = r.headers.get("content-type") || "";
    const body: any = ct.includes("application/json") ? await r.json() : await r.text();

    // If upstream returned an error (e.g., 403), still clear cookies locally and return a 200 fallback
    if (r.status >= 400) {
      if (cookiesToSet.length) res.setHeader('Set-Cookie', cookiesToSet);
      return res.status(200).json({ message: 'Logged out (local fallback)', upstreamStatus: r.status, upstreamBody: body });
    }

    if (cookiesToSet.length) res.setHeader('Set-Cookie', cookiesToSet);
    return res.status(r.status).send(body);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "proxy error" });
  }
}
