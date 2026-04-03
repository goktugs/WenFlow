import { create } from "zustand";
import { toast } from "sonner";
import { getMe, login, logout as logoutApi, refreshToken as refreshTokenApi, register } from "./auth.api";
import {
  clearAllStoredTokens,
  getStoredRefreshToken,
  getStoredToken,
  setStoredRefreshToken,
  setStoredToken
} from "./auth.storage";
import { setRefreshTokenHandler } from "@/lib/api";
import type { AuthUser } from "./auth.types";

type AuthStoreState = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  hydrateSession: () => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    name: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthStoreState>((set) => {
  setRefreshTokenHandler(async () => {
    const storedRefreshToken = getStoredRefreshToken();
    if (!storedRefreshToken) return null;

    try {
      const result = await refreshTokenApi(storedRefreshToken);
      setStoredToken(result.token);
      setStoredRefreshToken(result.refreshToken);
      set({ token: result.token });
      return result.token;
    } catch {
      clearAllStoredTokens();
      set({ token: null, user: null });
      return null;
    }
  });

  return {
    user: null,
    token: getStoredToken(),
    isLoading: true,

    async hydrateSession() {
      const storedToken = getStoredToken();

      if (!storedToken) {
        set({ isLoading: false, token: null, user: null });
        return;
      }

      try {
        const user = await getMe(storedToken);
        set({ user, token: getStoredToken(), isLoading: false });
      } catch {
        clearAllStoredTokens();
        set({ token: null, user: null, isLoading: false });
      }
    },

    async login(input) {
      const result = await login(input);
      setStoredToken(result.token);
      setStoredRefreshToken(result.refreshToken);
      set({ token: result.token, user: result.user });
    },

    async register(input) {
      const result = await register(input);
      setStoredToken(result.token);
      setStoredRefreshToken(result.refreshToken);
      set({ token: result.token, user: result.user });
    },

    async logout() {
      const storedRefreshToken = getStoredRefreshToken();
      if (storedRefreshToken) {
        await logoutApi(storedRefreshToken).catch(() => { });
      }
      clearAllStoredTokens();
      set({ token: null, user: null });
      toast.success("Signed out");
    }
  };
});
