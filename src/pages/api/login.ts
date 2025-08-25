import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
  // minimal logging
    const upstream = `https://rehearten-production.up.railway.app/login`;

    const r = await fetch(upstream, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(req.body),
    });

  const text = await r.text();
  // minimal upstream logging in dev only

    // Handle successful login response (status 200)
    if (r.status === 200 && text.trim().length > 0) {
  // detect if plain token string
      
      // Check if it's a JWT token (starts with ey... or looks like a token)
      const isToken = text.trim().includes('.');
      
  if (isToken) {
        console.log("/api/login proxy: DETECTED JWT TOKEN, letting frontend handle cookie");
        // Also forward upstream session cookie (e.g., JSESSIONID) if present,
        // storing it under our own cookie name so we can replay it in API proxies.
        const setCookie = r.headers.get("set-cookie");
        if (setCookie) {
          // Try to extract JSESSIONID value
          const m = setCookie.match(/JSESSIONID=([^;]+)/i);
          if (m && m[1]) {
            const jsid = m[1];
            // Set a proxy cookie on our domain
            res.setHeader("Set-Cookie", `UPSTREAM_JSESSIONID=${jsid}; Path=/; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}; HttpOnly`);
          }
        }
        // Additionally, set our own token cookie for stability in dev/localhost
        try {
          const tokenStr = text.trim().replace(/^"|"$/g, "");
          // HttpOnly=false to allow reading in client when needed; Secure only in prod
          const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
          const existing = res.getHeader("Set-Cookie");
          const existingArr = Array.isArray(existing)
            ? existing
            : existing
            ? [String(existing)]
            : [];
          const newCookies = [
            ...existingArr,
            `token=${tokenStr}; Path=/; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${secureFlag}`,
          ];
          res.setHeader("Set-Cookie", newCookies);
        } catch {}

        // Return the token to frontend so it can set the cookie
        return res.status(200).json({
          token: text.trim(),
          success: true,
          message: "Login successful",
        });
      } else {
        console.log("/api/login proxy: NOT A TOKEN, proceeding to JSON parse");
      }
    } else {
      console.log("/api/login proxy: NOT status 200 or empty response");
    }

    // try parse JSON for other responses
    try {
      const data = JSON.parse(text);
      // forward Set-Cookie from upstream if present so browser can store token
      const setCookie = r.headers.get("set-cookie");
      if (setCookie) {
        // Enhance cookie with better options for persistence
        const enhancedCookie = setCookie
          .replace(/; Path=\//g, '') // remove existing path
          .replace(/; SameSite=\w+/g, '') // remove existing samesite
          + '; Path=/; SameSite=Lax; Max-Age=' + (30 * 24 * 60 * 60); // 30 days
        res.setHeader("Set-Cookie", enhancedCookie);
      }
      if (r.status >= 400 && process.env.NODE_ENV !== "production") {
        // return upstream info to help debugging in dev
        return res.status(r.status).json({ upstreamStatus: r.status, upstreamBody: data, upstreamHeaders: Object.fromEntries(r.headers.entries()) });
      }
      return res.status(r.status).json(data);
    } catch (e) {
      if (r.status >= 400 && process.env.NODE_ENV !== "production") {
        return res.status(r.status).json({ upstreamStatus: r.status, upstreamBody: text, upstreamHeaders: Object.fromEntries(r.headers.entries()) });
      }
      // return raw text (e.g. token string)
      return res.status(r.status).send(text);
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "proxy error" });
  }
}
