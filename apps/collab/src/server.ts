import dotenv from "dotenv";
import type { IncomingMessage } from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "@hocuspocus/server";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { Prisma, PrismaClient } from "@prisma/client";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Heading from "@tiptap/extension-heading";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";
import CodeBlock from "@tiptap/extension-code-block";
import * as Y from "yjs";

dotenv.config();

const prisma = new PrismaClient();
const port = Number(process.env.COLLAB_PORT ?? 4001);
const jwtSecret = process.env.JWT_SECRET;
const VERSION_INTERVAL_MS = 5 * 60 * 1000;

if (!jwtSecret) {
  throw new Error("JWT_SECRET is required");
}

const tiptapExtensions = [
  Document,
  Paragraph,
  Text,
  Heading.configure({ levels: [1, 2] }),
  BulletList,
  ListItem,
  CodeBlock
] as any;

const server = new Server({
  port,
  async onRequest(data) {
    const requestUrl = new URL(data.request.url ?? "/", "http://localhost");
    const match = requestUrl.pathname.match(
      /^\/internal\/documents\/([^/]+)\/disconnect-collaborators$/
    );

    if (!match || data.request.method !== "POST") {
      return;
    }

    const authHeader = data.request.headers.authorization ?? "";
    const expectedToken = `Bearer ${jwtSecret}`;

    if (authHeader !== expectedToken) {
      data.response.writeHead(401, { "Content-Type": "application/json" });
      data.response.end(JSON.stringify({ message: "Unauthorized" }));
      throw null;
    }

    const ownerId = await readOwnerIdFromRequest(data.request);

    if (!ownerId) {
      data.response.writeHead(400, { "Content-Type": "application/json" });
      data.response.end(JSON.stringify({ message: "ownerId is required" }));
      throw null;
    }

    closeCollaboratorConnections(data.instance, match[1], ownerId);
    data.response.writeHead(200, { "Content-Type": "application/json" });
    data.response.end(JSON.stringify({ status: "ok" }));
    throw null;
  },
  async onAuthenticate(data) {
    const payload = jwt.verify(data.token, jwtSecret) as {
      sub: string;
      email: string;
    };

    const document = await prisma.document.findFirst({
      where: {
        id: data.documentName,
        OR: [
          {
            ownerId: payload.sub
          },
          {
            collaborators: {
              some: {
                userId: payload.sub
              }
            }
          }
        ]
      },
      select: {
        id: true
      }
    });

    if (!document) {
      throw new Error("Not authorized");
    }

    return {
      user: {
        id: payload.sub,
        email: payload.email
      }
    };
  },
  async onLoadDocument(data) {
    const document = await prisma.document.findFirst({
      where: {
        id: data.documentName,
        OR: [
          {
            ownerId: data.context.user.id
          },
          {
            collaborators: {
              some: {
                userId: data.context.user.id
              }
            }
          }
        ]
      },
      select: {
        contentJson: true,
        collaborationState: true
      }
    });

    if (!document) {
      throw new Error("Document not found");
    }

    if (document.collaborationState) {
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, document.collaborationState);
      return ydoc;
    }

    if (document.contentJson) {
      return TiptapTransformer.toYdoc(
        document.contentJson as Record<string, unknown>,
        "default",
        tiptapExtensions
      );
    }

    return TiptapTransformer.toYdoc(
      {
        type: "doc",
        content: [
          {
            type: "paragraph"
          }
        ]
      },
      "default",
      tiptapExtensions
    );
  },
  async onStoreDocument(data) {
    const contentJson = TiptapTransformer.fromYdoc(data.document);
    const collaborationState = Buffer.from(Y.encodeStateAsUpdate(data.document));
    const createdByUserId =
      typeof data.context?.user?.id === "string" ? data.context.user.id : null;

    await prisma.$transaction(async (tx) => {
      const currentDocument = await tx.document.findUnique({
        where: {
          id: data.documentName
        },
        select: {
          id: true,
          title: true,
          contentJson: true
        }
      });

      if (!currentDocument) {
        return;
      }

      await maybeCreateDocumentVersion(tx, {
        documentId: currentDocument.id,
        createdByUserId,
        previousTitle: currentDocument.title,
        previousContent: currentDocument.contentJson,
        nextTitle: currentDocument.title,
        nextContent: contentJson
      });

      await tx.document.update({
        where: {
          id: data.documentName
        },
        data: {
          contentJson: toPrismaJsonValue(contentJson),
          collaborationState
        }
      });
    });
  }
});

server.listen();

console.log(`Collaboration server listening on ws://localhost:${port}`);

async function maybeCreateDocumentVersion(
  tx: Prisma.TransactionClient,
  input: {
    documentId: string;
    createdByUserId: string | null;
    previousTitle: string;
    previousContent: unknown;
    nextTitle: string;
    nextContent: unknown;
  }
) {
  const titleChanged = input.previousTitle !== input.nextTitle;
  const contentChanged =
    JSON.stringify(input.previousContent ?? null) !==
    JSON.stringify(input.nextContent ?? null);

  if (!titleChanged && !contentChanged) {
    return;
  }

  const lastVersion = await tx.documentVersion.findFirst({
    where: {
      documentId: input.documentId
    },
    orderBy: {
      versionNumber: "desc"
    },
    select: {
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
      return;
    }
  }

  const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

  await tx.documentVersion.create({
    data: {
      documentId: input.documentId,
      createdByUserId: input.createdByUserId,
      titleSnapshot: input.previousTitle,
      contentSnapshot: toPrismaJsonValue(input.previousContent),
      versionNumber: nextVersionNumber
    }
  });
}

function toPrismaJsonValue(value: unknown) {
  return value === null
    ? Prisma.JsonNull
    : (value as Prisma.InputJsonValue | undefined);
}

function closeCollaboratorConnections(
  instance: Server["hocuspocus"],
  documentName: string,
  ownerId: string
) {
  const document = instance.documents.get(documentName);

  if (!document) {
    return;
  }

  document.getConnections().forEach((connection) => {
    const connectionUserId =
      typeof connection.context?.user?.id === "string"
        ? connection.context.user.id
        : null;

    if (connectionUserId && connectionUserId !== ownerId) {
      connection.close({
        code: 4403,
        reason: "Collaboration disabled by the owner"
      });
    }
  });
}

async function readOwnerIdFromRequest(request: IncomingMessage) {
  const bodyChunks: Buffer[] = [];

  for await (const chunk of request) {
    bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const bodyText = Buffer.concat(bodyChunks).toString("utf8");

  if (!bodyText) {
    return null;
  }

  try {
    const parsedBody = JSON.parse(bodyText) as { ownerId?: unknown };
    return typeof parsedBody.ownerId === "string" ? parsedBody.ownerId : null;
  } catch {
    return null;
  }
}
