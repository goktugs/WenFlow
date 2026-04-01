import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { maybeCreateDocumentVersion } from "../versions/version.service.js";

const COLLABORATION_PASSWORD_SALT_ROUNDS = 12;

type DocumentListParams = {
  userId: string;
  includeDeleted: boolean;
};

type SelectedDocumentRecord = {
  id: string;
  title: string;
  contentJson: unknown;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  isCollaborationEnabled: boolean;
  isCollaborationReadOnly: boolean;
  owner: {
    id: string;
    name: string;
    email: string;
  };
};

function getAccessibleDocumentWhere(id: string, userId: string) {
  return {
    id,
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

function getAccessibleDocumentsWhere(userId: string, includeDeleted: boolean) {
  return {
    ...(includeDeleted
      ? { deletedAt: { not: null } }
      : { deletedAt: null }),
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

function mapDocumentSummary(
  document: Omit<SelectedDocumentRecord, "contentJson"> & { contentJson?: unknown }
) {
  return {
    id: document.id,
    title: document.title,
    deletedAt: document.deletedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    owner: document.owner,
    isOwner: document.ownerId === document.owner.id,
    isCollaborationEnabled: document.isCollaborationEnabled,
    isCollaborationReadOnly: document.isCollaborationReadOnly
  };
}

function mapDocumentDetail(document: SelectedDocumentRecord, userId: string) {
  const isOwner = document.ownerId === userId;

  return {
    id: document.id,
    title: document.title,
    contentJson: document.contentJson,
    deletedAt: document.deletedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    owner: document.owner,
    isOwner,
    isCollaborationEnabled: document.isCollaborationEnabled,
    isCollaborationReadOnly: document.isCollaborationReadOnly,
    isReadOnly: !isOwner && document.isCollaborationReadOnly,
    accessCode: document.isCollaborationEnabled ? document.id : null
  };
}

async function findAccessibleDocument(id: string, userId: string) {
  return prisma.document.findFirst({
    where: getAccessibleDocumentWhere(id, userId),
    select: {
      id: true,
      title: true,
      contentJson: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
      ownerId: true,
      isCollaborationEnabled: true,
      isCollaborationReadOnly: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
}

async function findOwnedDocument(id: string, ownerId: string) {
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
      updatedAt: true,
      ownerId: true,
      isCollaborationEnabled: true,
      isCollaborationReadOnly: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
}

export async function listDocuments({ userId, includeDeleted }: DocumentListParams) {
  const documents = await prisma.document.findMany({
    where: getAccessibleDocumentsWhere(userId, includeDeleted),
    orderBy: {
      updatedAt: "desc"
    },
    select: {
      id: true,
      title: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
      ownerId: true,
      isCollaborationEnabled: true,
      isCollaborationReadOnly: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return documents.map((document) => ({
    ...mapDocumentSummary(document),
    isOwner: document.ownerId === userId
  }));
}

export async function createDocument(ownerId: string, title?: string) {
  const document = await prisma.document.create({
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
      updatedAt: true,
      ownerId: true,
      isCollaborationEnabled: true,
      isCollaborationReadOnly: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return {
    ...mapDocumentSummary(document),
    isOwner: true
  };
}

export async function getDocumentById(id: string, userId: string) {
  const document = await findAccessibleDocument(id, userId);

  if (!document) {
    return null;
  }

  return mapDocumentDetail(document, userId);
}

export async function updateDocument(
  id: string,
  userId: string,
  input: {
    title?: string;
    contentJson?: unknown;
    createdByUserId?: string | null;
  }
) {
  const currentDocument = await prisma.document.findFirst({
    where: getAccessibleDocumentWhere(id, userId),
    select: {
      id: true,
      title: true,
      contentJson: true,
      ownerId: true,
      isCollaborationReadOnly: true
    }
  });

  if (!currentDocument) {
    return { status: "not-found" as const };
  }

  if (typeof input.title !== "undefined" && currentDocument.ownerId !== userId) {
    return { status: "forbidden" as const };
  }

  if (
    typeof input.contentJson !== "undefined" &&
    currentDocument.ownerId !== userId &&
    currentDocument.isCollaborationReadOnly
  ) {
    return { status: "forbidden" as const };
  }

  const nextTitle =
    typeof input.title !== "undefined" ? input.title.trim() : currentDocument.title;
  const nextContent =
    typeof input.contentJson !== "undefined"
      ? input.contentJson
      : currentDocument.contentJson;

  await maybeCreateDocumentVersion({
    documentId: currentDocument.id,
    ownerId: currentDocument.ownerId,
    createdByUserId: input.createdByUserId,
    previousTitle: currentDocument.title,
    previousContent: currentDocument.contentJson,
    nextTitle,
    nextContent
  });

  await prisma.document.update({
    where: {
      id: currentDocument.id
    },
    data: {
      ...(typeof input.title !== "undefined" ? { title: nextTitle } : {}),
      ...(typeof input.contentJson !== "undefined"
        ? {
            contentJson: input.contentJson as Prisma.InputJsonValue,
            collaborationState: null
          }
        : {})
    }
  });

  return { status: "updated" as const };
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

export async function updateDocumentCollaborationSettings(input: {
  documentId: string;
  ownerId: string;
  enabled: boolean;
  password?: string;
  readOnly?: boolean;
}) {
  const document = await findOwnedDocument(input.documentId, input.ownerId);

  if (!document) {
    return { status: "not-found" as const };
  }

  if (input.enabled) {
    const password = input.password?.trim();

    if (!password) {
      throw new Error("COLLABORATION_PASSWORD_REQUIRED");
    }

    const passwordHash = await bcrypt.hash(
      password,
      COLLABORATION_PASSWORD_SALT_ROUNDS
    );

    await prisma.document.update({
      where: {
        id: document.id
      },
      data: {
        isCollaborationEnabled: true,
        isCollaborationReadOnly: input.readOnly ?? false,
        collaborationPasswordHash: passwordHash
      }
    });
  } else {
    await prisma.$transaction([
      prisma.document.update({
        where: {
          id: document.id
        },
        data: {
          isCollaborationEnabled: false,
          isCollaborationReadOnly: false,
          collaborationPasswordHash: null
        }
      }),
      prisma.documentMembership.deleteMany({
        where: {
          documentId: document.id
        }
      })
    ]);
  }

  const updatedDocument = await getDocumentById(document.id, input.ownerId);

  return {
    status: "updated" as const,
    document: updatedDocument
  };
}

export async function joinSharedDocument(input: {
  documentId: string;
  userId: string;
  password: string;
}) {
  const document = await prisma.document.findFirst({
    where: {
      id: input.documentId,
      deletedAt: null
    },
    select: {
      id: true,
      ownerId: true,
      isCollaborationEnabled: true,
      isCollaborationReadOnly: true,
      collaborationPasswordHash: true
    }
  });

  if (!document || !document.isCollaborationEnabled) {
    return { status: "not-found" as const };
  }

  if (document.ownerId === input.userId) {
    const ownerDocument = await getDocumentById(document.id, input.userId);

    return {
      status: "joined" as const,
      document: ownerDocument
    };
  }

  const isPasswordValid = await bcrypt.compare(
    input.password,
    document.collaborationPasswordHash ?? ""
  );

  if (!isPasswordValid) {
    return { status: "invalid-password" as const };
  }

  await prisma.documentMembership.upsert({
    where: {
      documentId_userId: {
        documentId: document.id,
        userId: input.userId
      }
    },
    update: {},
    create: {
      documentId: document.id,
      userId: input.userId
    }
  });

  const joinedDocument = await getDocumentById(document.id, input.userId);

  return {
    status: "joined" as const,
    document: joinedDocument
  };
}
