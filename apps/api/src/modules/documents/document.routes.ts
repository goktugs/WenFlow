import { Router } from "express";
import { requireAuth } from "../../middlewares/require-auth.js";
import {
  createDocumentHandler,
  deleteDocumentHandler,
  getDocumentHandler,
  listDocumentsHandler,
  restoreDocumentHandler,
  updateDocumentHandler
} from "./document.controller.js";

export const documentRouter = Router();

documentRouter.use(requireAuth);

documentRouter.get("/", listDocumentsHandler);
documentRouter.post("/", createDocumentHandler);
documentRouter.get("/:id", getDocumentHandler);
documentRouter.patch("/:id", updateDocumentHandler);
documentRouter.delete("/:id", deleteDocumentHandler);
documentRouter.post("/:id/restore", restoreDocumentHandler);

