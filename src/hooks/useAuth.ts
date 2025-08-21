import { useEffect } from "react";
import { useRecoilState } from "recoil";
import { userState } from "../atoms/userAtom";
import nookies from "nookies";

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

  useEffect(() => {
    const cookies = nookies.get(undefined);
    const token = cookies?.token;
    if (!token) {
      setCurrentUser(null);
      return;
    }

    const payload = decodeJwt(token);
    if (!payload) {
      setCurrentUser(null);
      return;
    }

    // Map payload to UserData shape where possible
    const user = {
      uid: payload.sub || payload.uid || payload.username || "",
      email: payload.email || null,
      displayName: payload.name || null,
      photoURL: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    setCurrentUser(user);
  }, []);

  return { currentUser, user: currentUser };
};

export default useAuth;
