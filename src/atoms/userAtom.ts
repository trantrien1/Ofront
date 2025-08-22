import { atom, type RecoilState } from "recoil";

export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const defaultUserState: UserData | null = null;

// Important: Recoil atom keys must be stable. Using dynamic keys (Date.now/Math.random)
// will cause state to reset on Hot Reload/Fast Refresh. Keep this key constant.
// Also persist to localStorage so HMR/page reloads immediately rehydrate the user
// before any async restore hook runs.
declare global {
  // eslint-disable-next-line no-var
  var __recoil_userState: RecoilState<UserData | null> | undefined;
}

export const userState: RecoilState<UserData | null> = (globalThis as any)
  .__recoil_userState ??=
  atom<UserData | null>({
    key: "atoms/user/userState",
    default: defaultUserState,
    effects: [
      ({ setSelf, onSet }) => {
        // Hydrate from localStorage on client only
        if (typeof window !== "undefined") {
          try {
            const raw = window.localStorage.getItem("userState");
            if (raw) {
              const parsed = JSON.parse(raw);
              // Best-effort: revive Date fields if present
              if (parsed && parsed.createdAt) parsed.createdAt = new Date(parsed.createdAt);
              if (parsed && parsed.updatedAt) parsed.updatedAt = new Date(parsed.updatedAt);
              setSelf(parsed);
            }
          } catch {
            // ignore
          }

          // Persist any changes
          onSet((newVal, _oldVal, isReset) => {
            try {
              if (isReset || newVal === null) {
                window.localStorage.removeItem("userState");
              } else {
                window.localStorage.setItem("userState", JSON.stringify(newVal));
              }
            } catch {
              // ignore
            }
          });
        }
      },
    ],
  });
