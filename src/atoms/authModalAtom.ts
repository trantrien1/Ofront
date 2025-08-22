import { atom, type RecoilState } from "recoil";

export interface AuthModalState {
  open: boolean;
  view: ModalView;
}

export type ModalView = "login" | "signup" | "resetPassword";

const defaultModalState: AuthModalState = {
  open: false,
  view: "login",
};

declare global {
  // eslint-disable-next-line no-var
  var __recoil_authModalState: RecoilState<AuthModalState> | undefined;
}

export const authModalState: RecoilState<AuthModalState> = (globalThis as any)
  .__recoil_authModalState ??=
  atom<AuthModalState>({
    // Stable key to avoid HMR resets
    key: "atoms/auth/authModalState",
    default: defaultModalState,
  });
