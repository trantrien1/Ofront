import { useEffect } from "react";
import { useRecoilState } from "recoil";
import { userState } from "../atoms/userAtom";
import nookies from "nookies";

const useAuth = () => {
  const user = null as any; // Firebase removed
  const [currentUser, setCurrentUser] = useRecoilState(userState);

  useEffect(() => {
    console.log("HERE IS USER", user);

    user ? setUserCookie(user) : nookies.set(undefined, "token", "");
  }, [user]);

  const setUserCookie = async (_user: any) => {
    nookies.set(undefined, "token", "");
  };

  // Firebase removed; no user document creation

  useEffect(() => {
    // User has logged out; firebase auth state has been cleared
    if (!user?.uid) {
      setCurrentUser(null);
      return;
    }

    // No Firebase listener; set current user to null
    setCurrentUser(null);
    return () => {};
  }, [user, currentUser]);

  return { user, currentUser };
};

export default useAuth;
