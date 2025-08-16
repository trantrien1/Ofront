import { atom } from "recoil";

export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const defaultUserState: UserData | null = null;

export const userState = atom({
  key: `atoms/user/userState_${Date.now()}_${Math.random()}`,
  default: defaultUserState,
});
