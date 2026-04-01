import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-context";
import { EditorShell } from "@/features/editor/editor-shell";
import {
  createDocument,
  deleteDocument,
  getDocument,
  joinSharedDocument,
  listDocumentVersions,
  listDocuments,
  renameDocument,
  restoreDocument,
  restoreDocumentVersion,
  updateDocumentCollaboration
} from "./document.api";
import type {
  DocumentDetail,
  DocumentListItem,
  DocumentVersion
} from "./document.types";

type ViewMode = "active" | "trash";

export function DocumentShell() {
  const { logout, token, user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentDetail | null>(
    null
  );
  const [renameValue, setRenameValue] = useState("");
  const [joinDocumentId, setJoinDocumentId] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [collaborationPassword, setCollaborationPassword] = useState("");
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isUpdatingCollaboration, setIsUpdatingCollaboration] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("connecting");
  const [presentUsers, setPresentUsers] = useState<
    Array<{ id: string; label: string; color: string }>
  >([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadDocuments(viewMode);
  }, [token, viewMode]);

  useEffect(() => {
    if (!token || !selectedId) {
      setSelectedDocument(null);
      setRenameValue("");
      setCollaborationPassword("");
      setDetailError(null);
      setSyncState("connecting");
      setPresentUsers([]);
      setVersions([]);
      setRestoringVersionId(null);
      return;
    }

    setIsLoadingDetail(true);
    setDetailError(null);

    getDocument(token, selectedId)
      .then((document) => {
        setSelectedDocument(document);
        setRenameValue(document.title);
        setCollaborationPassword("");
        setSyncState("connecting");
        setPresentUsers([]);
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Unable to load document";
        toast.error(message);
        setDetailError(message);
        setSelectedDocument(null);
      })
      .finally(() => {
        setIsLoadingDetail(false);
      });

    setIsLoadingVersions(true);

    listDocumentVersions(token, selectedId)
      .then((nextVersions) => {
        setVersions(nextVersions);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Unable to load versions");
        setVersions([]);
      })
      .finally(() => {
        setIsLoadingVersions(false);
      });
  }, [selectedId, token]);

  const selectedDocumentMeta = useMemo(
    () => documents.find((document) => document.id === selectedId) ?? null,
    [documents, selectedId]
  );

  function syncDocumentInList(nextDocument: DocumentDetail) {
    setDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        document.id === nextDocument.id
          ? {
              ...document,
              title: nextDocument.title,
              updatedAt: nextDocument.updatedAt,
              deletedAt: nextDocument.deletedAt,
              owner: nextDocument.owner,
              isOwner: nextDocument.isOwner,
              isCollaborationEnabled: nextDocument.isCollaborationEnabled
            }
          : document
      )
    );
  }

  async function loadDocuments(nextMode: ViewMode) {
    if (!token) {
      return;
    }

    setIsLoadingList(true);
    setListError(null);

    try {
      const nextDocuments = await listDocuments(token, nextMode === "trash");
      setDocuments(nextDocuments);

      if (nextDocuments.length === 0) {
        setSelectedId(null);
        setSelectedDocument(null);
        setRenameValue("");
        return;
      }

      setSelectedId((currentId) =>
        currentId && nextDocuments.some((document) => document.id === currentId)
          ? currentId
          : nextDocuments[0].id
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load documents";
      toast.error(message);
      setListError(message);
    } finally {
      setIsLoadingList(false);
    }
  }

  async function handleCreateDocument() {
    if (!token) {
      return;
    }

    setIsMutating(true);

    try {
      const document = await createDocument(token);
      toast.success("Document created");
      setViewMode("active");
      await loadDocuments("active");
      setSelectedId(document.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create document");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleJoinSharedDocument() {
    if (!token || !joinDocumentId.trim() || !joinPassword.trim()) {
      return;
    }

    setIsJoining(true);

    try {
      const document = await joinSharedDocument(
        token,
        joinDocumentId.trim(),
        joinPassword
      );
      toast.success("Joined shared document");
      setJoinDocumentId("");
      setJoinPassword("");
      setViewMode("active");
      await loadDocuments("active");
      setSelectedId(document.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to join document");
    } finally {
      setIsJoining(false);
    }
  }

  async function handleRenameDocument() {
    if (!token || !selectedDocument || !selectedDocument.isOwner || !renameValue.trim()) {
      return;
    }

    setIsSavingTitle(true);

    try {
      const updatedDocument = await renameDocument(
        token,
        selectedDocument.id,
        renameValue
      );
      toast.success("Document renamed");
      setSelectedDocument(updatedDocument);
      syncDocumentInList(updatedDocument);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to rename document");
    } finally {
      setIsSavingTitle(false);
    }
  }

  async function handleDeleteDocument() {
    if (!token || !selectedDocumentMeta || !selectedDocumentMeta.isOwner) {
      return;
    }

    setIsMutating(true);

    try {
      await deleteDocument(token, selectedDocumentMeta.id);
      toast.success("Moved to trash");
      await loadDocuments(viewMode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete document");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleRestoreDocument() {
    if (!token || !selectedDocumentMeta || !selectedDocumentMeta.isOwner) {
      return;
    }

    setIsMutating(true);

    try {
      await restoreDocument(token, selectedDocumentMeta.id);
      toast.success("Document restored");
      await loadDocuments("trash");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to restore document");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleEnableCollaboration() {
    if (!token || !selectedDocument || !selectedDocument.isOwner) {
      return;
    }

    if (!collaborationPassword.trim()) {
      toast.error("Set a collaboration password first");
      return;
    }

    setIsUpdatingCollaboration(true);

    try {
      const updatedDocument = await updateDocumentCollaboration(
        token,
        selectedDocument.id,
        {
          enabled: true,
          password: collaborationPassword
        }
      );
      toast.success(
        selectedDocument.isCollaborationEnabled
          ? "Collaboration password updated"
          : "Shared editing enabled"
      );
      setSelectedDocument(updatedDocument);
      syncDocumentInList(updatedDocument);
      setCollaborationPassword("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update collaboration"
      );
    } finally {
      setIsUpdatingCollaboration(false);
    }
  }

  async function handleDisableCollaboration() {
    if (!token || !selectedDocument || !selectedDocument.isOwner) {
      return;
    }

    setIsUpdatingCollaboration(true);

    try {
      const updatedDocument = await updateDocumentCollaboration(
        token,
        selectedDocument.id,
        {
          enabled: false
        }
      );
      toast.success("Shared editing disabled");
      setSelectedDocument(updatedDocument);
      syncDocumentInList(updatedDocument);
      setCollaborationPassword("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update collaboration"
      );
    } finally {
      setIsUpdatingCollaboration(false);
    }
  }

  async function handleRestoreVersion(versionId: string) {
    if (!token || !selectedDocument) {
      return;
    }

    setIsRestoringVersion(true);
    setRestoringVersionId(versionId);

    try {
      const restoredDocument = await restoreDocumentVersion(
        token,
        selectedDocument.id,
        versionId
      );
      toast.success("Version restored");
      setSelectedDocument(restoredDocument);
      setRenameValue(restoredDocument.title);
      syncDocumentInList(restoredDocument);
      const nextVersions = await listDocumentVersions(token, restoredDocument.id);
      setVersions(nextVersions);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to restore version");
    } finally {
      setIsRestoringVersion(false);
      setRestoringVersionId(null);
    }
  }

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex flex-col rounded-3xl border border-border bg-card/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <div className="space-y-4 border-b border-border pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  WenFlow
                </p>
                <h1 className="mt-2 text-xl font-semibold">{user?.name}'s workspace</h1>
              </div>
              <Button onClick={logout} size="sm" variant="outline">
                Sign out
              </Button>
            </div>

            <Button
              className="w-full justify-start"
              disabled={isMutating}
              onClick={handleCreateDocument}
            >
              New document
            </Button>

            <div className="space-y-2 rounded-2xl border border-border bg-background/50 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Join shared document
              </p>
              <Input
                placeholder="Document code"
                value={joinDocumentId}
                onChange={(event) => setJoinDocumentId(event.target.value)}
              />
              <Input
                placeholder="Collaboration password"
                type="password"
                value={joinPassword}
                onChange={(event) => setJoinPassword(event.target.value)}
              />
              <Button
                className="w-full"
                disabled={isJoining}
                onClick={handleJoinSharedDocument}
                variant="outline"
              >
                {isJoining ? "Joining..." : "Join shared document"}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={viewMode === "active" ? "default" : "outline"}
                onClick={() => setViewMode("active")}
              >
                Documents
              </Button>
              <Button
                variant={viewMode === "trash" ? "default" : "outline"}
                onClick={() => setViewMode("trash")}
              >
                Trash
              </Button>
            </div>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto">
            {isLoadingList ? (
              <p className="px-2 text-sm text-muted-foreground">Loading documents...</p>
            ) : listError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-6 text-sm text-destructive">
                {listError}
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                {viewMode === "active"
                  ? "No documents yet. Create your first one from the sidebar."
                  : "Trash is empty."}
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((document) => (
                  <button
                    key={document.id}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                      selectedId === document.id
                        ? "border-primary/30 bg-primary/10 text-foreground"
                        : "border-transparent bg-background/50 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                    onClick={() => setSelectedId(document.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-sm font-medium">{document.title}</p>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]">
                        {document.isOwner ? "Mine" : "Shared"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {document.isOwner
                        ? "Owner"
                        : `Owner: ${document.owner.name}`}
                      {document.isCollaborationEnabled ? " · Live collaboration" : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated {new Date(document.updatedAt).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          {!selectedId ? (
            <div className="flex h-full min-h-[60vh] items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
              Select a document to continue.
            </div>
          ) : isLoadingDetail ? (
            <div className="flex h-full min-h-[60vh] items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
              Loading document...
            </div>
          ) : detailError ? (
            <div className="flex h-full min-h-[60vh] items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 px-6 text-sm text-destructive">
              {detailError}
            </div>
          ) : selectedDocument ? (
            <div className="flex h-full min-h-[60vh] flex-col gap-6">
              <div className="flex flex-col gap-4 border-b border-border pb-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {viewMode === "trash"
                        ? "Deleted document"
                        : selectedDocument.isOwner
                          ? "Document details"
                          : `Shared by ${selectedDocument.owner.name}`}
                    </p>
                    <h2 className="text-3xl font-semibold tracking-tight">
                      {selectedDocument.title}
                    </h2>
                  </div>

                  {viewMode === "active" && selectedDocument.isOwner ? (
                    <Button
                      disabled={isMutating}
                      onClick={handleDeleteDocument}
                      variant="outline"
                    >
                      Move to trash
                    </Button>
                  ) : null}

                  {viewMode === "trash" && selectedDocument.isOwner ? (
                    <Button
                      disabled={isMutating}
                      onClick={handleRestoreDocument}
                      variant="outline"
                    >
                      Restore
                    </Button>
                  ) : null}
                </div>

                {viewMode === "active" && selectedDocument.isOwner ? (
                  <div className="flex max-w-xl gap-3">
                    <Input
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      placeholder="Document title"
                    />
                    <Button disabled={isSavingTitle} onClick={handleRenameDocument}>
                      {isSavingTitle ? "Saving..." : "Rename"}
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Created
                  </p>
                  <p className="mt-2 text-sm">
                    {new Date(selectedDocument.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Updated
                  </p>
                  <p className="mt-2 text-sm">
                    {new Date(selectedDocument.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {viewMode === "active" ? (
                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Collaboration
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedDocument.isOwner
                          ? "Turn on shared editing with a password, then send the document code and password to another user."
                          : "You joined this document through shared editing."}
                      </p>
                    </div>
                    <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">
                      {selectedDocument.isCollaborationEnabled ? "Shared" : "Private"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-border bg-card/70 px-3 py-3 text-sm">
                      <span className="text-muted-foreground">Document code: </span>
                      <span className="font-medium">
                        {selectedDocument.accessCode ?? selectedDocument.id}
                      </span>
                    </div>

                    {selectedDocument.isOwner ? (
                      <>
                        <Input
                          placeholder={
                            selectedDocument.isCollaborationEnabled
                              ? "Set a new collaboration password"
                              : "Set a collaboration password"
                          }
                          type="password"
                          value={collaborationPassword}
                          onChange={(event) =>
                            setCollaborationPassword(event.target.value)
                          }
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            disabled={isUpdatingCollaboration}
                            onClick={handleEnableCollaboration}
                          >
                            {isUpdatingCollaboration
                              ? "Saving..."
                              : selectedDocument.isCollaborationEnabled
                                ? "Update password"
                                : "Enable collaboration"}
                          </Button>
                          {selectedDocument.isCollaborationEnabled ? (
                            <Button
                              disabled={isUpdatingCollaboration}
                              onClick={handleDisableCollaboration}
                              variant="outline"
                            >
                              Disable collaboration
                            </Button>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Owner: {selectedDocument.owner.name} ({selectedDocument.owner.email})
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Presence
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Users currently connected to this document.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {presentUsers.length > 0 ? (
                      presentUsers.map((presenceUser) => (
                        <span
                          key={presenceUser.id}
                          className="rounded-full border px-3 py-1 text-xs text-foreground"
                          style={{
                            borderColor: `${presenceUser.color}66`,
                            backgroundColor: `${presenceUser.color}1A`
                          }}
                        >
                          {presenceUser.label}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">
                        No active collaborators
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Version history
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Snapshot history for this document.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {isLoadingVersions ? (
                    <p className="text-sm text-muted-foreground">Loading versions...</p>
                  ) : versions.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                      No saved versions yet.
                    </p>
                  ) : (
                    versions.map((version) => (
                      <div
                        key={version.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/70 px-3 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            v{version.versionNumber} · {version.titleSnapshot}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(version.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <Button
                          disabled={isRestoringVersion}
                          onClick={() => handleRestoreVersion(version.id)}
                          size="sm"
                          variant="outline"
                        >
                          {isRestoringVersion && restoringVersionId === version.id
                            ? "Restoring..."
                            : "Restore"}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {viewMode === "active" ? (
                <EditorShell
                  documentId={selectedDocument.id}
                  onPresenceChange={setPresentUsers}
                  onSyncStateChange={setSyncState}
                  syncState={syncState}
                  token={token!}
                  user={{
                    id: user!.id,
                    name: user!.name,
                    email: user!.email
                  }}
                />
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border bg-background/40 p-10 text-sm text-muted-foreground">
                  Restore this document to continue editing it.
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[60vh] items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
              Unable to load the selected document.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
