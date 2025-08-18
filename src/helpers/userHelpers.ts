import { UserData } from "../atoms/userAtom";

// Get user data from Firestore
export const getUserData = async (uid: string): Promise<UserData | null> => {
  return null;
};

// Update user data
export const updateUserData = async (uid: string, data: Partial<UserData>): Promise<boolean> => {
  return false;
};

// Create user data
export const createUserData = async (userData: UserData): Promise<boolean> => {
  return false;
};

// Check if user exists
export const userExists = async (uid: string): Promise<boolean> => {
  return false;
};
