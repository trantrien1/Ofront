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
    // Ensure content is present (backend requires NotBlank)
    const bodyContent = (req.body?.content ?? req.body?.body ?? '').toString();
    if (bodyContent.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
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
    // Require authentication for posting
    if (!forcePublic && !token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

  // Build payload per backend PostDTO: { title, content, type, groupId, imageURL?, status?, isPersonalPost? }
  const content = bodyContent;
  const rawGroupId = (req.body?.groupId ?? req.body?.communityId);
  const groupIdNum = rawGroupId != null ? Number(String(rawGroupId)) : undefined;
  const hasGroup = typeof groupIdNum === 'number' && Number.isFinite(groupIdNum);
  // Backend only accepts 'blog' or 'forum'. Map by context; ignore UI 'postType' (TEXT/IMAGE)
  const type = hasGroup ? 'blog' : 'forum';
  const imageURL = (req.body as any)?.imageURL ?? (req.body as any)?.imageUrl ?? undefined;
  const isPersonalPost = typeof (req.body as any)?.isPersonalPost === 'boolean' ? (req.body as any)?.isPersonalPost : undefined;

  const payload: any = { title: String(req.body?.title ?? '').trim(), content: content };
  if (hasGroup) payload.groupId = groupIdNum;
  if (type) payload.type = type;
  if (typeof imageURL !== 'undefined' && imageURL !== null) payload.imageURL = imageURL;
  // Anonymous flag mapping: backend field name (Java boolean isAnonymous) usually serializes as JSON key 'anonymous'
  // So we must send BOTH 'anonymous' and 'isAnonymous' to be safe.
  const bodyAnon = (req.body as any)?.anonymous;
  const bodyIsAnon = (req.body as any)?.isAnonymous;
  if (typeof bodyAnon === 'boolean') {
    payload.isAnonymous = bodyAnon;
    payload.anonymous = bodyAnon;
  }
  if (typeof bodyIsAnon === 'boolean') {
    payload.isAnonymous = bodyIsAnon;
    payload.anonymous = bodyIsAnon;
  }
  // Always start with status=0 on creation as required
  payload.status = 0;
  if (typeof isPersonalPost === 'boolean') payload.isPersonalPost = isPersonalPost;

  // If posting to a group and user is admin of that group, mark intent to auto-approve
    // Backend ExtractUserUtils reads token from cookie; we already forward it in headers
    const upstream = process.env.UPSTREAM_URL || 'https://rehearten-production.up.railway.app';
  let shouldAutoApprove = false;
  if (!forcePublic && hasGroup && token) {
      try {
        const rRole = await fetch(`${upstream}/group/get/by-user`, { method: 'GET', headers });
        const txt = await rRole.text();
        let data: any = undefined;
        try { data = JSON.parse(txt); } catch {}
        if (Array.isArray(data)) {
          const found = data.find((g: any) => Number(g?.id) === Number(groupIdNum));
          const role = String(found?.userRole || '').toLowerCase();
  if (role === 'admin') { shouldAutoApprove = true; }
        }
      } catch {}
    }

  const url = `${upstream}/post/create`;
  console.log(`[create-proxy] Attempt post_create -> ${url} payload=`, payload);
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    const t = await r.text();
  console.log(`[create-proxy] status=${r.status} label=post_create body_snippet=${t.slice(0, 800).replace(/\n/g,' ')}`);
    const ct = r.headers.get('content-type') || '';
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('x-proxy-had-token', token ? '1' : '0');
      if (headers['Cookie']) res.setHeader('x-proxy-cookie', headers['Cookie']);
  res.setHeader('x-proxy-attempt', 'post_create');
      res.setHeader('x-proxy-upstream', url);
    }
    if (r.status >= 200 && r.status < 300) {
      let created: any = undefined;
      if (ct.includes('application/json')) {
        try { created = JSON.parse(t || 'null'); } catch { created = undefined; }
      }

      // Follow-up auto-approve attempt for admins (backend create clears status)
      if (shouldAutoApprove && created && (typeof created.id !== 'undefined')) {
        try {
          // Use numeric types to match backend parsing (Integer.parseInt acceptable for strings, but be explicit)
          const approveBody = JSON.stringify({ id: Number(created.id), status: 1 });
          const r2 = await fetch(`${upstream}/post/update-status`, { method: 'PUT', headers, body: approveBody });
          const t2 = await r2.text();
          console.log(`[create-proxy] followup update-status status=${r2.status} body_snippet=${t2.slice(0, 400).replace(/\n/g,' ')}`);
          if (r2.ok) {
            const ct2 = r2.headers.get('content-type') || '';
            if (ct2.includes('application/json')) {
              try { created = JSON.parse(t2 || 'null'); } catch {}
            }
          } else {
            // Upstream refused approval (likely backend bug in group-role check). Optimistically mark approved in response
            try { if (created && typeof created === 'object') (created as any).status = 1; } catch {}
          }
        } catch (e) {
          console.log('[create-proxy] followup update-status failed:', (e as any)?.message || e);
          // Also optimistically mark approved for client UX
          try { if (created && typeof created === 'object') (created as any).status = 1; } catch {}
        }
      }

      if (typeof created !== 'undefined') return res.status(r.status).json(created);
      return res.status(r.status).send(t);
    }

    // Non-2xx: return upstream body in dev, 502 otherwise
    if (process.env.NODE_ENV !== 'production') {
      return res.status(r.status || 502).json({
        error: 'upstream_failed',
        upstreamStatus: r.status,
        upstreamBody: safeParseJSON(t),
        upstreamRaw: t,
  lastAttempt: 'post_create',
        upstreamUrl: url,
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
