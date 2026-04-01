import cors from "cors";
import express from "express";
import { authRouter } from "./modules/auth/auth.routes.js";
import { documentRouter } from "./modules/documents/document.routes.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "api" });
  });

  app.use("/auth", authRouter);
  app.use("/documents", documentRouter);

  return app;
}
