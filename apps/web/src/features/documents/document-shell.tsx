import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-context";
import { useDocumentStore } from "./document.store";
import { DocumentSidebar } from "./document-sidebar";
import { DocumentDetailPanel } from "./document-detail-panel";
import { ShareJoinDialog } from "./share-join-dialog";

export function DocumentShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, token, user } = useAuth();

  const viewMode = useDocumentStore((state) => state.viewMode);
  const documents = useDocumentStore((state) => state.documents);
  const selectedId = useDocumentStore((state) => state.selectedId);
  const selectedDocument = useDocumentStore((state) => state.selectedDocument);
  const renameValue = useDocumentStore((state) => state.renameValue);
  const joinPassword = useDocumentStore((state) => state.joinPassword);
  const collaborationPassword = useDocumentStore(
    (state) => state.collaborationPassword
  );
  const collaborationReadOnly = useDocumentStore(
    (state) => state.collaborationReadOnly
  );
  const isLoadingList = useDocumentStore((state) => state.isLoadingList);
  const isLoadingDetail = useDocumentStore((state) => state.isLoadingDetail);
  const isSavingTitle = useDocumentStore((state) => state.isSavingTitle);
  const isMutating = useDocumentStore((state) => state.isMutating);
  const isJoining = useDocumentStore((state) => state.isJoining);
  const isUpdatingCollaboration = useDocumentStore(
    (state) => state.isUpdatingCollaboration
  );
  const listError = useDocumentStore((state) => state.listError);
  const detailError = useDocumentStore((state) => state.detailError);
  const isLoadingVersions = useDocumentStore((state) => state.isLoadingVersions);
  const isSavingVersion = useDocumentStore((state) => state.isSavingVersion);
  const isRestoringVersion = useDocumentStore(
    (state) => state.isRestoringVersion
  );
  const restoringVersionId = useDocumentStore((state) => state.restoringVersionId);
  const syncState = useDocumentStore((state) => state.syncState);
  const presentUsers = useDocumentStore((state) => state.presentUsers);
  const versions = useDocumentStore((state) => state.versions);
  const editorRestoreNonce = useDocumentStore((state) => state.editorRestoreNonce);
  const editorRestoreContent = useDocumentStore(
    (state) => state.editorRestoreContent
  );

  const setViewMode = useDocumentStore((state) => state.setViewMode);
  const setSelectedId = useDocumentStore((state) => state.setSelectedId);
  const setRenameValue = useDocumentStore((state) => state.setRenameValue);
  const setJoinPassword = useDocumentStore((state) => state.setJoinPassword);
  const setCollaborationPassword = useDocumentStore(
    (state) => state.setCollaborationPassword
  );
  const setCollaborationReadOnly = useDocumentStore(
    (state) => state.setCollaborationReadOnly
  );
  const setSyncState = useDocumentStore((state) => state.setSyncState);
  const setPresentUsers = useDocumentStore((state) => state.setPresentUsers);
  const resetSelectionState = useDocumentStore((state) => state.resetSelectionState);
  const loadDocuments = useDocumentStore((state) => state.loadDocuments);
  const loadSelectedDocument = useDocumentStore(
    (state) => state.loadSelectedDocument
  );
  const loadVersions = useDocumentStore((state) => state.loadVersions);
  const createDocumentAction = useDocumentStore((state) => state.createDocument);
  const joinSharedDocumentAction = useDocumentStore(
    (state) => state.joinSharedDocument
  );
  const renameDocumentAction = useDocumentStore((state) => state.renameDocument);
  const deleteDocumentAction = useDocumentStore((state) => state.deleteDocument);
  const restoreDocumentAction = useDocumentStore((state) => state.restoreDocument);
  const enableCollaborationAction = useDocumentStore(
    (state) => state.enableCollaboration
  );
  const disableCollaborationAction = useDocumentStore(
    (state) => state.disableCollaboration
  );
  const restoreVersionAction = useDocumentStore((state) => state.restoreVersion);
  const saveVersionAction = useDocumentStore((state) => state.saveVersion);

  const shareDocumentId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const share = searchParams.get("share");

    return share?.trim() || null;
  }, [location.search]);
  const passwordSlots = useMemo(() => [0, 1, 2, 3], []);

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadDocuments(token, viewMode, shareDocumentId);
  }, [loadDocuments, shareDocumentId, token, viewMode]);

  useEffect(() => {
    if (!shareDocumentId) {
      return;
    }

    setViewMode("my-docs");
  }, [setViewMode, shareDocumentId]);

  useEffect(() => {
    if (!token || !selectedId) {
      resetSelectionState();
      return;
    }

    void loadSelectedDocument(token, selectedId);
    void loadVersions(token, selectedId);
  }, [loadSelectedDocument, loadVersions, resetSelectionState, selectedId, token]);

  useEffect(() => {
    if (
      !token ||
      !selectedId ||
      !selectedDocument ||
      selectedDocument.isOwner ||
      (syncState !== "disconnected" && syncState !== "error")
    ) {
      return;
    }

    let cancelled = false;

    const refreshAccess = async () => {
      await loadDocuments(token, viewMode, shareDocumentId);

      if (cancelled) {
        return;
      }

      const hasAccess = useDocumentStore
        .getState()
        .documents.some((document) => document.id === selectedId);

      if (!hasAccess && useDocumentStore.getState().selectedId === selectedId) {
        useDocumentStore.getState().setSelectedId(null);
      }
    };

    void refreshAccess();

    return () => {
      cancelled = true;
    };
  }, [
    loadDocuments,
    selectedDocument,
    selectedId,
    shareDocumentId,
    syncState,
    token,
    viewMode
  ]);

  const selectedDocumentMeta = useMemo(
    () => documents.find((document) => document.id === selectedId) ?? null,
    [documents, selectedId]
  );
  const displayedDocuments = useMemo(() => {
    if (!selectedId || !selectedDocument?.isOwner) {
      return documents;
    }

    return documents.map((document) =>
      document.id === selectedId
        ? {
            ...document,
            title: renameValue || document.title
          }
        : document
    );
  }, [documents, renameValue, selectedDocument?.isOwner, selectedId]);
  const displayedSelectedDocument = useMemo(() => {
    if (!selectedDocument || !selectedDocument.isOwner) {
      return selectedDocument;
    }

    return {
      ...selectedDocument,
      title: renameValue || selectedDocument.title
    };
  }, [renameValue, selectedDocument]);

  async function handleCreateDocument() {
    if (!token) {
      return;
    }

    await createDocumentAction(token);
    await loadDocuments(token, "my-docs", shareDocumentId);
  }

  async function handleJoinSharedDocument() {
    if (!token || !shareDocumentId || joinPassword.trim().length !== 4) {
      return;
    }

    await joinSharedDocumentAction(token, shareDocumentId, () => {
      navigate("/app", { replace: true });
    });
    await loadDocuments(token, "my-docs", null);
  }

  async function handleCopyShareLink() {
    if (!selectedDocument) {
      return;
    }

    const shareLink = `${window.location.origin}/app?share=${selectedDocument.id}`;

    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success("Share link copied");
    } catch {
      toast.error("Unable to copy share link");
    }
  }

  async function handleRenameDocument() {
    if (!token || !selectedDocument || !selectedDocument.isOwner || !renameValue.trim()) {
      return;
    }

    await renameDocumentAction(token, selectedDocument);
  }

  async function handleDeleteDocument() {
    if (!token || !selectedDocumentMeta || !selectedDocumentMeta.isOwner) {
      return;
    }

    await deleteDocumentAction(token, selectedDocumentMeta, viewMode, async (nextMode) => {
      await loadDocuments(token, nextMode, shareDocumentId);
    });
  }

  async function handleRestoreDocument() {
    if (!token || !selectedDocumentMeta || !selectedDocumentMeta.isOwner) {
      return;
    }

    await restoreDocumentAction(token, selectedDocumentMeta, async (nextMode) => {
      await loadDocuments(token, nextMode, shareDocumentId);
    });
  }

  async function handleEnableCollaboration() {
    if (!token || !selectedDocument || !selectedDocument.isOwner) {
      return;
    }

    if (collaborationPassword.trim().length !== 4) {
      toast.error("Set a 4-digit collaboration password first");
      return;
    }

    await enableCollaborationAction(token, selectedDocument);
  }

  async function handleDisableCollaboration() {
    if (!token || !selectedDocument || !selectedDocument.isOwner) {
      return;
    }

    await disableCollaborationAction(token, selectedDocument);
  }

  async function handleRestoreVersion(versionId: string) {
    if (!token || !selectedDocument) {
      return;
    }

    await restoreVersionAction(token, selectedDocument, versionId);
  }

  async function handleSaveVersion() {
    if (!token || !selectedDocument) {
      return;
    }

    await saveVersionAction(token, selectedDocument);
  }

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <DocumentSidebar
          documents={displayedDocuments}
          isLoadingList={isLoadingList}
          isMutating={isMutating}
          listError={listError}
          onChangeViewMode={setViewMode}
          onCreateDocument={handleCreateDocument}
          onLogout={logout}
          onSelectDocument={setSelectedId}
          selectedId={selectedId}
          userName={user?.name}
          viewMode={viewMode}
        />

        <DocumentDetailPanel
          collaborationPassword={collaborationPassword}
          collaborationReadOnly={collaborationReadOnly}
          detailError={detailError}
          isLoadingDetail={isLoadingDetail}
          isLoadingVersions={isLoadingVersions}
          isSavingVersion={isSavingVersion}
          isMutating={isMutating}
          isRestoringVersion={isRestoringVersion}
          isSavingTitle={isSavingTitle}
          isUpdatingCollaboration={isUpdatingCollaboration}
          onCollaborationPasswordChange={setCollaborationPassword}
          onCollaborationReadOnlyChange={setCollaborationReadOnly}
          onCopyShareLink={handleCopyShareLink}
          onDeleteDocument={handleDeleteDocument}
          onDisableCollaboration={handleDisableCollaboration}
          onEnableCollaboration={handleEnableCollaboration}
          onPresenceChange={setPresentUsers}
          onRenameDocument={handleRenameDocument}
          onRenameValueChange={setRenameValue}
          onRestoreDocument={handleRestoreDocument}
          onSaveVersion={handleSaveVersion}
          onRestoreVersion={handleRestoreVersion}
          onSyncStateChange={setSyncState}
          passwordSlots={passwordSlots}
          presentUsers={presentUsers}
          renameValue={renameValue}
          restoringVersionId={restoringVersionId}
          editorRestoreContent={editorRestoreContent}
          editorRestoreNonce={editorRestoreNonce}
          selectedDocument={displayedSelectedDocument}
          selectedId={selectedId}
          syncState={syncState}
          token={token ?? ""}
          user={user!}
          versions={versions}
          viewMode={viewMode}
        />
      </div>

      <ShareJoinDialog
        isJoining={isJoining}
        joinPassword={joinPassword}
        onJoinPasswordChange={setJoinPassword}
        onOpenChange={(open) => {
          if (!open) {
            navigate("/app", { replace: true });
          }
        }}
        onSubmit={handleJoinSharedDocument}
        open={Boolean(shareDocumentId)}
        passwordSlots={passwordSlots}
      />
    </main>
  );
}
