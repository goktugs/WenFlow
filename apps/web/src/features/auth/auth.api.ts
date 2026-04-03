import { apiRequest } from "@/lib/api";
import { env } from "@/lib/env";
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

export async function refreshToken(token: string): Promise<AuthResponse> {
  const response = await fetch(`${env.apiUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: token })
  });

  if (!response.ok) {
    throw new Error("Refresh failed");
  }

  return response.json();
}

export function logout(token: string) {
  return apiRequest<{ message: string }>("/auth/logout", {
    method: "POST",
    body: { refreshToken: token }
  });
}
