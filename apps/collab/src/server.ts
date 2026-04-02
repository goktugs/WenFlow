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
const skipStoreUntilByDocument = new Map<string, number>();

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
  debounce: 2000,
  async onRequest(data) {
    const requestUrl = new URL(data.request.url ?? "/", "http://localhost");
    const match = requestUrl.pathname.match(
      /^\/internal\/documents\/([^/]+)\/disconnect-collaborators$/
    );

    if (!match || data.request.method !== "POST") {
      return;
    }

    const authHeader = data.request.headers.authorization ?? "";

    if (authHeader !== `Bearer ${jwtSecret}`) {
      data.response.writeHead(401, { "Content-Type": "application/json" });
      data.response.end(JSON.stringify({ message: "Unauthorized" }));
      throw null;
    }

    const { ownerId, closeOwner, reason } = await readDisconnectRequest(data.request);

    if (!ownerId) {
      data.response.writeHead(400, { "Content-Type": "application/json" });
      data.response.end(JSON.stringify({ message: "ownerId is required" }));
      throw null;
    }

    closeCollaboratorConnections(data.instance, match[1], ownerId, {
      closeOwner,
      reason
    });
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
            deletedAt: null,
            collaborators: {
              some: {
                userId: payload.sub
              }
            }
          }
        ]
      },
      select: {
        id: true,
        ownerId: true,
        isCollaborationReadOnly: true
      }
    });

    if (!document) {
      throw new Error("Not authorized");
    }

    data.connectionConfig.readOnly =
      document.isCollaborationReadOnly && document.ownerId !== payload.sub;

    return {
      user: {
        id: payload.sub,
        email: payload.email
      }
    };
  },
  async onLoadDocument(data) {
    clearExpiredStoreSkips();
    skipStoreUntilByDocument.delete(data.documentName);

    const document = await prisma.document.findFirst({
      where: {
        id: data.documentName,
        OR: [
          {
            ownerId: data.context.user.id
          },
          {
            deletedAt: null,
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
        sanitizeEditorDocument(document.contentJson),
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
  async onStateless({ payload, document, connection }) {
    document.broadcastStateless(payload, (conn) => conn !== connection);
  },
  async onStoreDocument(data) {
    clearExpiredStoreSkips();

    const skipStoreUntil = skipStoreUntilByDocument.get(data.documentName);

    if (typeof skipStoreUntil === "number" && skipStoreUntil > Date.now()) {
      return;
    }

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

function sanitizeEditorDocument(content: unknown): Record<string, unknown> {
  // Handle hocuspocus fromYdoc wrapper: { default: { type: "doc", ... } }
  if (isRecord(content) && !content.type && isRecord(content.default)) {
    return sanitizeEditorDocument(content.default);
  }

  if (isRecord(content) && content.type === "doc") {
    return {
      type: "doc",
      content: sanitizeBlockNodes(content.content)
    };
  }

  if (Array.isArray(content)) {
    return {
      type: "doc",
      content: sanitizeBlockNodes(content)
    };
  }

  if (isRecord(content) && Array.isArray(content.content)) {
    return {
      type: "doc",
      content: sanitizeBlockNodes(content.content)
    };
  }

  return {
    type: "doc",
    content: [
      {
        type: "paragraph"
      }
    ]
  };
}

function sanitizeBlockNodes(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [{ type: "paragraph" }];
  }

  const nodes: Array<Record<string, unknown>> = [];
  let inlineBuffer: Array<Record<string, unknown>> = [];

  const flushInlineBuffer = () => {
    if (inlineBuffer.length === 0) {
      return;
    }

    nodes.push({
      type: "paragraph",
      content: inlineBuffer
    });
    inlineBuffer = [];
  };

  value.forEach((node) => {
    const sanitized = sanitizeNode(node);

    if (!sanitized) {
      return;
    }

    if (sanitized.type === "text") {
      inlineBuffer.push(sanitized);
      return;
    }

    flushInlineBuffer();
    nodes.push(sanitized);
  });

  flushInlineBuffer();

  return nodes.length > 0 ? nodes : [{ type: "paragraph" }];
}

function sanitizeInlineNodes(value: unknown): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const nodes = value
    .map((node) => sanitizeNode(node))
    .filter(
      (node): node is Record<string, unknown> =>
        node !== null && (node.type === "text" || node.type === "hardBreak")
    );

  return nodes.length > 0 ? nodes : undefined;
}

function sanitizeListItemNodes(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [{ type: "paragraph" }];
  }

  const nodes = value
    .map((node) => sanitizeNode(node))
    .filter(
      (node): node is Record<string, unknown> =>
        node !== null && node.type !== "text"
    );

  return nodes.length > 0 ? nodes : [{ type: "paragraph" }];
}

function sanitizeNode(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawType = typeof value.type === "string" ? value.type : null;

  if (!rawType) {
    if (typeof value.text === "string") {
      return {
        type: "text",
        text: value.text
      };
    }

    return null;
  }

  switch (rawType) {
    case "doc":
      return {
        type: "doc",
        content: sanitizeBlockNodes(value.content)
      };
    case "paragraph": {
      const content = sanitizeInlineNodes(value.content);
      return content ? { type: "paragraph", content } : { type: "paragraph" };
    }
    case "heading": {
      const content = sanitizeInlineNodes(value.content);
      const level =
        isRecord(value.attrs) && (value.attrs.level === 1 || value.attrs.level === 2)
          ? value.attrs.level
          : 1;

      return content
        ? { type: "heading", attrs: { level }, content }
        : { type: "heading", attrs: { level } };
    }
    case "bulletList":
      return {
        type: "bulletList",
        content: sanitizeListItemNodes(value.content)
          .filter((node) => node.type === "listItem")
      };
    case "listItem":
      return {
        type: "listItem",
        content: sanitizeListItemNodes(value.content)
      };
    case "codeBlock": {
      const content = sanitizeInlineNodes(value.content)?.filter(
        (node) => node.type === "text"
      );

      return content && content.length > 0
        ? { type: "codeBlock", content }
        : { type: "codeBlock" };
    }
    case "text":
      return typeof value.text === "string"
        ? {
            type: "text",
            text: value.text
          }
        : null;
    default:
      return null;
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function closeCollaboratorConnections(
  instance: Server["hocuspocus"],
  documentName: string,
  ownerId: string,
  options?: {
    closeOwner?: boolean;
    reason?: "default" | "restore";
  }
) {
  const document = instance.documents.get(documentName);

  if (!document) {
    return;
  }

  const closeOwner = options?.closeOwner ?? false;
  const isRestore = options?.reason === "restore";
  const closeCode = isRestore ? 1012 : 4403;
  const closeReason = isRestore
    ? "Document restored. Reconnecting..."
    : "Collaboration disabled by the owner";

  document.getConnections().forEach((connection) => {
    const connectionUserId =
      typeof connection.context?.user?.id === "string"
        ? connection.context.user.id
        : null;

    if (connectionUserId && (closeOwner || connectionUserId !== ownerId)) {
      connection.close({
        code: closeCode,
        reason: closeReason
      });
      connection.webSocket.close(closeCode, closeReason);
    }
  });

  if (isRestore) {
    skipStoreUntilByDocument.set(documentName, Date.now() + 15_000);
    instance.documents.delete(documentName);
  }
}

function clearExpiredStoreSkips() {
  const now = Date.now();

  skipStoreUntilByDocument.forEach((expiresAt, documentName) => {
    if (expiresAt <= now) {
      skipStoreUntilByDocument.delete(documentName);
    }
  });
}

async function readDisconnectRequest(
  request: IncomingMessage
): Promise<{
  ownerId: string | null;
  closeOwner: boolean;
  reason: "default" | "restore";
}> {
  const bodyChunks: Buffer[] = [];

  for await (const chunk of request) {
    bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const bodyText = Buffer.concat(bodyChunks).toString("utf8");

  if (!bodyText) {
    return { ownerId: null, closeOwner: false, reason: "default" as const };
  }

  try {
    const parsedBody = JSON.parse(bodyText) as {
      ownerId?: unknown;
      closeOwner?: unknown;
      reason?: unknown;
    };

    return {
      ownerId: typeof parsedBody.ownerId === "string" ? parsedBody.ownerId : null,
      closeOwner: parsedBody.closeOwner === true,
      reason: parsedBody.reason === "restore" ? "restore" : "default"
    };
  } catch {
    return { ownerId: null, closeOwner: false, reason: "default" };
  }
}
