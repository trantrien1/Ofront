import type { NextApiRequest, NextApiResponse } from 'next';

// DELETE /api/post/delete/:id with CORS + preflight support.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers (adjust ALLOW_ORIGIN for production security)
  const allowOrigin = process.env.ALLOW_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
    const postId = id || body.postId || (req.query as any)?.postId;
    if (!postId) return res.status(400).json({ error: 'id required' });

    const upstreamBase = (process.env.UPSTREAM_URL || 'https://rehearten-production.up.railway.app').replace(/\/+$/,'');
    const url = `${upstreamBase}/post/delete/${encodeURIComponent(postId)}`;
    const verbose = process.env.NODE_ENV !== 'production' && process.env.LOG_VERBOSE !== '0';
    if (verbose) {
      //try { console.log('[post/delete/[id]] build', { url, postId, idParam: id, hasBody: !!body, upstreamBase }); } catch {}
    }

    // Extract token from cookie -> Authorization header
    let authHeader: string | undefined;
    let tokenMatch: RegExpExecArray | null = null;
    let rawToken: string | undefined;
    try {
      const cookie = req.headers.cookie || '';
      tokenMatch = /(?:^|; )token=([^;]+)/.exec(cookie) || /(?:^|; )(jwt|access_token)=([^;]+)/.exec(cookie);
      if (tokenMatch) {
        // tokenMatch may have group 1 or 2 depending on regex used
        rawToken = decodeURIComponent(tokenMatch[tokenMatch.length - 1]);
        if (rawToken) authHeader = `Bearer ${rawToken}`;
      }
      if (verbose) {
        //console.log('[post/delete/[id]] cookie(raw)=', maskLong(cookie));
        //console.log('[post/delete/[id]] tokenMatch=', !!tokenMatch, 'authHeader.masked=', authHeader ? maskLong(authHeader) : undefined);
      }
    } catch (e) {
      if (verbose) console.log('[post/delete/[id]] token parse error', (e as any)?.message);
    }

    // Build headers, include Authorization if we extracted token
    const upstreamHeaders: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (authHeader) upstreamHeaders.Authorization = authHeader;
    else if (verbose) console.log('[post/delete/[id]] missing authHeader -> upstream may 401/403');
    // IMPORTANT: Spring filter JwtTokenFilter only reads the 'token' cookie, not Authorization header.
    // So we must forward the cookie explicitly.
    if (rawToken) {
      upstreamHeaders['Cookie'] = `token=${encodeURIComponent(rawToken)}`;
      if (verbose) console.log('[post/delete/[id]] forwarding Cookie header with token');
    } else if (verbose) {
      console.log('[post/delete/[id]] rawToken missing -> backend will see no token cookie');
    }

    const upstreamResp = await fetch(url, {
      method: 'DELETE',
      headers: upstreamHeaders,
      // No need for credentials here (server->server); cookies seldom apply across domains.
    });

    const txt = await upstreamResp.text();
    if (verbose) {
      try { console.log('[post/delete/[id]] upstream status=', upstreamResp.status, 'url=', url, 'hasAuth=', !!authHeader); } catch {}
    }

    // Forward upstream content-type
    const ct = upstreamResp.headers.get('content-type') || 'text/plain; charset=utf-8';
    res.setHeader('Content-Type', ct);
    res.status(upstreamResp.status);
    try { res.json(JSON.parse(txt)); }
    catch { res.send(txt); }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'proxy error' });
  }
}

function safeParse(s: string) {
  try { return JSON.parse(s || '{}'); } catch { return {}; }
}

function maskLong(v?: string) {
  if (!v) return v;
  if (v.length <= 16) return v.replace(/.(?=.{4})/g, '*');
  return v.slice(0,8) + '...' + v.slice(-4);
}
