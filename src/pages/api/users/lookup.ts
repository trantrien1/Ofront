import type { NextApiRequest, NextApiResponse } from "next";

const UPSTREAM = process.env.UPSTREAM_URL || "https://rehearten-production.up.railway.app";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  const { username } = req.query as { username?: string };
  if (!username) return res.status(400).json({ error: "username is required" });

  const bearer = req.headers.authorization;
  const token = req.cookies?.token;
  const jsession = req.cookies?.UPSTREAM_JSESSIONID;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (bearer) headers["Authorization"] = String(bearer);
  if (token) headers["Cookie"] = `token=${token}` + (jsession ? `; JSESSIONID=${jsession}` : "");
  else if (jsession) headers["Cookie"] = `JSESSIONID=${jsession}`;

  // Try common patterns
  const paths = [
    `/users?username=${encodeURIComponent(String(username))}`,
    `/api/users?username=${encodeURIComponent(String(username))}`,
    `/users/${encodeURIComponent(String(username))}`,
    `/api/users/${encodeURIComponent(String(username))}`,
    `/user/${encodeURIComponent(String(username))}`,
    `/api/user/${encodeURIComponent(String(username))}`,
  ];

  for (const p of paths) {
    try {
      const r = await fetch(`${UPSTREAM}${p}`, { headers });
      const text = await r.text();
      if (!r.ok) continue;
      try {
        const data = JSON.parse(text);
        return res.status(200).json(data);
      } catch {
        return res.status(200).send(text);
      }
    } catch {}
  }

  return res.status(404).json({ error: "user not found in upstream", username });
}
