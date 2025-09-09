import type { NextApiRequest, NextApiResponse } from "next";
import { getRoleFromRequest } from "../_utils/auth";

type AnyObj = Record<string, any>;

function safeJson<T = any>(s?: string | null): T | undefined {
  if (!s) return undefined as any;
  try { return JSON.parse(s); } catch { return undefined as any; }
}

function decodeJwtPayload(token?: string) {
  try {
    if (!token || typeof token !== "string") return undefined;
    const parts = token.split(".");
    if (parts.length < 2) return undefined;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(b64, "base64").toString("utf8");
    return safeJson(json) || undefined;
  } catch { return undefined; }
}

function extractRequesterIds(req: NextApiRequest): string[] {
  const ids: string[] = [];
  const cookies: AnyObj = req.cookies || {};
  const cands = [cookies.username, cookies.userId, cookies.uid, cookies.email, cookies.userUID];
  for (const c of cands) if (c) ids.push(String(c));
  // Authorization bearer
  const auth = req.headers.authorization || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    const payload = decodeJwtPayload(token) as AnyObj | undefined;
    if (payload) {
      const p = [payload.username, payload.sub, payload.userId, payload.uid, payload.email, payload.userUID];
      for (const v of p) if (v) ids.push(String(v));
    }
  }
  // Best-effort: also check custom header if present
  const xUser = req.headers["x-user"];
  if (xUser && typeof xUser === "string") ids.push(xUser);
  return ids
    .filter(Boolean)
    .map((v) => String(v).trim().toLowerCase())
    .filter((v, i, a) => a.indexOf(v) === i);
}

function extractOwnerIdsFromPost(p: AnyObj): string[] {
  if (!p || typeof p !== 'object') return [];
  const tops: any[] = [];

  // 1) Common top-level variants
  tops.push(
    p.username,
    p.userDisplayText,
    p.userUID,
    p.creatorId,
    p.creatorID,
    p.email,
    p.ownerId,
    p.ownerID,
    p.userId,
    p.userID,
    p.uid,
    p.idUser
  );

  // 2) Nested under userOfPost
  const u = p.userOfPost;
  if (u && typeof u === 'object') {
    tops.push(u.username, u.userUID, u.email, u.id, u.uid);
  } else if (typeof u === 'string') {
    tops.push(u);
  }

  // 3) Other common containers
  const candObjs = [p.author, p.user, p.createdBy];
  for (const obj of candObjs) {
    if (obj && typeof obj === 'object') {
      tops.push(obj.username, obj.userUID, obj.email, obj.id, obj.uid);
    }
  }

  return tops
    .filter(Boolean)
    .map((v) => String(v).trim().toLowerCase())
    .filter((v, i, a) => a.indexOf(v) === i);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ((req.method || '').toUpperCase() !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).json({ error: 'Method not allowed. Use PUT.' });
  }

  try {
    const rawBody: AnyObj = typeof req.body === 'string' ? (safeJson(req.body) || {}) : (req.body || {});
    const idRaw = rawBody.postId ?? rawBody.id;
    const idNum = Number(idRaw);
    if (!idRaw || !Number.isFinite(idNum)) return res.status(400).json({ error: 'postId (id) required' });
    const title = rawBody.title;
    const content = rawBody.content;

  const upstream = process.env.UPSTREAM_URL || 'https://rehearten-production.up.railway.app';
  const baseHeaders: Record<string, string> = { Accept: 'application/json' };
  if (req.headers.authorization) baseHeaders['Authorization'] = String(req.headers.authorization);
  if (req.headers.cookie) baseHeaders['Cookie'] = String(req.headers.cookie);

    // Permission gating: allow admins or post owner only
    const { isAdmin } = getRoleFromRequest(req);
    const skipLocalCheck = String(process.env.SKIP_LOCAL_OWNERSHIP_CHECK || '').trim() === '1';
    if (!isAdmin && !skipLocalCheck) {
      try {
        const getUrl = `${upstream}/post/get/${idNum}`;
        const gr = await fetch(getUrl, { headers: baseHeaders });
        const gtxt = await gr.text();
        const gjson = safeJson<AnyObj>(gtxt) || {};
        if (!gr.ok) {
          try { console.error('[post/update] GET owner failed', gr.status, (gtxt || '').slice(0, 300)); } catch {}
          return res.status(403).json({ error: 'Không xác minh được quyền cập nhật (GET thất bại)' });
        }
        const ownerIds = extractOwnerIdsFromPost(gjson);
        const requesterIds = extractRequesterIds(req);
        try { console.log('[post/update] ids', { ownerIds, requesterIds, getStatus: gr.status, bodySample: Object.keys(gjson || {}) }); } catch {}
        const allowed = requesterIds.some((id) => ownerIds.includes(id));
        if (!allowed) {
          return res.status(403).json({ error: 'Bạn không có quyền cập nhật bài viết này' });
        }
      } catch (e) {
        return res.status(403).json({ error: 'Không xác minh được quyền cập nhật' });
      }
    }

  const url = `${upstream}/post/update`;
  const method = 'PUT'; // Backend only exposes @PutMapping("update")
    const payload: AnyObj = { id: idNum };
    if (typeof title === 'string') payload.title = title;
    if (typeof content === 'string') payload.content = content;

  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (baseHeaders['Authorization']) headers['Authorization'] = baseHeaders['Authorization'];
  if (baseHeaders['Cookie']) headers['Cookie'] = baseHeaders['Cookie'];
  const r = await fetch(url, { method, headers, body: JSON.stringify(payload) });

    const txt = await r.text();
    if (process.env.NODE_ENV !== 'production') {
      try { console.log('[post/update] upstream status=', r.status); } catch {}
    }
    if (!r.ok) {
      try { console.error('[post/update] upstream PUT failed', r.status, (txt || '').slice(0, 300)); } catch {}
    }
    try { return res.status(r.status).json(safeJson(txt) ?? txt); } catch { return res.status(r.status).send(txt); }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'proxy error' });
  }
}
