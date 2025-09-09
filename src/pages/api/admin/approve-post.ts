import type { NextApiRequest, NextApiResponse } from "next";

const UPSTREAM = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";

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

const first = (v: any) => Array.isArray(v) ? v[0] : v;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
  const rawId = first((req.body as any)?.id ?? (req.query as any)?.id);
  const rawStatus = first((req.body as any)?.status ?? (req.query as any)?.status ?? 1);
  const rawGroupMaybe = first(req.headers["x-group-id"] ?? (req.body as any)?.groupId ?? (req.query as any)?.groupId);

  const id = Number(rawId);
  const statusNum = Number(rawStatus);

  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "invalid_id" });
  if (!(statusNum === 0 || statusNum === 1)) return res.status(400).json({ error: "invalid_status" });

    const token = cleanToken(req.cookies?.token || null);
    const incomingCookie = typeof req.headers.cookie === "string" ? req.headers.cookie : "";
    const tokenCookie = token ? `token=${encodeURIComponent(token)}` : "";
    const cookie = [tokenCookie, incomingCookie].filter(Boolean).join("; ").replace(/^(;\s*)+|(;\s*)+$/g, "");

  const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    };
  const groupNum = rawGroupMaybe != null && String(rawGroupMaybe).trim() !== '' ? Number(rawGroupMaybe) : NaN;
  if (Number.isFinite(groupNum) && groupNum > 0) {
    headers["x-group-id"] = String(groupNum);
  }

  // Backend expects strings in Map<String,String>
  const body = JSON.stringify({ id: String(id), status: String(statusNum) });
    const url = `${UPSTREAM}/post/update-status`;

    const r = await fetch(url, { method: "PUT", headers, body });
    const ct = r.headers.get("content-type") || "";
    const text = await r.text();
    const parsed = ct.includes("application/json") ? (text ? JSON.parse(text) : {}) : undefined;

    if (r.ok) return res.status(200).json(parsed ?? { ok: true });

    try {
      console.error("[approve-post] fail", {
        status: r.status,
        url,
  bodySent: { id: String(id), status: String(statusNum) },
  headersInfo: { hasAuth: !!headers.Authorization, xGroup: headers["x-group-id"] },
        upstream: String(text || '').slice(0, 400),
      });
    } catch {}
    return res.status(r.status || 502).json({ error: "upstream_error", status: r.status, body: parsed ?? text });
  } catch (e: any) {
    return res.status(500).json({ error: "proxy_error", message: e?.message || String(e) });
  }
}
