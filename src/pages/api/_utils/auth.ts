import type { NextApiRequest } from "next";

function safeJsonParse<T = any>(s?: string | null): T | undefined {
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
    return safeJsonParse(json) || undefined;
  } catch {
    return undefined;
  }
}

function pickRole(obj: any): string | undefined {
  if (!obj) return undefined;
  // Common places where role may appear
  if (typeof obj.role === "string") return obj.role;
  if (Array.isArray(obj.roles) && obj.roles.length) return String(obj.roles[0]);
  if (typeof obj.roles === "string") return obj.roles;
  if (Array.isArray(obj.authorities) && obj.authorities.length) return String(obj.authorities[0]);
  if (typeof obj.scope === "string") return obj.scope;
  return undefined;
}

export function getRoleFromRequest(req: NextApiRequest): { role?: string; isAdmin: boolean; source?: string } {
  // Try cookies: token may be a JWT or a JSON string { token, role }
  const c = req.cookies || {};
  const cookieKeys = ["token", "authToken", "accessToken", "userRole", "role"] as const;

  for (const key of cookieKeys) {
    const raw = c[key as keyof typeof c] as any;
    if (!raw) continue;
    const s = String(raw);
    // If JSON-wrapped, extract role and token
    const json = s.startsWith("{") && s.endsWith("}") ? safeJsonParse(s) : undefined;
    if (json) {
      const role = pickRole(json);
      if (role) return { role, isAdmin: /admin/i.test(role) || /ROLE_ADMIN/.test(role), source: `cookie:${key}:json` };
      if (typeof json.token === "string") {
        const payload = decodeJwtPayload(json.token);
        const role2 = pickRole(payload);
        if (role2) return { role: role2, isAdmin: /admin/i.test(role2) || /ROLE_ADMIN/.test(role2), source: `cookie:${key}:jwt_payload` };
      }
    }
    // Try decode as JWT directly
    const payload = decodeJwtPayload(s);
    const role = pickRole(payload);
    if (role) return { role, isAdmin: /admin/i.test(role) || /ROLE_ADMIN/.test(role), source: `cookie:${key}:jwt_payload` };
    // Or the cookie might be role itself
    if (s && (s.toLowerCase() === "admin" || s === "ROLE_ADMIN")) return { role: s, isAdmin: true, source: `cookie:${key}` };
  }

  // Try Authorization header (Bearer <jwt>)
  const auth = req.headers.authorization || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    const payload = decodeJwtPayload(token);
    const role = pickRole(payload);
    if (role) return { role, isAdmin: /admin/i.test(role) || /ROLE_ADMIN/.test(role), source: "header.authorization" };
  }

  return { isAdmin: false };
}

export function requireAdmin(req: NextApiRequest): { ok: boolean; role?: string } {
  const { isAdmin, role } = getRoleFromRequest(req);
  return { ok: !!isAdmin, role };
}
