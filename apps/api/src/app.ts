import cors from "cors";
import express from "express";
import { authRouter } from "./modules/auth/auth.routes.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "api" });
  });

  app.use("/auth", authRouter);

  return app;
}
