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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT" && req.method !== "POST") {
    res.setHeader("Allow", ["PUT", "POST"]);
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "missing_id" });
    const token = cleanToken(req.cookies?.token || null);
    const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["Cookie"] = `token=${encodeURIComponent(token)}`;
    }
    const body = JSON.stringify({ status: 1,id });

    const attempts = [
        { url: `${UPSTREAM}/post/update-status`, method: "PUT" },
    ];

    let lastError: any = null;
    for (const a of attempts) {
      try {
        const r = await fetch(a.url, { method: a.method as any, headers, body });
        const ct = r.headers.get("content-type") || "";
        const resp = ct.includes("application/json") ? await r.json() : await r.text();
        if (r.ok) return res.status(200).json(resp || { ok: true });
        lastError = { status: r.status, body: resp };
        if (![404, 401, 403, 500].includes(r.status)) break;
      } catch (e) {
        lastError = e;
      }
    }
    return res.status(502).json({ error: "upstream_unavailable", detail: lastError });
  } catch (e: any) {
    return res.status(500).json({ error: "proxy_error", message: e?.message || String(e) });
  }
}
