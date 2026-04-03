import { env } from "./env";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};
let refreshTokenHandler: (() => Promise<string | null>) | null = null;

export function setRefreshTokenHandler(handler: () => Promise<string | null>) {
  refreshTokenHandler = handler;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const response = await fetchWithOptions(path, options);

  if (response.status === 401 && options.token && refreshTokenHandler) {
    const newToken = await refreshTokenHandler();

    if (newToken) {
      const retryResponse = await fetchWithOptions(path, {
        ...options,
        token: newToken
      });
      return parseResponse<T>(retryResponse);
    }
  }

  return parseResponse<T>(response);
}

function fetchWithOptions(path: string, options: RequestOptions) {
  return fetch(`${env.apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | T
    | { message?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      (data && typeof data === "object" && "message" in data && data.message) ||
      "Request failed"
    );
  }

  return data as T;
}
