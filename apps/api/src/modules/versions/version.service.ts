import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

const VERSION_INTERVAL_MS = 5 * 60 * 1000;

function getAccessibleDocumentWhere(documentId: string, userId: string) {
  return {
    id: documentId,
    OR: [
      { ownerId: userId },
      {
        collaborators: {
          some: {
            userId
          }
        }
      }
    ]
  } satisfies Prisma.DocumentWhereInput;
}

export async function listDocumentVersions(documentId: string, ownerId: string) {
  const document = await prisma.document.findFirst({
    where: getAccessibleDocumentWhere(documentId, ownerId),
    select: {
      id: true
    }
  });

  if (!document) {
    return null;
  }

  return prisma.documentVersion.findMany({
    where: {
      documentId
    },
    orderBy: {
      versionNumber: "desc"
    },
    select: {
      id: true,
      titleSnapshot: true,
      versionNumber: true,
      createdAt: true,
      createdByUserId: true
    }
  });
}

export async function saveCurrentDocumentVersion(input: {
  documentId: string;
  userId: string;
}) {
  const document = await prisma.document.findFirst({
    where: getAccessibleDocumentWhere(input.documentId, input.userId),
    select: {
      id: true,
      title: true,
      contentJson: true
    }
  });

  if (!document) {
    return { status: "document-not-found" as const };
  }

  const lastVersion = await prisma.documentVersion.findFirst({
    where: {
      documentId: input.documentId
    },
    orderBy: {
      versionNumber: "desc"
    },
    select: {
      titleSnapshot: true,
      contentSnapshot: true
    }
  });

  const matchesLatestSnapshot =
    lastVersion?.titleSnapshot === document.title &&
    JSON.stringify(lastVersion.contentSnapshot ?? null) ===
      JSON.stringify(document.contentJson ?? null);

  if (matchesLatestSnapshot) {
    return { status: "no-changes" as const };
  }

  await createDocumentVersion({
    documentId: document.id,
    createdByUserId: input.userId,
    titleSnapshot: document.title,
    contentSnapshot: document.contentJson
  });

  return { status: "saved" as const };
}

export async function maybeCreateDocumentVersion(input: {
  documentId: string;
  ownerId: string;
  createdByUserId?: string | null;
  previousTitle: string;
  previousContent: unknown;
  nextTitle: string;
  nextContent: unknown;
}) {
  const titleChanged = input.previousTitle !== input.nextTitle;
  const contentChanged =
    JSON.stringify(input.previousContent ?? null) !==
    JSON.stringify(input.nextContent ?? null);

  if (!titleChanged && !contentChanged) {
    return null;
  }

  const lastVersion = await prisma.documentVersion.findFirst({
    where: {
      documentId: input.documentId
    },
    orderBy: {
      versionNumber: "desc"
    },
    select: {
      id: true,
      createdAt: true,
      versionNumber: true,
      titleSnapshot: true,
      contentSnapshot: true
    }
  });

  if (lastVersion) {
    const withinInterval =
      Date.now() - lastVersion.createdAt.getTime() < VERSION_INTERVAL_MS;
    const sameAsCurrentSnapshot =
      lastVersion.titleSnapshot === input.previousTitle &&
      JSON.stringify(lastVersion.contentSnapshot ?? null) ===
        JSON.stringify(input.previousContent ?? null);

    if (withinInterval || sameAsCurrentSnapshot) {
      return null;
    }
  }

  return createDocumentVersion({
    documentId: input.documentId,
    createdByUserId: input.createdByUserId,
    titleSnapshot: input.previousTitle,
    contentSnapshot: input.previousContent
  });
}

export async function createDocumentVersion(input: {
  documentId: string;
  createdByUserId?: string | null;
  titleSnapshot: string;
  contentSnapshot: unknown;
}) {
  const lastVersion = await prisma.documentVersion.findFirst({
    where: {
      documentId: input.documentId
    },
    orderBy: {
      versionNumber: "desc"
    },
    select: {
      versionNumber: true
    }
  });

  const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

  return prisma.documentVersion.create({
    data: {
      documentId: input.documentId,
      createdByUserId: input.createdByUserId ?? null,
      titleSnapshot: input.titleSnapshot,
      contentSnapshot: toPrismaJsonValue(input.contentSnapshot),
      versionNumber: nextVersionNumber
    }
  });
}

export async function restoreDocumentVersion(input: {
  documentId: string;
  ownerId: string;
  versionId: string;
  restoredByUserId: string;
}) {
  const document = await prisma.document.findFirst({
    where: getAccessibleDocumentWhere(input.documentId, input.ownerId),
    select: {
      id: true,
      title: true,
      contentJson: true
    }
  });

  if (!document) {
    return { status: "document-not-found" as const };
  }

  const version = await prisma.documentVersion.findFirst({
    where: {
      id: input.versionId,
      documentId: input.documentId
    },
    select: {
      id: true,
      titleSnapshot: true,
      contentSnapshot: true
    }
  });

  if (!version) {
    return { status: "version-not-found" as const };
  }

  await prisma.$transaction(async (tx) => {
    const lastVersion = await tx.documentVersion.findFirst({
      where: {
        documentId: input.documentId
      },
      orderBy: {
        versionNumber: "desc"
      },
      select: {
        versionNumber: true
      }
    });

    await tx.documentVersion.create({
      data: {
        documentId: input.documentId,
        createdByUserId: input.restoredByUserId,
        titleSnapshot: document.title,
        contentSnapshot: toPrismaJsonValue(document.contentJson),
        versionNumber: (lastVersion?.versionNumber ?? 0) + 1
      }
    });

    await tx.document.update({
      where: {
        id: input.documentId
      },
      data: {
        title: version.titleSnapshot,
        contentJson: toPrismaJsonValue(version.contentSnapshot),
        collaborationState: null
      }
    });
  });

  const updatedDocument = await prisma.document.findUnique({
    where: {
      id: input.documentId
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

  return {
    status: "restored" as const,
    document: updatedDocument
  };
}

function toPrismaJsonValue(value: unknown) {
  return value === null
    ? Prisma.JsonNull
    : (value as Prisma.InputJsonValue | undefined);
}
