// Client-side role helpers to detect admin status from cookies/localStorage/JWT

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
    const json = atob(b64);
    return safeJsonParse(json) || undefined;
  } catch {
    return undefined;
  }
}

function pickRole(obj: any): string | undefined {
  if (!obj) return undefined;
  if (typeof obj.role === "string") return obj.role;
  if (Array.isArray(obj.roles) && obj.roles.length) return String(obj.roles[0]);
  if (typeof obj.roles === "string") return obj.roles;
  if (Array.isArray(obj.authorities) && obj.authorities.length) return String(obj.authorities[0]);
  if (typeof obj.scope === "string") return obj.scope;
  return undefined;
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : undefined;
}

function cleanToken(s?: string | null): string | undefined {
  if (!s) return undefined;
  let t = String(s).trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) t = t.slice(1, -1);
  if (!t) return undefined;
  if (t.startsWith('{') && t.endsWith('}')) {
    const obj = safeJsonParse<any>(t);
    if (obj?.token) return String(obj.token);
  }
  return t;
}

export function getClientRole(): string | undefined {
  try {
    // LocalStorage direct role
    const lsRole = typeof window !== 'undefined' ? (localStorage.getItem('role') || localStorage.getItem('userRole')) : null;
    if (lsRole && typeof lsRole === 'string' && lsRole) return lsRole;

    // Cookies: role cookie
    const cRole = getCookie('role') || getCookie('userRole');
    if (cRole) return cRole;

    // Token from cookies
    const candCookies = [getCookie('token'), getCookie('authToken'), getCookie('accessToken')];
    for (const c of candCookies) {
      const raw = cleanToken(c);
      if (!raw) continue;
      // JSON-wrapped role
      if (raw.startsWith('{') && raw.endsWith('}')) {
        const obj = safeJsonParse<any>(raw);
        const r = pickRole(obj);
        if (r) return r;
        if (obj?.token && typeof obj.token === 'string') {
          const payload = decodeJwtPayload(obj.token);
          const r2 = pickRole(payload);
          if (r2) return r2;
        }
      }
      // Try decode as JWT
      const payload = decodeJwtPayload(raw);
      const r = pickRole(payload);
      if (r) return r;
    }

    // LocalStorage token
    const lsToken = typeof window !== 'undefined' ? cleanToken(localStorage.getItem('authToken')) : undefined;
    if (lsToken) {
      if (lsToken.startsWith('{') && lsToken.endsWith('}')) {
        const obj = safeJsonParse<any>(lsToken);
        const r = pickRole(obj);
        if (r) return r;
        if (obj?.token && typeof obj.token === 'string') {
          const payload = decodeJwtPayload(obj.token);
          const r2 = pickRole(payload);
          if (r2) return r2;
        }
      }
      const payload = decodeJwtPayload(lsToken);
      const r = pickRole(payload);
      if (r) return r;
    }
  } catch {}
  return undefined;
}

export function isAdminRole(role?: string): boolean {
  if (!role) return false;
  const r = String(role);
  return /admin/i.test(r) || r === 'ROLE_ADMIN';
}
