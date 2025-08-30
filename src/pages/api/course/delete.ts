import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../_utils/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['DELETE','POST'].includes(req.method || '')) {
    res.setHeader('Allow','DELETE, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = requireAdmin(req);
  if (!admin.ok) return res.status(403).json({ error: 'forbidden', message: 'Admin only' });

  try {
    const bodyObj = typeof req.body === 'string' ? safeParseJSON(req.body) || {} : (req.body || {});
    const courseId = bodyObj?.courseId ?? bodyObj?.id ?? (req.query && (req.query as any).courseId);
    if (!courseId) return res.status(400).json({ error: 'courseId required' });
    const cascadeReq = String((bodyObj?.cascade ?? (req.query as any)?.cascade) || '').toLowerCase();
    const wantCascade = cascadeReq === '1' || cascadeReq === 'true' || cascadeReq === 'yes';

    const upstreamBase = process.env.UPSTREAM_URL || 'https://rehearten-production.up.railway.app';
  const headers = buildHeaders(req);
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('x-proxy-has-auth', headers['Authorization'] ? '1' : '0');
    }

    const id = String(courseId);
  const attempts: Array<{ url: string; method: 'POST' | 'DELETE'; headers: Record<string,string>; body?: string; label: string }> = [];
  const pathBase = '/coure/delete';
  // Prioritize correct upstream mapping: DELETE /coure/delete/{id}
  const delH = { ...headers } as Record<string,string>;
  if (delH['Content-Type']) delete delH['Content-Type'];
  attempts.push({ url: `${upstreamBase}${pathBase}/${encodeURIComponent(id)}`, method: 'DELETE', headers: delH, label: 'DELETE_path_id_PRIMARY' });
  // Also try POST override at the same path
  // For empty-body POSTs, avoid sending Content-Type
  const noCT = { ...headers } as Record<string,string>;
  if (noCT['Content-Type']) delete noCT['Content-Type'];
  attempts.push({ url: `${upstreamBase}${pathBase}/${encodeURIComponent(id)}`, method: 'POST', headers: { ...noCT, 'X-HTTP-Method-Override': 'DELETE' }, label: 'POST_path_id_PRIMARY' });
  const primaryUrl = attempts[0]?.url;
  // Fallbacks (POST only)
    const nId = Number(id);
    const jsonBodies = [
      { courseId: id },
      { id },
      { coureId: id },
      // numeric variants
      { courseId: isFinite(nId) ? nId : id },
      { id: isFinite(nId) ? nId : id },
      { coureId: isFinite(nId) ? nId : id },
    ];
  // POST with JSON bodies
    for (const jb of jsonBodies) {
  attempts.push({ url: `${upstreamBase}${pathBase}`, method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(jb), label: `POST_JSON_${Object.keys(jb)[0]}` });
  if (headers['Cookie']) { const h2 = { ...headers, 'Content-Type': 'application/json' } as Record<string,string>; delete h2['Cookie']; attempts.push({ url: `${upstreamBase}${pathBase}`, method: 'POST', headers: h2, body: JSON.stringify(jb), label: `POST_JSON_${Object.keys(jb)[0]}_noCookie` }); }
    }
    // Form-encoded
    const formKeys = ['courseId','id','coureId'] as const;
    for (const k of formKeys) {
      const form = new URLSearchParams(); form.set(k, id);
      attempts.push({ url: `${upstreamBase}${pathBase}`, method: 'POST', headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString(), label: `POST_FORM_${k}` });
    }
  // Path param variant (secondary, without override header)
  attempts.push({ url: `${upstreamBase}${pathBase}/${encodeURIComponent(id)}`, method: 'POST', headers: { ...noCT }, label: 'POST_path_id' });
  // Query param variants (no body)
  const qKeys = ['id','courseId','coureId'] as const;
  for (const k of qKeys) {
    attempts.push({ url: `${upstreamBase}${pathBase}?${encodeURIComponent(k)}=${encodeURIComponent(id)}`, method: 'POST', headers: { ...noCT }, label: `POST_query_${k}` });
  }
  // Plain text body with ID
  attempts.push({ url: `${upstreamBase}${pathBase}`, method: 'POST', headers: { ...headers, 'Content-Type': 'text/plain' }, body: String(id), label: 'POST_TEXT_id' });

  let last: { status: number; text: string; url: string; label: string } = { status: 0, text: '', url: '', label: '' };
  const results: Array<{ status: number; url: string; label: string }> = [];
    const cascadeResults: Array<{ videoId: string; ok: boolean; status: number }> = [];
    const tryCascadeIfNeeded = async (upstreamBodyText?: string) => {
      const text = upstreamBodyText || '';
      const isFk = /foreign key constraint fails/i.test(text);
      if (!isFk && !wantCascade) return false;
      // Fetch videos by course
      const vidsUrl = `${upstreamBase}/video/get/by-coure/${encodeURIComponent(id)}`;
      let vids: any[] = [];
      try {
        const r = await fetch(vidsUrl, { method: 'GET', headers });
        const t = await r.text();
        const j = safeParseJSON<any>(t);
        vids = (Array.isArray(j) && j) || (Array.isArray(j?.data) && j.data) || (Array.isArray(j?.content) && j.content) || (Array.isArray(j?.data?.content) && j.data.content) || [];
      } catch {}
      if (!Array.isArray(vids) || vids.length === 0) return false;
      // Attempt delete each video
      for (const v of vids) {
        const vid = String(v?.id ?? v?.videoId ?? v?.coureVideoId ?? '');
        if (!vid) continue;
        const vDelUrl = `${upstreamBase}/video/delete/${encodeURIComponent(vid)}`;
        try {
          const rd = await fetch(vDelUrl, { method: 'DELETE', headers: { ...headers } });
          cascadeResults.push({ videoId: vid, ok: rd.status >= 200 && rd.status < 300, status: rd.status });
          if (!(rd.status >= 200 && rd.status < 300)) {
            // try POST override
            const r2 = await fetch(vDelUrl, { method: 'POST', headers: { ...headers, 'X-HTTP-Method-Override': 'DELETE' } });
            cascadeResults.push({ videoId: vid, ok: r2.status >= 200 && r2.status < 300, status: r2.status });
          }
        } catch {
          cascadeResults.push({ videoId: vid, ok: false, status: 0 });
        }
      }
      return true;
    };

    for (const a of attempts) {
      try {
        try { console.log(`[api/course/delete] attempt=${a.label} ${a.method} ${a.url} body=${(a.body||'').toString().slice(0,200)}`); } catch {}
  const r = await fetch(a.url, { method: a.method, headers: a.headers, body: a.body });
        const t = await r.text();
        try { console.log(`[api/course/delete] upstream status=${r.status} label=${a.label} body_snippet=${(t||'').slice(0,500).replace(/\n/g,' ')}`); } catch {}
        last = { status: r.status, text: t, url: a.url, label: a.label };
    results.push({ status: r.status, url: a.url, label: a.label });
        if (r.status >= 200 && r.status < 300) {
          const ct = r.headers.get('content-type') || '';
          if (process.env.NODE_ENV !== 'production') { res.setHeader('x-proxy-upstream', a.url); res.setHeader('x-proxy-attempt', a.label); }
          if (ct.includes('application/json')) { try { return res.status(r.status).json(JSON.parse(t || 'null')); } catch { return res.status(r.status).send(t); } }
          return res.status(r.status).send(t);
        }
        // If foreign key constraint and course is not deleted yet, try cascade one time, then retry primary DELETE
        if (a.label === 'DELETE_path_id_PRIMARY' && r.status === 400) {
          const didCascade = await tryCascadeIfNeeded(t);
          if (didCascade) {
            // retry primary delete once after cascade
            try { console.log(`[api/course/delete] retry after cascade DELETE ${primaryUrl}`); } catch {}
            const r2 = await fetch(primaryUrl, { method: 'DELETE', headers: delH });
            const t2 = await r2.text();
            try { console.log(`[api/course/delete] retry upstream status=${r2.status} body_snippet=${(t2||'').slice(0,500).replace(/\n/g,' ')}`); } catch {}
            last = { status: r2.status, text: t2, url: primaryUrl, label: 'DELETE_path_id_AFTER_CASCADE' };
            results.push({ status: r2.status, url: primaryUrl, label: 'DELETE_path_id_AFTER_CASCADE' });
            if (r2.status >= 200 && r2.status < 300) {
              const ct2 = r2.headers.get('content-type') || '';
              if (process.env.NODE_ENV !== 'production') { res.setHeader('x-proxy-upstream', primaryUrl); res.setHeader('x-proxy-attempt', 'DELETE_path_id_AFTER_CASCADE'); }
              if (ct2.includes('application/json')) { try { return res.status(r2.status).json(JSON.parse(t2 || 'null')); } catch { return res.status(r2.status).send(t2); } }
              return res.status(r2.status).send(t2);
            }
          }
        }
      } catch (e: any) {
    last = { status: 0, text: e?.message || String(e), url: a.url, label: a.label };
    results.push({ status: 0, url: a.url, label: a.label });
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      const body = safeParseJSON(last.text) || last.text;
      const hint =
        (String(last.text||'').includes("Request method 'POST' is not supported") ? 'hint: backend expects DELETE at /coure/delete/{id}' :
        (String(last.text||'').includes('No static resource') ? 'hint: missing /coure/delete route on backend or wrong base path' : undefined));
      return res.status(last.status || 502).json({ error: 'upstream_failed', status: last.status, lastAttempt: last.label, upstreamUrl: last.url, primaryUrl, attempts: results, hint, cascadeResults, body });
    }
    return res.status(502).json({ error: 'Bad gateway' });
  } catch (e: any) {
    return res.status(500).json({ error: 'proxy_error', message: e?.message || String(e) });
  }
}

function cleanToken(t?: string | null) {
  if (!t) return undefined as any;
  let s = String(t).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
  if (!s) return undefined as any;
  if (s.startsWith('{') && s.endsWith('}')) { try { const j: any = JSON.parse(s); if (j?.token) s = String(j.token); } catch {} }
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
  const h: Record<string,string> = { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': req.headers['user-agent']?.toString() || 'Mozilla/5.0 (proxy)' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  // forward cookies if any (some upstreams use session auth)
  if (req.headers.cookie) h['Cookie'] = req.headers.cookie as string;
  const xpub = String(req.headers['x-public'] || '').toLowerCase();
  if (xpub === '1' || xpub === 'true') { delete h['Authorization']; }
  return h;
}

function safeParseJSON<T=any>(s?: string) { try { return s ? JSON.parse(s) as T : undefined as any; } catch { return undefined as any; } }
