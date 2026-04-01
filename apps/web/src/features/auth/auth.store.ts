import { create } from "zustand";
import { toast } from "sonner";
import { getMe, login, register } from "./auth.api";
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken
} from "./auth.storage";
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
  logout: () => void;
};

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  token: getStoredToken(),
  isLoading: true,
  async hydrateSession() {
    const storedToken = getStoredToken();

    if (!storedToken) {
      set({
        isLoading: false,
        token: null,
        user: null
      });
      return;
    }

    try {
      const user = await getMe(storedToken);
      set({
        user,
        token: storedToken,
        isLoading: false
      });
    } catch {
      clearStoredToken();
      set({
        token: null,
        user: null,
        isLoading: false
      });
    }
  },
  async login(input) {
    const result = await login(input);
    setStoredToken(result.token);
    set({
      token: result.token,
      user: result.user
    });
  },
  async register(input) {
    const result = await register(input);
    setStoredToken(result.token);
    set({
      token: result.token,
      user: result.user
    });
  },
  logout() {
    clearStoredToken();
    set({
      token: null,
      user: null
    });
    toast.success("Signed out");
  }
}));
