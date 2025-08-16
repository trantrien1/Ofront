import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { firestore } from "../firebase/clientApp";
import { UserData } from "../atoms/userAtom";

// Get user data from Firestore
export const getUserData = async (uid: string): Promise<UserData | null> => {
  try {
    const userDoc = await getDoc(doc(firestore, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    }
    return null;
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
};

// Update user data
export const updateUserData = async (uid: string, data: Partial<UserData>): Promise<boolean> => {
  try {
    const userDocRef = doc(firestore, "users", uid);
    await updateDoc(userDocRef, {
      ...data,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error("Error updating user data:", error);
    return false;
  }
};

// Create user data
export const createUserData = async (userData: UserData): Promise<boolean> => {
  try {
    const userDocRef = doc(firestore, "users", userData.uid);
    await setDoc(userDocRef, userData);
    return true;
  } catch (error) {
    console.error("Error creating user data:", error);
    return false;
  }
};

// Check if user exists
export const userExists = async (uid: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(firestore, "users", uid));
    return userDoc.exists();
  } catch (error) {
    console.error("Error checking if user exists:", error);
    return false;
  }
};
