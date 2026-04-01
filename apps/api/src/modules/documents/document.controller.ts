import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  createDocument,
  getDocumentById,
  joinSharedDocument,
  listDocuments,
  restoreDocument,
  softDeleteDocument,
  updateDocument,
  updateDocumentCollaborationSettings
} from "./document.service.js";
import {
  createDocumentSchema,
  joinSharedDocumentSchema,
  updateDocumentCollaborationSchema,
  updateDocumentSchema
} from "./document.schemas.js";

export async function listDocumentsHandler(request: Request, response: Response) {
  const userId = request.authUser!.id;
  const includeDeleted = request.query.deleted === "true";

  const documents = await listDocuments({ userId, includeDeleted });
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
  const userId = request.authUser!.id;
  const documentId = getDocumentId(request);
  const document = await getDocumentById(documentId, userId);

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
    const userId = request.authUser!.id;
    const documentId = getDocumentId(request);
    const input = updateDocumentSchema.parse(request.body);
    const result = await updateDocument(documentId, userId, {
      ...input,
      createdByUserId: userId
    });

    if (result.status === "not-found") {
      response.status(404).json({ message: "Document not found" });
      return;
    }

    if (result.status === "forbidden") {
      response.status(403).json({ message: "Only the owner can rename this document" });
      return;
    }

    const document = await getDocumentById(documentId, userId);
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

export async function updateDocumentCollaborationHandler(
  request: Request,
  response: Response
) {
  try {
    const ownerId = request.authUser!.id;
    const documentId = getDocumentId(request);
    const input = updateDocumentCollaborationSchema.parse(request.body);
    const result = await updateDocumentCollaborationSettings({
      documentId,
      ownerId,
      enabled: input.enabled,
      password: input.password,
      readOnly: input.readOnly
    });

    if (result.status === "not-found") {
      response.status(404).json({ message: "Document not found" });
      return;
    }

    if (!input.enabled) {
      await disconnectCollaborators(documentId, ownerId);
    }

    response.json({ document: result.document });
  } catch (error) {
    handleDocumentError(error, response);
  }
}

async function disconnectCollaborators(documentId: string, ownerId: string) {
  const collabPort = Number(process.env.COLLAB_PORT ?? 4001);
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return;
  }

  try {
    await fetch(
      `http://localhost:${collabPort}/internal/documents/${documentId}/disconnect-collaborators`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwtSecret}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ownerId })
      }
    );
  } catch (error) {
    console.error("Unable to disconnect collaborators", error);
  }
}

export async function joinSharedDocumentHandler(
  request: Request,
  response: Response
) {
  try {
    const userId = request.authUser!.id;
    const documentId = getDocumentId(request);
    const input = joinSharedDocumentSchema.parse(request.body);
    const result = await joinSharedDocument({
      documentId,
      userId,
      password: input.password
    });

    if (result.status === "not-found") {
      response.status(404).json({ message: "Shared document not found" });
      return;
    }

    if (result.status === "invalid-password") {
      response.status(401).json({ message: "Invalid collaboration password" });
      return;
    }

    response.json({ document: result.document });
  } catch (error) {
    handleDocumentError(error, response);
  }
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

  if (
    error instanceof Error &&
    error.message === "COLLABORATION_PASSWORD_REQUIRED"
  ) {
    response
      .status(400)
      .json({ message: "Password is required when collaboration is enabled" });
    return;
  }

  response.status(500).json({ message: "Internal server error" });
}
