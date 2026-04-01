import { env } from "./env";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${env.apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = (await response.json().catch(() => null)) as T | {
    message?: string;
    issues?: Array<{ path: string; message: string }>;
  } | null;

  if (!response.ok) {
    throw new Error(
      (data && typeof data === "object" && "message" in data && data.message) ||
        "Request failed"
    );
  }

  return data as T;
}
