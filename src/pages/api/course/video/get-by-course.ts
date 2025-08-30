import type { NextApiRequest, NextApiResponse } from "next";

function cleanToken(t?: string | null) {
  if (!t) return undefined as any;
  let s = String(t).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
  if (!s) return undefined as any;
  if (s.startsWith('{') && s.endsWith('}')) { try { const obj: any = JSON.parse(s); if (obj?.token) s = String(obj.token); } catch {} }
  const lower = s.toLowerCase();
  if (lower === 'undefined' || lower === 'null' || lower === 'bearer') return undefined as any;
  return s;
}

function buildHeaders(req: NextApiRequest) {
  let token = cleanToken(req.cookies?.token as any);
  if (!token && req.headers.authorization?.toLowerCase().startsWith('bearer ')) token = cleanToken(req.headers.authorization.substring(7));
  if (!token && typeof req.headers['x-access-token'] === 'string') token = cleanToken(req.headers['x-access-token'] as string);
  if (!token && typeof req.headers['token'] === 'string') token = cleanToken(req.headers['token'] as string);
  if (!token && cleanToken(req.cookies?.authToken)) token = cleanToken(req.cookies?.authToken);
  if (!token && cleanToken(req.cookies?.accessToken)) token = cleanToken(req.cookies?.accessToken);

  const h: Record<string,string> = { Accept: 'application/json', 'User-Agent': req.headers['user-agent']?.toString() || 'Mozilla/5.0 (proxy)' };
  const cookieParts: string[] = [];
  if (token) { h['Authorization'] = `Bearer ${token}`; cookieParts.push(`token=${token}`); }
  const js = req.cookies?.UPSTREAM_JSESSIONID || req.cookies?.JSESSIONID || (req.cookies as any)?.jsessionid;
  if (js) cookieParts.push(`JSESSIONID=${js}`);
  if (cookieParts.length) h['Cookie'] = cookieParts.join('; ');
  return h;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const id = req.query?.courseId ?? req.query?.id;
    if (!id) return res.status(400).json({ error: 'courseId required' });
    const upstreamBase = process.env.UPSTREAM_URL || 'https://rehearten-production.up.railway.app';
  const urlUp = `${upstreamBase}/video/get/by-course/${id}`;
    const headers = buildHeaders(req);
    let r = await fetch(urlUp, { headers });
    let t = await r.text();

    if ((r.status === 401 || r.status === 403) && (headers['Authorization'] || headers['Cookie'])) {
      if (headers['Cookie']) { const h2 = { ...headers } as Record<string,string>; delete h2['Cookie']; const r2 = await fetch(urlUp, { headers: h2 }); const t2 = await r2.text(); r = r2; t = t2; }
      if ((r.status === 401 || r.status === 403) && headers['Authorization']) { const h3 = { ...headers } as Record<string,string>; delete h3['Authorization']; const r3 = await fetch(urlUp, { headers: h3 }); const t3 = await r3.text(); r = r3; t = t3; }
      if (r.status === 401 || r.status === 403) { const h4: Record<string,string> = { Accept: headers['Accept'], 'User-Agent': headers['User-Agent'], 'x-public': '1' }; const r4 = await fetch(urlUp, { headers: h4 }); const t4 = await r4.text(); r = r4; t = t4; }
    }

    const status = r.status; const ct = r.headers.get('content-type') || '';
    if (process.env.NODE_ENV !== 'production') res.setHeader('x-proxy-upstream', urlUp);
    if (status >= 200 && status < 300) {
      if (ct.includes('application/json')) { try { return res.status(status).json(JSON.parse(t || 'null')); } catch { return res.status(status).send(t); } }
      return res.status(status).send(t);
    }
    return res.status(status).send(t);
  } catch (e: any) {
    return res.status(500).json({ error: 'proxy_error', message: e?.message || String(e) });
  }
}
