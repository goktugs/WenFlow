import { Router } from "express";
import {
  loginHandler,
  meHandler,
  registerHandler
} from "./auth.controller.js";
import { requireAuth } from "../../middlewares/require-auth.js";

export const authRouter = Router();

authRouter.post("/register", registerHandler);
authRouter.post("/login", loginHandler);
authRouter.get("/me", requireAuth, meHandler);

