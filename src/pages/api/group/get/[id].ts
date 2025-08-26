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
  const url = `${upstream}/group/get/${encodeURIComponent(id)}`;

  const cleanToken = (t?: string | null) => {
    if (!t) return undefined;
    let s = String(t).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
    if (!s) return undefined;
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
  const cookieHeader = cookieParts.length ? cookieParts.join("; ") : undefined;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": req.headers["user-agent"] || "Mozilla/5.0 (proxy)",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (cookieHeader) headers["Cookie"] = cookieHeader;

  try {
    const r = await fetch(url, { method: "GET", headers });
    const text = await r.text();
    try { return res.status(r.status).json(JSON.parse(text)); } catch { return res.status(r.status).send(text); }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "proxy error" });
  }
}
