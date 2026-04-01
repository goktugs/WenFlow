import { apiRequest } from "@/lib/api";
import type { AuthResponse, AuthUser } from "./auth.types";

export function register(input: {
  email: string;
  password: string;
  name: string;
}) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: input
  });
}

export function login(input: { email: string; password: string }) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: input
  });
}

export async function getMe(token: string) {
  const result = await apiRequest<{ user: AuthUser }>("/auth/me", {
    token
  });

  return result.user;
}

