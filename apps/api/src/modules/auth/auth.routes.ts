import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  registerHandler
} from "./auth.controller.js";
import { requireAuth } from "../../middlewares/require-auth.js";

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later." }
});

authRouter.post("/register", authLimiter, registerHandler);
authRouter.post("/login", authLimiter, loginHandler);
authRouter.post("/refresh", refreshHandler);
authRouter.post("/logout", logoutHandler);
authRouter.get("/me", requireAuth, meHandler);

