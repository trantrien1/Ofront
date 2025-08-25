import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("POST /api/post/create - Request body:", JSON.stringify(req.body, null, 2));

    // Basic validation
    if (!req.body?.title || String(req.body.title).trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Sanitize token helper
    const cleanToken = (t?: string | null) => {
      if (!t) return undefined;
      let s = String(t).trim();
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
      if (!s) return undefined;
      const lower = s.toLowerCase();
      if (lower === 'undefined' || lower === 'null' || lower === 'bearer') return undefined;
      return s;
    };

    // Resolve token from cookies or headers
    let token = cleanToken(req.cookies?.token as any);
    if (!token && req.headers.authorization?.toLowerCase().startsWith('bearer ')) {
      token = cleanToken(req.headers.authorization.substring(7));
    }
    if (!token && typeof req.headers['x-access-token'] === 'string') token = cleanToken(req.headers['x-access-token'] as string);
    if (!token && typeof req.headers['token'] === 'string') token = cleanToken(req.headers['token'] as string);
    if (!token && cleanToken(req.cookies?.authToken)) token = cleanToken(req.cookies?.authToken);
    if (!token && cleanToken(req.cookies?.accessToken)) token = cleanToken(req.cookies?.accessToken);

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': req.headers['user-agent']?.toString() || 'Mozilla/5.0 (proxy)'
    };
    const cookieParts: string[] = [];
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      cookieParts.push(`token=${token}`);
    }
    const upstreamSession = req.cookies?.UPSTREAM_JSESSIONID || req.cookies?.JSESSIONID || (req.cookies as any)?.jsessionid;
    if (upstreamSession) cookieParts.push(`JSESSIONID=${upstreamSession}`);
    if (cookieParts.length) headers['Cookie'] = cookieParts.join('; ');

    // Honor explicit public mode
    const forcePublic = String(req.headers['x-public'] || '').toLowerCase() === '1' || String(req.headers['x-public'] || '').toLowerCase() === 'true';
    if (forcePublic) {
      delete headers['Authorization'];
      delete headers['Cookie'];
    }

    // Build candidate upstream endpoints and payload attempts
    const upstreamCandidates = [
      'https://rehearten-production.up.railway.app/post/create',  // working endpoint
      'https://rehearten-production.up.railway.app/posts/create', // legacy/misleading
    ];

    // Normalize payload: prefer 'content' for body text
    const basePayload = { ...req.body } as any;
    if (basePayload.body && !basePayload.content) basePayload.content = basePayload.body;
    if (!basePayload.postType) basePayload.postType = 'TEXT';
    const minimalPayload = {
      title: basePayload.title,
      content: basePayload.content,
    } as any;

    const attempts: Array<{
      url: string;
      headers: Record<string, string>;
      body: string;
      label: string;
    }> = [];

    for (const url of upstreamCandidates) {
      // JSON attempt with full headers (full payload)
      attempts.push({ url, headers: { ...headers }, body: JSON.stringify(basePayload), label: 'json_full' });
      // JSON attempt without cookies (auth only)
      if (headers['Cookie']) {
        const h2 = { ...headers } as Record<string, string>;
        delete h2['Cookie'];
        attempts.push({ url, headers: h2, body: JSON.stringify(basePayload), label: 'json_auth_only' });
      }
      // JSON attempt with minimal payload (title+content)
      attempts.push({ url, headers: { ...headers }, body: JSON.stringify(minimalPayload), label: 'json_min_full' });
      if (headers['Cookie']) {
        const h5 = { ...headers } as Record<string, string>;
        delete h5['Cookie'];
        attempts.push({ url, headers: h5, body: JSON.stringify(minimalPayload), label: 'json_min_auth_only' });
      }
      // Form-encoded attempt (some backends expect this)
      const form = new URLSearchParams();
      for (const [k, v] of Object.entries(basePayload)) if (v != null) form.set(k, String(v));
      const h3 = { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' } as Record<string, string>;
      attempts.push({ url, headers: h3, body: form.toString(), label: 'form_full' });
      if (headers['Cookie']) {
        const h4 = { ...h3 } as Record<string, string>;
        delete h4['Cookie'];
        attempts.push({ url, headers: h4, body: form.toString(), label: 'form_auth_only' });
      }
      // Minimal form-encoded
      const formMin = new URLSearchParams();
      for (const [k, v] of Object.entries(minimalPayload)) if (v != null) formMin.set(k, String(v));
      attempts.push({ url, headers: h3, body: formMin.toString(), label: 'form_min_full' });
      if (headers['Cookie']) {
        const h6 = { ...h3 } as Record<string, string>;
        delete h6['Cookie'];
        attempts.push({ url, headers: h6, body: formMin.toString(), label: 'form_min_auth_only' });
      }
    }

    let lastStatus = 0;
    let lastText = '';
    let lastHeaders: Record<string, string> = {};
    let lastAttemptLabel = '';
    let lastUrl = '';

    for (const attempt of attempts) {
      try {
        console.log(`[create-proxy] Attempt ${attempt.label} -> ${attempt.url}`);
        const r = await fetch(attempt.url, { method: 'POST', headers: attempt.headers, body: attempt.body });
        const t = await r.text();
        lastStatus = r.status; lastText = t; lastAttemptLabel = attempt.label; lastUrl = attempt.url;
        lastHeaders = Object.fromEntries(r.headers.entries());
        console.log(`[create-proxy] status=${r.status} label=${attempt.label} body_snippet=${t.slice(0, 800).replace(/\n/g,' ')}`);
        if (r.status >= 200 && r.status < 300) {
          const ct = r.headers.get('content-type') || '';
          if (process.env.NODE_ENV !== 'production') {
            res.setHeader('x-proxy-had-token', token ? '1' : '0');
            if (headers['Cookie']) res.setHeader('x-proxy-cookie', headers['Cookie']);
            res.setHeader('x-proxy-attempt', attempt.label);
            res.setHeader('x-proxy-upstream', attempt.url);
          }
          if (ct.includes('application/json')) {
            try { return res.status(r.status).json(JSON.parse(t || 'null')); } catch { return res.status(r.status).send(t); }
          }
          return res.status(r.status).send(t);
        }
        // Non-2xx: continue to next attempt
      } catch (e: any) {
        console.log(`[create-proxy] attempt ${attempt.label} error:`, e?.message || e);
        lastStatus = 0;
        lastText = e?.message || String(e);
        lastAttemptLabel = attempt.label;
        lastUrl = attempt.url;
      }
    }

    // If we reach here, all attempts failed; return diagnostics in dev, 502 otherwise
    if (process.env.NODE_ENV !== 'production') {
      return res.status(lastStatus || 502).json({
        error: 'upstream_failed',
        upstreamStatus: lastStatus,
        upstreamBody: safeParseJSON(lastText),
        upstreamRaw: lastText,
        upstreamHeaders: lastHeaders,
        lastAttempt: lastAttemptLabel,
        upstreamUrl: lastUrl,
        note: 'Tried JSON + form and both /posts/create and /post/create'
      });
    }
    return res.status(502).json({ error: 'Bad gateway' });

  } catch (err: any) {
    console.error('API Proxy Error:', err);
    return res.status(500).json({ error: 'Internal proxy error', message: err?.message });
  }
}

// Helper to attempt JSON parse
function safeParseJSON(text: string) {
  try { return JSON.parse(text); } catch { return undefined; }
}
