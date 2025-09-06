import nookies from "nookies";
import { updateRequestToken } from "../services/request";

// Centralized logout utility so multiple places (manual logout, 401 interceptor, tab sync) stay consistent
export interface PerformLogoutOptions {
  redirect?: (path: string) => void; // navigation function (e.g., router.push)
  targetPath?: string; // where to navigate after logout (default '/')
  extra?: () => void; // optional extra cleanup
}

// Try to remove a cookie across all likely paths (your login currently sets role with path "/")
function clearCookieAllPaths(name: string) {
  const paths = ["/", "/app", ""];
  for (const p of paths) {
    try { nookies.destroy(undefined, name, { path: p as any }); } catch {}
    try { nookies.set(undefined, name, "", { path: p as any, maxAge: -1, sameSite: "lax" }); } catch {}
  }
}

// Extracted so you can reuse just the localStorage purge elsewhere if needed
export function clearClientAuthStorage() {
  if (typeof window === "undefined") return;
  const keys = ["authToken", "userState", "managedGroups", "role", "username"];
  for (const k of keys) {
    try { window.localStorage.removeItem(k); } catch {}
  }
}

export async function performLogout(opts: PerformLogoutOptions = {}) {
  const { redirect, targetPath = "/", extra } = opts;

  // Destroy auth cookies on all possible paths
  const cookieNames = ["token", "role", "authToken", "accessToken", "userRole", "username"]; // cover possible variants
  for (const name of cookieNames) clearCookieAllPaths(name);

  // Local storage cleanup
  clearClientAuthStorage();

  // Clear axios default Authorization header
  try { updateRequestToken(""); } catch {}

  // Extra custom cleanup (e.g., recoil resets handled by caller)
  try {
    const r = extra && extra();
    if (r && typeof (r as any).then === 'function') {
      await (r as any);
    }
  } catch {}

  // Navigate
  try { redirect && redirect(targetPath); } catch {}
}

// Lightweight helper for places without router; forces hard navigation.
export function hardRedirectAfterLogout(path: string = "/") {
  if (typeof window !== "undefined") {
    try { window.location.href = path; } catch {}
  }
}
