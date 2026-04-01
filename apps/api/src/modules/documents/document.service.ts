import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { maybeCreateDocumentVersion } from "../versions/version.service.js";

type DocumentListParams = {
  ownerId: string;
  includeDeleted: boolean;
};

export async function listDocuments({
  ownerId,
  includeDeleted
}: DocumentListParams) {
  return prisma.document.findMany({
    where: {
      ownerId,
      ...(includeDeleted
        ? { deletedAt: { not: null } }
        : { deletedAt: null })
    },
    orderBy: {
      updatedAt: "desc"
    },
    select: {
      id: true,
      title: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function createDocument(ownerId: string, title?: string) {
  return prisma.document.create({
    data: {
      ownerId,
      title: title?.trim() || "Untitled",
      contentJson: Prisma.JsonNull
    },
    select: {
      id: true,
      title: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function getDocumentById(id: string, ownerId: string) {
  return prisma.document.findFirst({
    where: {
      id,
      ownerId
    },
    select: {
      id: true,
      title: true,
      contentJson: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function renameDocument(id: string, ownerId: string, title: string) {
  return prisma.document.updateMany({
    where: {
      id,
      ownerId
    },
    data: {
      title: title.trim()
    }
  });
}

export async function updateDocument(
  id: string,
  ownerId: string,
  input: {
    title?: string;
    contentJson?: unknown;
    createdByUserId?: string | null;
  }
) {
  const currentDocument = await prisma.document.findFirst({
    where: {
      id,
      ownerId
    },
    select: {
      id: true,
      title: true,
      contentJson: true
    }
  });

  if (!currentDocument) {
    return { count: 0 };
  }

  const nextTitle =
    typeof input.title !== "undefined" ? input.title.trim() : currentDocument.title;
  const nextContent =
    typeof input.contentJson !== "undefined"
      ? input.contentJson
      : currentDocument.contentJson;

  await maybeCreateDocumentVersion({
    documentId: currentDocument.id,
    ownerId,
    createdByUserId: input.createdByUserId,
    previousTitle: currentDocument.title,
    previousContent: currentDocument.contentJson,
    nextTitle,
    nextContent
  });

  return prisma.document.updateMany({
    where: {
      id,
      ownerId
    },
    data: {
      ...(typeof input.title !== "undefined" ? { title: nextTitle } : {}),
      ...(typeof input.contentJson !== "undefined"
        ? { contentJson: input.contentJson as Prisma.InputJsonValue }
        : {})
    }
  });
}

export async function softDeleteDocument(id: string, ownerId: string) {
  return prisma.document.updateMany({
    where: {
      id,
      ownerId,
      deletedAt: null
    },
    data: {
      deletedAt: new Date()
    }
  });
}

export async function restoreDocument(id: string, ownerId: string) {
  return prisma.document.updateMany({
    where: {
      id,
      ownerId,
      deletedAt: { not: null }
    },
    data: {
      deletedAt: null
    }
  });
}
