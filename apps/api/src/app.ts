import cors from "cors";
import express from "express";
import { authRouter } from "./modules/auth/auth.routes.js";
import { documentRouter } from "./modules/documents/document.routes.js";

export function createApp() {
  const app = express();
  const apiV1 = express.Router();

  app.use(cors());
  app.use(express.json());

  apiV1.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "api" });
  });

  apiV1.use("/auth", authRouter);
  apiV1.use("/documents", documentRouter);
  app.use("/api/v1", apiV1);

  return app;
}
