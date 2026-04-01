import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  createDocument,
  getDocumentById,
  listDocuments,
  renameDocument,
  restoreDocument,
  softDeleteDocument
} from "./document.service.js";
import {
  createDocumentSchema,
  updateDocumentSchema
} from "./document.schemas.js";

export async function listDocumentsHandler(request: Request, response: Response) {
  const ownerId = request.authUser!.id;
  const includeDeleted = request.query.deleted === "true";

  const documents = await listDocuments({ ownerId, includeDeleted });
  response.json({ documents });
}

export async function createDocumentHandler(
  request: Request,
  response: Response
) {
  try {
    const ownerId = request.authUser!.id;
    const input = createDocumentSchema.parse(request.body);
    const document = await createDocument(ownerId, input.title);

    response.status(201).json({ document });
  } catch (error) {
    handleDocumentError(error, response);
  }
}

export async function getDocumentHandler(request: Request, response: Response) {
  const ownerId = request.authUser!.id;
  const documentId = getDocumentId(request);
  const document = await getDocumentById(documentId, ownerId);

  if (!document) {
    response.status(404).json({ message: "Document not found" });
    return;
  }

  response.json({ document });
}

export async function updateDocumentHandler(
  request: Request,
  response: Response
) {
  try {
    const ownerId = request.authUser!.id;
    const documentId = getDocumentId(request);
    const input = updateDocumentSchema.parse(request.body);
    const result = await renameDocument(documentId, ownerId, input.title);

    if (result.count === 0) {
      response.status(404).json({ message: "Document not found" });
      return;
    }

    const document = await getDocumentById(documentId, ownerId);
    response.json({ document });
  } catch (error) {
    handleDocumentError(error, response);
  }
}

export async function deleteDocumentHandler(
  request: Request,
  response: Response
) {
  const ownerId = request.authUser!.id;
  const documentId = getDocumentId(request);
  const result = await softDeleteDocument(documentId, ownerId);

  if (result.count === 0) {
    response.status(404).json({ message: "Document not found" });
    return;
  }

  response.status(204).send();
}

export async function restoreDocumentHandler(
  request: Request,
  response: Response
) {
  const ownerId = request.authUser!.id;
  const documentId = getDocumentId(request);
  const result = await restoreDocument(documentId, ownerId);

  if (result.count === 0) {
    response.status(404).json({ message: "Document not found" });
    return;
  }

  const document = await getDocumentById(documentId, ownerId);
  response.json({ document });
}

function getDocumentId(request: Request) {
  const id = request.params.id;

  return Array.isArray(id) ? id[0] : id;
}

function handleDocumentError(error: unknown, response: Response) {
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

  response.status(500).json({ message: "Internal server error" });
}
