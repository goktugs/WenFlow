import type { Request, Response } from "express";
import {
  listDocumentVersions,
  saveCurrentDocumentVersion,
  restoreDocumentVersion
} from "./version.service.js";

export async function listDocumentVersionsHandler(
  request: Request,
  response: Response
) {
  const ownerId = request.authUser!.id;
  const documentId = getParam(request.params.id);
  const versions = await listDocumentVersions(documentId, ownerId);

  if (!versions) {
    response.status(404).json({ message: "Document not found" });
    return;
  }

  response.json({ versions });
}

export async function restoreDocumentVersionHandler(
  request: Request,
  response: Response
) {
  const ownerId = request.authUser!.id;
  const documentId = getParam(request.params.id);
  const versionId = getParam(request.params.versionId);

  const result = await restoreDocumentVersion({
    documentId,
    ownerId,
    versionId,
    restoredByUserId: ownerId
  });

  if (result.status === "document-not-found") {
    response.status(404).json({ message: "Document not found" });
    return;
  }

  if (result.status === "version-not-found") {
    response.status(404).json({ message: "Version not found" });
    return;
  }

  response.json({ document: result.document });
}

export async function saveCurrentDocumentVersionHandler(
  request: Request,
  response: Response
) {
  const userId = request.authUser!.id;
  const documentId = getParam(request.params.id);
  const result = await saveCurrentDocumentVersion({
    documentId,
    userId
  });

  if (result.status === "document-not-found") {
    response.status(404).json({ message: "Document not found" });
    return;
  }

  if (result.status === "no-changes") {
    response.status(200).json({ status: "no-changes" });
    return;
  }

  response.status(201).json({ status: "saved" });
}

function getParam(value: string | string[] | undefined) {
  if (!value) {
    return "";
  }

  return Array.isArray(value) ? value[0] : value;
}
