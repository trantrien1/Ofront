import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }
  res.setHeader("Cache-Control", "no-store");

  const { id } = req.query as { id?: string };
  if (!id) return res.status(400).json({ error: "id required" });

  const upstream = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";

  const cleanToken = (t?: string | null) => {
    if (!t) return undefined;
    let s = String(t).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
    if (!s) return undefined;
    if (s.startsWith("{") && s.endsWith("}")) {
      try { const obj = JSON.parse(s as any); if (obj && typeof obj.token === 'string' && obj.token) s = obj.token; } catch {}
    }
    const lower = s.toLowerCase();
    if (lower === "undefined" || lower === "null" || lower === "bearer") return undefined;
    return s;
  };

  let token = cleanToken(req.cookies?.token as string | undefined);
  if (!token) {
    const auth = req.headers.authorization || "";
    if (auth.toLowerCase().startsWith("bearer ")) token = cleanToken(auth.slice(7));
  }
  if (!token) token = cleanToken(req.cookies?.authToken as string | undefined) || cleanToken(req.cookies?.accessToken as string | undefined);

  const upstreamSession = (req.cookies?.UPSTREAM_JSESSIONID || req.cookies?.JSESSIONID || (req.cookies as any)?.jsessionid) as string | undefined;
  const cookieParts: string[] = [];
  if (token) cookieParts.push(`token=${token}`);
  if (upstreamSession) cookieParts.push(`JSESSIONID=${upstreamSession}`);

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": req.headers["user-agent"]?.toString() || "Mozilla/5.0 (proxy)",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (cookieParts.length) headers["Cookie"] = cookieParts.join("; ");

  // Optional explicit public mode: strip auth/cookies and set x-public
  const xPublic = String(req.headers["x-public"] || "").toLowerCase();
  let forcePublic = xPublic === "1" || xPublic === "true";
  const qPublic = String((req.query as any)?.public || "").toLowerCase();
  if (!forcePublic && (qPublic === "1" || qPublic === "true")) forcePublic = true;
  if (forcePublic) {
    delete headers["Authorization"]; delete headers["Cookie"]; headers["x-public"] = "1";
  }

  // helper to extract array shapes robustly
  const extractList = (raw: any): any[] => {
    try {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw.data)) return raw.data;
      if (Array.isArray(raw.groups)) return raw.groups;
      if (raw.data && Array.isArray(raw.data.groups)) return raw.data.groups;
      if (raw.data && Array.isArray(raw.data.list)) return raw.data.list;
      if (raw.data && Array.isArray(raw.data.content)) return raw.data.content;
      if (Array.isArray(raw.content)) return raw.content;
      if (Array.isArray(raw.items)) return raw.items;
      if (raw.page && Array.isArray(raw.page.content)) return raw.page.content;
      if (raw.result && Array.isArray(raw.result.items)) return raw.result.items;
      if (raw.data && raw.data.page && Array.isArray(raw.data.page.content)) return raw.data.page.content;
      if (raw.payload && Array.isArray(raw.payload)) return raw.payload;
      // light deep scan
      const stack = [raw]; const seen = new Set<any>(); let depth = 0;
      while (stack.length && depth < 3) {
        const n = stack.shift();
        if (!n || typeof n !== 'object') continue;
        if (seen.has(n)) continue; seen.add(n);
        for (const k of Object.keys(n)) {
          const v: any = (n as any)[k];
          if (Array.isArray(v)) {
            if (v.length === 0) return v;
            if (v.every((e: any) => typeof e === 'object')) return v;
          } else if (v && typeof v === 'object') {
            stack.push(v);
          }
        }
        depth++;
      }
    } catch {}
    return [];
  };

  // try to set ownerId when missing using current user's context
  const maybeEnrichOwner = async (obj: any): Promise<any> => {
    try {
      if (!obj || obj.ownerId || obj.creatorId) return obj;
      // decode current user id from JWT if available
      const decodeJwt = (t?: string) => {
        try {
          if (!t) return undefined;
          const parts = String(t).split('.');
          if (parts.length < 2) return undefined;
          const json = Buffer.from(parts[1].replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8');
          return JSON.parse(json);
        } catch { return undefined; }
      };
      const payload: any = decodeJwt(token);
      const userId = payload?.userId ?? payload?.id ?? payload?.sub ?? payload?.username;
      // ask by-user to see if this user has an owner role for this group
      const proto = (req.headers["x-forwarded-proto"] as string) || "http";
      const host = req.headers.host;
      const base = `${proto}://${host}`;
      const h = { ...headers } as Record<string,string>;
      // Use local proxy to reuse cookie/authorization strategy
      const r = await fetch(`${base}/api/group/get/by-user`, { headers: h });
      const txt = await r.text();
      let data: any; try { data = JSON.parse(txt); } catch { data = txt; }
      const list = extractList(data);
      const it = list.find((g: any) => String(g.id ?? g.groupId ?? g.code ?? g._id) === String(obj.id ?? obj.groupId ?? obj.code ?? ''));
      if (it) {
        const role = (it.role || it.userRole || it.memberRole || (it.isOwner ? 'owner' : undefined)) as string | undefined;
        if (role && role.toLowerCase() === 'owner' && userId != null) {
          return { ...obj, ownerId: String(userId) };
        }
      }
    } catch {}
    return obj;
  };

  try {
    const log = (...args: any[]) => { if (process.env.NODE_ENV !== 'production') try { console.log('[group/get/:id]', ...args); } catch {} };
    const doFetch = async (u: string, h: Record<string,string>) => {
      const r = await fetch(u, { method: "GET", headers: h });
      const t = await r.text();
      log('fetch', u, '->', r.status);
      return { r, t } as { r: Response; t: string };
    };

    log('incoming id=', id);

    // Strategy aligned to upstream: use only get/all (+ optional ?name) and get/by-user
    // 1) Try upstream list filtered by name
    const byNameUrl = `${upstream}/group/get/all?name=${encodeURIComponent(id)}`;
    let { r: r1, t: t1 } = await doFetch(byNameUrl, headers);
    if (r1.ok) {
      try {
        const data = JSON.parse(t1);
        const list = extractList(data);
        const found = (list || []).find((g: any) => String(g.id ?? g.groupId ?? g.code ?? g._id) === id || String(g.name ?? g.displayName ?? '') === id);
        if (found) {
          const enriched = await maybeEnrichOwner(found);
          res.setHeader('x-upstream-source', 'get/all?name');
          return res.status(200).json({ data: enriched });
        }
      } catch {}
    }

    // 2) Try upstream full list and search client-side
    const allUrl = `${upstream}/group/get/all`;
    let { r: r2, t: t2 } = await doFetch(allUrl, headers);
    if (r2.ok) {
      try {
        const data = JSON.parse(t2);
        const list = extractList(data);
        const found = (list || []).find((g: any) => String(g.id ?? g.groupId ?? g.code ?? g._id) === id || String(g.name ?? g.displayName ?? '') === id);
        if (found) {
          const enriched = await maybeEnrichOwner(found);
          res.setHeader('x-upstream-source', 'get/all');
          return res.status(200).json({ data: enriched });
        }
      } catch {}
    }

    // 3) Try local proxy for get/all (it has its own auth/public fallbacks)
    try {
      const proto = (req.headers["x-forwarded-proto"] as string) || "http";
      const host = req.headers.host;
      const base = `${proto}://${host}`;
      const localUrl = `${base}/api/group/get/all${id ? `?name=${encodeURIComponent(id)}` : ''}`;
      const rl = await fetch(localUrl, { headers });
      const tl = await rl.text();
      if (rl.ok) {
        try {
          const data = JSON.parse(tl);
          const list = extractList(data);
          const found = (list || []).find((g: any) => String(g.id ?? g.groupId ?? g.code ?? g._id) === id || String(g.name ?? g.displayName ?? '') === id);
          if (found) {
            const enriched = await maybeEnrichOwner(found);
            res.setHeader('x-upstream-source', 'local get/all');
            return res.status(200).json({ data: enriched });
          }
        } catch {}
      }
    } catch {}

    // 4) Last resort: by-user and search
    try {
      const proto = (req.headers["x-forwarded-proto"] as string) || "http";
      const host = req.headers.host;
      const base = `${proto}://${host}`;
      let byUser = await fetch(`${base}/api/group/get/by-user`, { headers });
      let byText = await byUser.text();
      let byData: any; try { byData = JSON.parse(byText); } catch { byData = byText; }
      if (!byUser.ok) {
        const byUp = await fetch(`${upstream}/group/get/by-user`, { headers });
        byText = await byUp.text();
        try { byData = JSON.parse(byText); } catch { byData = byText; }
      }
      const arr = extractList(byData) as any[];
      const found = arr.find((g: any) => String(g.id ?? g.groupId ?? g.code ?? g._id) === id || String(g.code ?? '') === id);
      if (found) {
        res.setHeader('x-proxy-fallback', 'by-user-search');
        return res.status(200).json({ data: found });
      }
    } catch {}

    // Not found; respond 404 consistent with lack of endpoint
    return res.status(404).json({ error: 'Group not found' });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "proxy error" });
  }
}
