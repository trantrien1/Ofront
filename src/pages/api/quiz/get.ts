import type { NextApiRequest, NextApiResponse } from "next";

// List or fetch quiz questions. Mirrors course/get with auth/public fallbacks.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const originalQS = (req.url && req.url.includes("?")) ? req.url.split("?")[1] : "";
    const upstreamBase = process.env.UPSTREAM_URL || 'https://rehearten-production.up.railway.app';
    const paths = ["/question/get"]; // upstream path per backend

    const cleanToken = (t?: string | null) => {
      if (!t) return undefined as any;
      let s = String(t).trim();
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
      if (!s) return undefined as any;
      if (s.startsWith("{") && s.endsWith("}")) { try { const obj: any = JSON.parse(s); if (obj?.token) s = String(obj.token); } catch {}
      }
      const lower = s.toLowerCase();
      if (lower === 'undefined' || lower === 'null' || lower === 'bearer') return undefined as any;
      return s;
    };

    let token = cleanToken(req.cookies?.token as any);
    if (!token && req.headers.authorization?.toLowerCase().startsWith('bearer ')) token = cleanToken(req.headers.authorization.substring(7));
    if (!token && typeof req.headers['x-access-token'] === 'string') token = cleanToken(req.headers['x-access-token'] as string);
    if (!token && typeof req.headers['token'] === 'string') token = cleanToken(req.headers['token'] as string);
    if (!token && cleanToken(req.cookies?.authToken)) token = cleanToken(req.cookies?.authToken);
    if (!token && cleanToken(req.cookies?.accessToken)) token = cleanToken(req.cookies?.accessToken);

    const headers: Record<string,string> = { Accept: 'application/json', 'User-Agent': req.headers['user-agent']?.toString() || 'Mozilla/5.0 (proxy)' };
    const cookieParts: string[] = [];
    if (token) { headers['Authorization'] = `Bearer ${token}`; cookieParts.push(`token=${token}`); }
    const upstreamSession = req.cookies?.UPSTREAM_JSESSIONID || req.cookies?.JSESSIONID || (req.cookies as any)?.jsessionid;
    if (upstreamSession) cookieParts.push(`JSESSIONID=${upstreamSession}`);
    if (cookieParts.length) headers['Cookie'] = cookieParts.join('; ');

    const xPublic = String(req.headers['x-public'] || '').toLowerCase();
    const forcePublic = xPublic === '1' || xPublic === 'true';
    if (forcePublic) { delete headers['Authorization']; delete headers['Cookie']; headers['x-public'] = '1'; }

    if (process.env.NODE_ENV !== 'production') {
      if (headers['Cookie']) res.setHeader('x-proxy-cookie', headers['Cookie']);
    }

    for (const p of paths) {
      const url = `${upstreamBase}${p}${originalQS ? ('?' + originalQS) : ''}`;
      let r = await fetch(url, { headers });
      let t = await r.text();
      if ((r.status === 401 || r.status === 403) && (headers['Authorization'] || headers['Cookie'])) {
        if (headers['Cookie']) {
          const h2 = { ...headers }; delete h2['Cookie'];
          const r2 = await fetch(url, { headers: h2 });
          const t2 = await r2.text(); r = r2; t = t2;
        } else if (headers['Authorization']) {
          const h3 = { ...headers }; delete h3['Authorization'];
          const r3 = await fetch(url, { headers: h3 });
          const t3 = await r3.text(); r = r3; t = t3;
        }
        if (r.status === 401 || r.status === 403) {
          const h4: Record<string,string> = { Accept: headers.Accept, 'User-Agent': headers['User-Agent'], 'x-public': '1' };
          const r4 = await fetch(url, { headers: h4 });
          const t4 = await r4.text(); r = r4; t = t4;
        }
      }
      if (r.status >= 200 && r.status < 300) {
        const ct = r.headers.get('content-type') || '';
        if (process.env.NODE_ENV !== 'production') res.setHeader('x-proxy-upstream', url);
        if (ct.includes('application/json')) {
          try {
            const data = JSON.parse(t || 'null');
            const arr = (Array.isArray(data) && data)
              || (Array.isArray((data as any)?.data) && (data as any).data)
              || (Array.isArray((data as any)?.content) && (data as any).content)
              || (Array.isArray((data as any)?.data?.content) && (data as any).data.content)
              || [];
            const count = Array.isArray(arr) ? arr.length : 0;
            console.log(`[api/quiz/get] upstream=${url} status=${r.status} items=${count}`);
            return res.status(r.status).json(data);
          } catch (e) {
            console.log(`[api/quiz/get] parse-json-failed upstream=${url} status=${r.status} err=${(e as any)?.message}`);
            return res.status(r.status).send(t);
          }
        }
        return res.status(r.status).send(t);
      }
    }
    return res.status(502).json({ error: 'Bad gateway' });
  } catch (e: any) {
    return res.status(500).json({ error: 'proxy_error', message: e?.message || String(e) });
  }
}
