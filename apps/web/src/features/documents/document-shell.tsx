import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-context";
import { EditorShell } from "@/features/editor/editor-shell";
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  renameDocument,
  saveDocumentContent,
  restoreDocument
} from "./document.api";
import type { DocumentDetail, DocumentListItem } from "./document.types";

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
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const hasPendingContentSaveRef = useRef(false);

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
      setSaveState("idle");
      hasPendingContentSaveRef.current = false;
      return;
    }

    setIsLoadingDetail(true);

    getDocument(token, selectedId)
      .then((document) => {
        setSelectedDocument(document);
        setRenameValue(document.title);
        setSaveState("idle");
        hasPendingContentSaveRef.current = false;
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Unable to load document");
        setSelectedDocument(null);
      })
      .finally(() => {
        setIsLoadingDetail(false);
      });
  }, [selectedId, token]);

  useEffect(() => {
    if (
      !token ||
      !selectedDocument ||
      selectedDocument.deletedAt ||
      !hasPendingContentSaveRef.current
    ) {
      return;
    }

    const handle = window.setTimeout(async () => {
      if (!selectedDocument) {
        return;
      }

      setSaveState("saving");

      try {
        const updatedDocument = await saveDocumentContent(
          token,
          selectedDocument.id,
          selectedDocument.contentJson
        );
        setSelectedDocument(updatedDocument);
        setDocuments((currentDocuments) =>
          currentDocuments.map((document) =>
            document.id === updatedDocument.id
              ? {
                  ...document,
                  title: updatedDocument.title,
                  updatedAt: updatedDocument.updatedAt,
                  deletedAt: updatedDocument.deletedAt
                }
              : document
          )
        );
        setSaveState("saved");
        hasPendingContentSaveRef.current = false;
      } catch (error) {
        setSaveState("error");
        toast.error(error instanceof Error ? error.message : "Unable to save document");
      }
    }, 800);

    return () => {
      window.clearTimeout(handle);
    };
  }, [selectedDocument?.contentJson, selectedDocument?.id, selectedDocument?.deletedAt, token]);

  const selectedDocumentMeta = useMemo(
    () => documents.find((document) => document.id === selectedId) ?? null,
    [documents, selectedId]
  );

  async function loadDocuments(nextMode: ViewMode) {
    if (!token) {
      return;
    }

    setIsLoadingList(true);

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
      toast.error(error instanceof Error ? error.message : "Unable to load documents");
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

  async function handleRenameDocument() {
    if (!token || !selectedDocument || !renameValue.trim()) {
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
      setDocuments((currentDocuments) =>
        currentDocuments.map((document) =>
          document.id === updatedDocument.id
            ? {
                ...document,
                title: updatedDocument.title,
                updatedAt: updatedDocument.updatedAt,
                deletedAt: updatedDocument.deletedAt
              }
            : document
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to rename document");
    } finally {
      setIsSavingTitle(false);
    }
  }

  function handleEditorContentChange(contentJson: unknown) {
    setSelectedDocument((currentDocument) => {
      if (!currentDocument) {
        return currentDocument;
      }

      return {
        ...currentDocument,
        contentJson
      };
    });
    hasPendingContentSaveRef.current = true;
    setSaveState("idle");
  }

  async function handleDeleteDocument() {
    if (!token || !selectedDocumentMeta) {
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
    if (!token || !selectedDocumentMeta) {
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
                    <p className="truncate text-sm font-medium">{document.title}</p>
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
          ) : selectedDocument ? (
            <div className="flex h-full min-h-[60vh] flex-col gap-6">
              <div className="flex flex-col gap-4 border-b border-border pb-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {viewMode === "trash" ? "Deleted document" : "Document details"}
                    </p>
                    <h2 className="text-3xl font-semibold tracking-tight">
                      {selectedDocument.title}
                    </h2>
                  </div>

                  {viewMode === "active" ? (
                    <Button
                      disabled={isMutating}
                      onClick={handleDeleteDocument}
                      variant="outline"
                    >
                      Move to trash
                    </Button>
                  ) : (
                    <Button
                      disabled={isMutating}
                      onClick={handleRestoreDocument}
                      variant="outline"
                    >
                      Restore
                    </Button>
                  )}
                </div>

                {viewMode === "active" ? (
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
                <EditorShell
                  documentId={selectedDocument.id}
                  initialContent={selectedDocument.contentJson}
                  onContentChange={handleEditorContentChange}
                  saveState={saveState}
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
