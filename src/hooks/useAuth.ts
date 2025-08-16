import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRecoilState } from "recoil";
import { userState, UserData } from "../atoms/userAtom";
import { auth, firestore } from "../firebase/clientApp";
import nookies from "nookies";
import { User } from "firebase/auth";
import { createUserData } from "../helpers/userHelpers";

const useAuth = () => {
  const [user] = useAuthState(auth);
  const [currentUser, setCurrentUser] = useRecoilState(userState);

  useEffect(() => {
    console.log("HERE IS USER", user);

    user ? setUserCookie(user) : nookies.set(undefined, "token", "");
  }, [user]);

  const setUserCookie = async (user: User) => {
    const token = await user.getIdToken();
    console.log("HERE IS TOKEN", token);
    nookies.set(undefined, "token", token);
  };

  // Create or update user document in Firestore
  const createUserDocument = async (user: User) => {
    if (!user.uid) return;

    const userData: UserData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || null,
      photoURL: user.photoURL || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      await createUserData(userData);
      console.log("User document created/updated:", userData);
    } catch (error) {
      console.error("Error creating user document:", error);
    }
  };

  useEffect(() => {
    // User has logged out; firebase auth state has been cleared
    if (!user?.uid) {
      setCurrentUser(null);
      return;
    }

    // Create user document if it doesn't exist
    createUserDocument(user);

    const userDoc = doc(firestore, "users", user.uid);
    const unsubscribe = onSnapshot(userDoc, (doc) => {
      console.log("CURRENT USER DATA", doc.data());
      if (!doc.data()) return;
      if (currentUser) return;
      setCurrentUser(doc.data() as any);
    });

    return () => unsubscribe();
  }, [user, currentUser]);

  return { user, currentUser };
};

export default useAuth;
