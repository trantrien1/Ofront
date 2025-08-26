import { useEffect } from "react";
import { useRecoilState } from "recoil";
import { userState, UserData } from "../atoms/userAtom";
import nookies from "nookies";
import request from "../services/request";
import { updateRequestToken } from "../services/request";

// lightweight JWT payload decode (no verification) - works on server and client
const decodeJwt = (token: string) => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded =
      typeof window !== "undefined" && typeof window.atob === "function"
        ? window.atob(b64)
        : Buffer.from(b64, "base64").toString("binary");
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
};

const useAuth = () => {
  const isClient = typeof window !== 'undefined';
  // Always call hooks in the same order; guard side-effects internally
  const [currentUser, setCurrentUser] = useRecoilState(userState);

  const checkAuth = () => {
    const cookies = nookies.get(undefined);
    let token = cookies?.token as string | undefined;

    // Fallback to localStorage token for environments where cookies are unreliable (e.g., VS Code Simple Browser)
    if (!token && typeof window !== "undefined") {
      try {
        const lsToken = window.localStorage.getItem("authToken") || undefined;
        if (lsToken) token = lsToken;
      } catch {}
    }

    if (!token) {
      // No token anywhere -> clear user and auth header
      setCurrentUser(null);
      updateRequestToken("");
      // Clear any persisted role on logout/missing token
      try { if (typeof window !== "undefined") window.localStorage.removeItem("role"); } catch {}
      return;
    }

    const payload = decodeJwt(token);
    if (!payload) {
      setCurrentUser(null);
      // Clear invalid token
      try { nookies.destroy(undefined, "token"); } catch {}
      updateRequestToken("");
      try { if (typeof window !== "undefined") window.localStorage.removeItem("role"); } catch {}
      return;
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      setCurrentUser(null);
      // Clear expired token
      try { nookies.destroy(undefined, "token"); } catch {}
      updateRequestToken("");
      try { if (typeof window !== "undefined") window.localStorage.removeItem("role"); } catch {}
      return;
    }

    // Set auth header for future requests
    updateRequestToken(token);

    // Map payload to UserData shape where possible
    // Extract a role-like field from JWT if available
    const rawRole = (payload as any)?.role
      || (Array.isArray((payload as any)?.roles) ? (payload as any).roles[0] : undefined)
      || ((payload as any)?.isAdmin ? 'admin' : undefined);
    // Normalize to lowercase for consistency across app
    const role = rawRole ? String(rawRole).toLowerCase() : undefined;

    const user = {
      uid: payload.sub || payload.uid || payload.username || "",
      email: payload.email || null,
      displayName: payload.name || payload.username || null,
      photoURL: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Include role on the user object for convenience (avoid rendering it by default)
      role,
    } as any;

    setCurrentUser(user);

    // Persist role for client-side guards (e.g., admin dashboard)
    try {
      if (typeof window !== 'undefined') {
  if (role) window.localStorage.setItem('role', role);
        else window.localStorage.removeItem('role');
      }
    } catch {}
  };

  useEffect(() => {
    // Check auth on mount only
    if (!isClient) return;
    checkAuth();

    // Listen for storage changes (e.g., login/logout in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      // React when our auth token changes
      if (e.key === 'authToken' || e.key === 'token' || e.key === null) {
        checkAuth();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [isClient]); // Run effect only on client

  return { currentUser, user: currentUser, checkAuth };
};

export default useAuth;
