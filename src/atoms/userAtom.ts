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
  key: "userState_" + Math.random().toString(36).substr(2, 9),
  default: defaultUserState,
});
