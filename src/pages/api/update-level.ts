import type { NextApiRequest, NextApiResponse } from "next";

// Refactored update-level proxy: single method, bearer only, timeout, strict validation
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Force PUT for idempotent semantics
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).end('Method Not Allowed');
  }
  try {
  const start = Date.now();
    const base = process.env.UPSTREAM_BASE_URL || 'https://rehearten-production.up.railway.app';
    const upstream = `${base}/update-level`;
    const body = (req.body || {}) as any;
    const levelRaw = body.level ?? body.likeLevel ?? body.lv;
    if (levelRaw === undefined || levelRaw === null || levelRaw === '') return res.status(400).json({ error: 'level is required' });
    const levelNum = Number(levelRaw);
    if (!Number.isFinite(levelNum) || levelNum < 1 || levelNum > 4) return res.status(400).json({ error: 'level must be 1..4' });
    const postId = body.postId ?? body.id ?? body.post_id;
    const commentId = body.commentId ?? body.comment_id ?? body.cmtId;
    if (!!postId === !!commentId) return res.status(400).json({ error: 'Provide exactly one of postId or commentId' });
    const toVal = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : String(v));
    const payload: Record<string, any> = { level: levelNum };
    if (postId) payload.postId = toVal(postId);
    if (commentId) payload.commentId = toVal(commentId);

    // Upstream (Spring) authenticates using a cookie named `token`.
    // Still pass Authorization for future compatibility, but ensure Cookie is forwarded.
    const bearer = req.headers.authorization?.toLowerCase().startsWith('bearer ')
      ? req.headers.authorization.slice(7).trim()
      : (req.cookies?.token as string | undefined);
    const cookieToken = (req.cookies?.token as string | undefined) || bearer;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': req.headers['user-agent']?.toString() || 'Mozilla/5.0 (proxy)',
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...(cookieToken ? { Cookie: `token=${cookieToken}` } : {}),
    };

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
  console.log(`PUT /api/update-level -> upstream ${upstream} payload=`, payload);
  let upstreamResp = await fetch(upstream, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));

    // Fallback: some upstream versions may not have /update-level; try /like instead
    if (upstreamResp.status === 404 || upstreamResp.status === 405 || upstreamResp.status === 501) {
      const likeUrl = `${base.replace(/\/$/, '')}/like`;
      console.log(`PUT /api/update-level fallback -> upstream ${likeUrl}`);
      const ctrl2 = new AbortController();
      const timer2 = setTimeout(() => ctrl2.abort(), 10_000);
      try {
        upstreamResp = await fetch(likeUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
          signal: ctrl2.signal,
          credentials: "include"
        }).finally(() => clearTimeout(timer2));
      } catch (e) {
        // keep original response below
      }
    }

    const text = await upstreamResp.text();
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('x-proxy-update-level-token', bearer ? '1' : '0');
      res.setHeader('x-proxy-update-level-cookie', cookieToken ? '1' : '0');
    }
  const ms = Date.now() - start;
  try { const data = JSON.parse(text); console.log(`PUT /api/update-level ${upstreamResp.status} in ${ms}ms`); return res.status(upstreamResp.status).json(data); } catch { console.log(`PUT /api/update-level ${upstreamResp.status} (non-JSON) in ${ms}ms`); return res.status(upstreamResp.status).send(text); }
  } catch (e: any) {
  console.error('PUT /api/update-level ERROR', e?.message || e);
    const isAbort = e?.name === 'AbortError';
    return res.status(500).json({ error: isAbort ? 'upstream timeout' : e?.message || 'proxy error' });
  }
}