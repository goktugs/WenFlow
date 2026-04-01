import { apiRequest } from "@/lib/api";
import type {
  DocumentDetail,
  DocumentListItem,
  DocumentVersion
} from "./document.types";

export async function listDocuments(token: string, includeDeleted = false) {
  const suffix = includeDeleted ? "?deleted=true" : "";
  const result = await apiRequest<{ documents: DocumentListItem[] }>(
    `/documents${suffix}`,
    { token }
  );

  return result.documents;
}

export async function createDocument(token: string, title?: string) {
  const result = await apiRequest<{ document: DocumentListItem }>("/documents", {
    method: "POST",
    token,
    body: title ? { title } : {}
  });

  return result.document;
}

export async function getDocument(token: string, id: string) {
  const result = await apiRequest<{ document: DocumentDetail }>(`/documents/${id}`, {
    token
  });

  return result.document;
}

export async function renameDocument(token: string, id: string, title: string) {
  const result = await apiRequest<{ document: DocumentDetail }>(`/documents/${id}`, {
    method: "PATCH",
    token,
    body: { title }
  });

  return result.document;
}

export async function saveDocumentContent(
  token: string,
  id: string,
  contentJson: unknown
) {
  const result = await apiRequest<{ document: DocumentDetail }>(`/documents/${id}`, {
    method: "PATCH",
    token,
    body: { contentJson }
  });

  return result.document;
}

export async function deleteDocument(token: string, id: string) {
  await apiRequest(`/documents/${id}`, {
    method: "DELETE",
    token
  });
}

export async function restoreDocument(token: string, id: string) {
  const result = await apiRequest<{ document: DocumentDetail }>(
    `/documents/${id}/restore`,
    {
      method: "POST",
      token
    }
  );

  return result.document;
}

export async function updateDocumentCollaboration(
  token: string,
  id: string,
  input: {
    enabled: boolean;
    password?: string;
  }
) {
  const result = await apiRequest<{ document: DocumentDetail }>(
    `/documents/${id}/collaboration`,
    {
      method: "PATCH",
      token,
      body: input
    }
  );

  return result.document;
}

export async function joinSharedDocument(
  token: string,
  id: string,
  password: string
) {
  const result = await apiRequest<{ document: DocumentDetail }>(
    `/documents/${id}/join`,
    {
      method: "POST",
      token,
      body: { password }
    }
  );

  return result.document;
}

export async function listDocumentVersions(token: string, id: string) {
  const result = await apiRequest<{ versions: DocumentVersion[] }>(
    `/documents/${id}/versions`,
    {
      token
    }
  );

  return result.versions;
}

export async function restoreDocumentVersion(
  token: string,
  documentId: string,
  versionId: string
) {
  const result = await apiRequest<{ document: DocumentDetail }>(
    `/documents/${documentId}/versions/${versionId}/restore`,
    {
      method: "POST",
      token
    }
  );

  return result.document;
}
