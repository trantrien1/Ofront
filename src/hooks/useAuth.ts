import { useEffect } from "react";
import { useRecoilState } from "recoil";
import { userState, UserData } from "../atoms/userAtom";
import nookies from "nookies";
import request from "../services/request";

// With HttpOnly cookies, we cannot read the token on the client.
// We infer minimal auth state from non-sensitive values (role/username) stored client-side at login.

const useAuth = () => {
  const isClient = typeof window !== 'undefined';
  // Always call hooks in the same order; guard side-effects internally
  const [currentUser, setCurrentUser] = useRecoilState(userState);

  const checkAuth = () => {
    // If server session exists (HttpOnly cookie), our API calls will work.
    // For UI state, use role and username stored locally at login.
    let role: string | null = null;
    let username: string | null = null;
    try {
      if (typeof window !== 'undefined') {
        role = window.localStorage.getItem('role');
        username = window.localStorage.getItem('username');
      }
    } catch {}

    if (role) {
      const user = {
        uid: username || '',
        email: null,
        displayName: username || null,
        photoURL: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        role,
      } as any;
      setCurrentUser(user);
    } else {
      setCurrentUser(null);
    }
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
