import type { NextFunction, Request, Response } from "express";
import { getCurrentUser, verifyAccessToken } from "../modules/auth/auth.service.js";

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const authorizationHeader = request.header("authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();

  try {
    const payload = verifyAccessToken(token);
    const user = await getCurrentUser(payload.sub);

    if (!user) {
      response.status(401).json({ message: "Unauthorized" });
      return;
    }

    request.authUser = {
      id: user.id,
      email: user.email
    };

    next();
  } catch {
    response.status(401).json({ message: "Unauthorized" });
  }
}

