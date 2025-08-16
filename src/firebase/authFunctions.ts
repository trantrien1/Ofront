import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, firestore } from "./clientApp";

export const signInWithGoogle: any = async () =>
  signInWithPopup(auth, new GoogleAuthProvider());

export const signUpWithEmailAndPassword = async (
  email: string,
  password: string,
  displayName: string
) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with display name
    if (result.user) {
      await updateProfile(result.user, {
        displayName: displayName
      });
    }

    // Create user document in Firestore
    const userDocRef = doc(firestore, "users", result.user.uid);
    const userData = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: displayName,
      photoURL: result.user.photoURL || "",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(userDocRef, userData);
    
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error("Error signing up:", error);
    return { success: false, error: error.message };
  }
};

export const loginWithEmailAndPassword = async (
  email: string,
  password: string
) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error("Error logging in:", error);
    return { success: false, error: error.message };
  }
};

export const logout = () => signOut(auth);
