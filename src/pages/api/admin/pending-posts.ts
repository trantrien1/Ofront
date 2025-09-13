import type { NextApiRequest, NextApiResponse } from "next";

const UPSTREAM = "https://rehearten-production.up.railway.app";

function cleanToken(raw?: string | null) {
  if (!raw) return "";
  let s = String(raw).trim();
  try {
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
    if (s.startsWith("{") && s.endsWith("}")) {
      const obj = JSON.parse(s);
      if (obj && typeof obj.token === "string" && obj.token) return obj.token;
    }
  } catch {}
  return s;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
  const token = cleanToken(req.cookies?.token || null);
  const role = String((req.cookies?.role || (req.cookies as any)?.ROLE || '')).toLowerCase();
  const incomingAuth = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const rawIncomingCookie = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
  const baseHeaders: Record<string, string> = { Accept: "application/json", ...(role ? { 'X-User-Role': role } : {}) };

  // Debug: incoming auth hints (do NOT log actual token)
  try {
  } catch {}

    // If we know the user is not admin from cookies, fail fast with a clear message
    if (role && role !== 'admin') {
      return res.status(403).json({
        error: 'forbidden',
        reason: 'admin_required',
        message: 'Bạn cần tài khoản quản trị (admin) để xem danh sách bài chờ duyệt.',
      });
    }
    const headerAttempts: Record<string, string>[] = [];
    const mergeCookies = (primary: string, secondary: string) => {
      const hasToken = /(?:^|;\s*)token=/.test(secondary);
      const parts = [] as string[];
      if (primary) parts.push(primary);
      if (secondary) {
        // Remove duplicate token from secondary if present when primary has token
        const sanitized = hasToken && primary.startsWith('token=')
          ? secondary.replace(/(?:^|;\s*)token=[^;]*/g, '').replace(/^;\s*|;\s*$/g, '')
          : secondary;
        if (sanitized) parts.push(sanitized);
      }
      return parts.filter(Boolean).join('; ');
    };

    // Attempts prioritizing full cookie forwarding
    if (token) {
      const tokenCookie = `token=${encodeURIComponent(token)}`;
      const merged = mergeCookies(tokenCookie, rawIncomingCookie);
      headerAttempts.push({ ...baseHeaders, Authorization: `Bearer ${token}`, Cookie: merged });
      headerAttempts.push({ ...baseHeaders, Cookie: merged });
      // Also try token cookie only
      headerAttempts.push({ ...baseHeaders, Authorization: `Bearer ${token}`, Cookie: tokenCookie });
      headerAttempts.push({ ...baseHeaders, Cookie: tokenCookie });
    }
    // If there is any incoming Cookie header, forward it as-is (with or without Authorization)
    if (rawIncomingCookie) {
      headerAttempts.push({ ...baseHeaders, Authorization: incomingAuth || (token ? `Bearer ${token}` : ''), Cookie: rawIncomingCookie });
      headerAttempts.push({ ...baseHeaders, Cookie: rawIncomingCookie });
    }
    // Authorization only as a fallback
    if (incomingAuth) {
      headerAttempts.push({ ...baseHeaders, Authorization: incomingAuth });
    }
    // Base headers (no auth)
    headerAttempts.push({ ...baseHeaders });

  // Only this upstream endpoint per user's backend; forward filters as query params
  const q = req.query as any;
  const first = (v: any) => Array.isArray(v) ? v[0] : v;
  const title = first(q?.title);
  const usernameByPost = first(q?.userOfPost?.username);
  const groupnameByPost = first(q?.groupOfPost?.name);
  const status = 0
  // Build query to include empty keys (e.g., ?title&usernameByPost&groupnameByPost&status=1)
  const parts: string[] = [];
  const addKeyMaybeEmpty = (k: string, v: any) => {
    if (v === undefined || v === null || String(v) === '') {
      parts.push(encodeURIComponent(k));
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  };
  addKeyMaybeEmpty('title', title);
  addKeyMaybeEmpty('usernameByPost', usernameByPost);
  addKeyMaybeEmpty('groupOfPost', groupnameByPost);
  
  if (status !== undefined && status !== null && String(status) !== '') {
    parts.push(`status=${encodeURIComponent(String(status))}`);
  }
  const query = parts.join('&');
  const url = `${UPSTREAM}/post/get/all${query ? `?${query}` : ''}`;
    let lastStatus = 0; let lastCT = ""; let lastText = ""; let lastParsed: any = undefined;
    let attemptIdx = 0;
    for (const headers of headerAttempts) {
      attemptIdx += 1;
      const r = await fetch(url, { method: "GET", headers });
      const ct = r.headers.get("content-type") || "";
      let text = "";
      try { text = await r.text(); } catch {}
      let parsed: any = undefined;
      try { parsed = text && /\{\s*\"|\[/.test(text) ? JSON.parse(text) : undefined; } catch {}
      // Debug: log each attempt (mask secrets)
      try {
      } catch {}
      if (r.ok) return res.status(200).json(parsed ?? (text ? { upstreamText: text } : []));
      lastStatus = r.status; lastCT = ct; lastText = text; lastParsed = parsed;
      // Try next header variant only for likely auth errors
      if (![401, 403, 500].includes(r.status)) break;
    }
    // Debug: final error summary
    try {
      console.error('[api/admin/pending-posts] upstream failed', {
        status: lastStatus || 502,
        ct: lastCT,
        url,
        bodyPreview: typeof lastParsed !== 'undefined' ? lastParsed : (lastText ? lastText.slice(0, 500) : ''),
      });
    } catch {}
    return res.status(lastStatus || 502).json({ upstreamStatus: lastStatus || 502, contentType: lastCT, url, body: lastParsed ?? lastText });
  } catch (e: any) {
    try { console.error('[api/admin/pending-posts] proxy_error', e?.message || e); } catch {}
    return res.status(500).json({ error: "proxy_error", message: e?.message || String(e) });
  }
}
