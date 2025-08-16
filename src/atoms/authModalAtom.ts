import { atom } from "recoil";

export interface AuthModalState {
  open: boolean;
  view: ModalView;
}

export type ModalView = "login" | "signup" | "resetPassword";

const defaultModalState: AuthModalState = {
  open: false,
  view: "login",
};

export const authModalState = atom<AuthModalState>({
  key: `atoms/auth/authModalState_${Date.now()}_${Math.random()}`,
  default: defaultModalState,
});
