const AUTH_TOKEN_KEY = "wenflow.auth.token";
const REFRESH_TOKEN_KEY = "wenflow.auth.refreshToken";

export function getStoredToken() {
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearStoredToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getStoredRefreshToken() {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(token: string) {
  window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearStoredRefreshToken() {
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearAllStoredTokens() {
  clearStoredToken();
  clearStoredRefreshToken();
}
