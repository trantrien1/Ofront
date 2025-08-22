import { useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { userState } from '../atoms/userAtom';
import nookies from 'nookies';
import { updateRequestToken } from '../services/request';

export const useAuthRestore = () => {
  const setUser = useSetRecoilState(userState);

  useEffect(() => {
    // Add a small delay to avoid race conditions with login setting tokens
    const timeoutId = setTimeout(() => {
      
      try {
        // Try to get token from cookies first
        const cookies = nookies.get();
        let token = cookies.token;
        
        // Fallback: try localStorage if cookies don't work (VS Code Simple Browser)
        if (!token && typeof window !== "undefined") {
          try {
            const localToken = localStorage.getItem("authToken");
            if (localToken) token = localToken;
          } catch (e) {
            // ignore
          }
        }
        
        if (token) {
          // Set default header for axios instance
          updateRequestToken(token);
          
          // Decode token payload and set current user in Recoil
          try {
            const part = token.split(".")[1];
            const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
            const jwtPayload = JSON.parse(json);
            
            const user = {
              uid: jwtPayload?.sub || jwtPayload?.uid || jwtPayload?.username || "",
              email: jwtPayload?.email || null,
              displayName: jwtPayload?.name || jwtPayload?.username || null,
              photoURL: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as any;
            setUser(user);
          } catch (e) {
            console.error("AUTH RESTORE: Error decoding token:", e);
          }
        } else {
          // no token; keep initial state
        }
      } catch (e) {
        console.error("AUTH RESTORE: Error restoring auth:", e);
      }
    }, 100); // 100ms delay to avoid race conditions

    return () => {
      clearTimeout(timeoutId);
    };
  }, [setUser]);
};
