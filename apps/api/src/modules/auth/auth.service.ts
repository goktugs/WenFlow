import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_DAYS = 30;
const PASSWORD_SALT_ROUNDS = 12;

type AuthUser = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthResult = {
  token: string;
  refreshToken: string;
  user: AuthUser;
};

type JwtPayload = {
  sub: string;
  email: string;
};

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (existingUser) {
    throw new Error("EMAIL_IN_USE");
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true
    }
  });

  const refreshToken = await createRefreshToken(user.id);

  return {
    token: signToken(user.id, user.email),
    refreshToken,
    user
  };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const refreshToken = await createRefreshToken(user.id);

  return {
    token: signToken(user.id, user.email),
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  };
}

export async function getCurrentUser(userId: string): Promise<AuthUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function refreshAccessToken(rawToken: string): Promise<AuthResult> {
  const tokenHash = hashToken(rawToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  if (!stored) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  if (stored.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { tokenHash } });
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  // Token rotation: delete old, issue new
  await prisma.refreshToken.delete({ where: { tokenHash } });
  const newRefreshToken = await createRefreshToken(stored.userId);

  return {
    token: signToken(stored.userId, stored.user.email),
    refreshToken: newRefreshToken,
    user: stored.user
  };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}

async function createRefreshToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(40).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt }
  });

  return rawToken;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function signToken(userId: string, email: string) {
  return jwt.sign({ email }, env.jwtSecret, {
    subject: userId,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN
  });
}
