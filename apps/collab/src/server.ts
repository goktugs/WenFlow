import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { Server } from "@hocuspocus/server";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { PrismaClient } from "@prisma/client";
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

    await prisma.document.updateMany({
      where: {
        id: data.documentName
      },
      data: {
        contentJson,
        collaborationState
      }
    });
  }
});

server.listen();

console.log(`Collaboration server listening on ws://localhost:${port}`);
