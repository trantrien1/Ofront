import { useEffect } from "react";
import { useRecoilState } from "recoil";
import { userState, UserData } from "../atoms/userAtom";
import nookies from "nookies";
import request from "../services/request";
import { updateRequestToken } from "../services/request";

// lightweight JWT payload decode (no verification)
const decodeJwt = (token: string) => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};

const useAuth = () => {
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
      return;
    }

    const payload = decodeJwt(token);
    if (!payload) {
      setCurrentUser(null);
      // Clear invalid token
      try { nookies.destroy(undefined, "token"); } catch {}
      updateRequestToken("");
      return;
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      setCurrentUser(null);
      // Clear expired token
      try { nookies.destroy(undefined, "token"); } catch {}
      updateRequestToken("");
      return;
    }

    // Set auth header for future requests
    updateRequestToken(token);

    // Map payload to UserData shape where possible
    const user = {
      uid: payload.sub || payload.uid || payload.username || "",
      email: payload.email || null,
      displayName: payload.name || payload.username || null,
      photoURL: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    setCurrentUser(user);
  };

  useEffect(() => {
    // Check auth on mount only
    checkAuth();

    // Listen for storage changes (e.g., login/logout in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      // React when our auth token changes
      if (e.key === 'authToken' || e.key === 'token' || e.key === null) {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); // Empty dependency array to run only once

  return { currentUser, user: currentUser, checkAuth };
};

export default useAuth;
