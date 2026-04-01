ALTER TABLE "Document"
ADD COLUMN "isCollaborationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "collaborationPasswordHash" TEXT;

CREATE TABLE "DocumentMembership" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentMembership_documentId_userId_key" ON "DocumentMembership"("documentId", "userId");
CREATE INDEX "DocumentMembership_userId_createdAt_idx" ON "DocumentMembership"("userId", "createdAt");

ALTER TABLE "DocumentMembership" ADD CONSTRAINT "DocumentMembership_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentMembership" ADD CONSTRAINT "DocumentMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
