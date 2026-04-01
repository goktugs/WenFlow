import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { getMe, login, register } from "./auth.api";
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken
} from "./auth.storage";
import { toast } from "sonner";
import type { AuthUser } from "./auth.types";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    name: string;
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = getStoredToken();

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    getMe(storedToken)
      .then((nextUser) => {
        setUser(nextUser);
        setToken(storedToken);
      })
      .catch(() => {
        clearStoredToken();
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      async login(input) {
        const result = await login(input);
        setStoredToken(result.token);
        setToken(result.token);
        setUser(result.user);
      },
      async register(input) {
        const result = await register(input);
        setStoredToken(result.token);
        setToken(result.token);
        setUser(result.user);
      },
      logout() {
        clearStoredToken();
        setToken(null);
        setUser(null);
        toast.success("Signed out");
      }
    }),
    [isLoading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
