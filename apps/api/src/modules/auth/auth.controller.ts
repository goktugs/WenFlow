import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  getCurrentUser,
  loginUser,
  refreshAccessToken,
  registerUser,
  revokeRefreshToken
} from "./auth.service.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";

export async function registerHandler(request: Request, response: Response) {
  try {
    const input = registerSchema.parse(request.body);
    const result = await registerUser(input);

    response.status(201).json(result);
  } catch (error) {
    handleAuthError(error, response);
  }
}

export async function loginHandler(request: Request, response: Response) {
  try {
    const input = loginSchema.parse(request.body);
    const result = await loginUser(input);

    response.json(result);
  } catch (error) {
    handleAuthError(error, response);
  }
}

export async function meHandler(request: Request, response: Response) {
  const authUser = request.authUser;

  if (!authUser) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  const user = await getCurrentUser(authUser.id);

  if (!user) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  response.json({ user });
}

export async function refreshHandler(request: Request, response: Response) {
  const { refreshToken } = request.body;

  if (!refreshToken || typeof refreshToken !== "string") {
    response.status(400).json({ message: "refreshToken is required" });
    return;
  }

  try {
    const result = await refreshAccessToken(refreshToken);
    response.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_REFRESH_TOKEN") {
      response.status(401).json({ message: "Invalid or expired refresh token" });
      return;
    }
    response.status(500).json({ message: "Internal server error" });
  }
}

export async function logoutHandler(request: Request, response: Response) {
  const { refreshToken } = request.body;

  if (refreshToken && typeof refreshToken === "string") {
    await revokeRefreshToken(refreshToken).catch(() => {});
  }

  response.json({ message: "Logged out" });
}

function handleAuthError(error: unknown, response: Response) {
  if (error instanceof ZodError) {
    response.status(400).json({
      message: "Invalid request",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  if (error instanceof Error && error.message === "EMAIL_IN_USE") {
    response.status(409).json({ message: "Email is already in use" });
    return;
  }

  if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
    response.status(401).json({ message: "Invalid email or password" });
    return;
  }

  response.status(500).json({ message: "Internal server error" });
}
