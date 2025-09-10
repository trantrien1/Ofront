import type { NextApiRequest, NextApiResponse } from 'next';

// Proxy DELETE /group-member/delete to upstream, sending { id, username }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).end('Method Not Allowed');
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    const upstream = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    // Accept multiple possible keys from frontend
    const idRaw = body.id ?? body.idgroup ?? body.idGroup ?? body.groupId ?? body.communityId;
    // Derive username if not explicitly provided
    let username = body.username || body.user || body.userName || body.account;
    if (!username) {
      // Try cookie hints
      const maybeUser = req.cookies?.username || req.cookies?.user || req.cookies?.uid;
      if (maybeUser) username = String(maybeUser);
    }
    if (idRaw == null || !username) {
      return res.status(400).json({ error: 'id and username required' });
    }
    const id = (idRaw);

    const cleanToken = (t?: string | null) => {
      if (!t) return undefined; let s = String(t).trim();
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1,-1);
      if (!s) return undefined; const lower = s.toLowerCase();
      if (['undefined','null','bearer'].includes(lower)) return undefined; return s;
    };

    let token = cleanToken(req.cookies?.token as string | undefined);
    if (!token) {
      const auth = req.headers.authorization || '';
      if (auth.toLowerCase().startsWith('bearer ')) token = cleanToken(auth.slice(7));
    }
    if (!token) token = cleanToken(req.cookies?.authToken as string | undefined) || cleanToken(req.cookies?.accessToken as string | undefined);

    const upstreamSession = (req.cookies?.UPSTREAM_JSESSIONID || req.cookies?.JSESSIONID || (req.cookies as any)?.jsessionid) as string | undefined;
    const cookieParts: string[] = [];
    if (token) cookieParts.push(`token=${token}`);
    if (upstreamSession) cookieParts.push(`JSESSIONID=${upstreamSession}`);

    const headers: Record<string,string> = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': req.headers['user-agent']?.toString() || 'Mozilla/5.0 (proxy)',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (cookieParts.length) headers['Cookie'] = cookieParts.join('; ');

  const payload = { id, username: String(username) };
  // Upstream original mapping (controller under /ws ?) choose correct path
  const url = `${upstream}/group-member/delete`; // if 404, switch to `${upstream}/ws/group-member/delete`

    if (process.env.NODE_ENV !== 'production') {
      try { console.log('[group-member/delete] -> upstream', url, 'payload=', payload); } catch {}
    }

    const r = await fetch(url, { method: 'DELETE', headers, body: JSON.stringify(payload) });
    const text = await r.text();
    if (!r.ok) {
      try { return res.status(r.status).json(JSON.parse(text)); } catch { return res.status(r.status).send(text); }
    }
    // Upstream returns empty body on success (ResponseEntity.ok().build())
    return res.status(200).json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'proxy error' });
  }
}
