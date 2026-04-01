import { create } from "zustand";
import { toast } from "sonner";
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

export type ViewMode = "my-docs" | "shared" | "trash";
export type SyncState = "connecting" | "connected" | "disconnected" | "error";
export type PresenceUser = {
  id: string;
  label: string;
  color: string;
  status: "viewing" | "editing";
};

type DocumentStoreState = {
  viewMode: ViewMode;
  documents: DocumentListItem[];
  selectedId: string | null;
  selectedDocument: DocumentDetail | null;
  renameValue: string;
  joinPassword: string;
  collaborationPassword: string;
  isLoadingList: boolean;
  isLoadingDetail: boolean;
  isSavingTitle: boolean;
  isMutating: boolean;
  isJoining: boolean;
  isUpdatingCollaboration: boolean;
  listError: string | null;
  detailError: string | null;
  isLoadingVersions: boolean;
  isRestoringVersion: boolean;
  restoringVersionId: string | null;
  syncState: SyncState;
  presentUsers: PresenceUser[];
  versions: DocumentVersion[];
  editorRestoreNonce: number;
  editorRestoreContent: unknown | null;
  setViewMode: (viewMode: ViewMode) => void;
  setSelectedId: (selectedId: string | null) => void;
  setRenameValue: (renameValue: string) => void;
  setJoinPassword: (joinPassword: string) => void;
  setCollaborationPassword: (collaborationPassword: string) => void;
  setSyncState: (syncState: SyncState) => void;
  setPresentUsers: (presentUsers: PresenceUser[]) => void;
  resetSelectionState: () => void;
  syncDocumentInList: (document: DocumentDetail) => void;
  loadDocuments: (
    token: string,
    nextMode: ViewMode,
    shareDocumentId: string | null
  ) => Promise<void>;
  loadSelectedDocument: (token: string, selectedId: string) => Promise<void>;
  loadVersions: (token: string, selectedId: string) => Promise<void>;
  createDocument: (token: string) => Promise<void>;
  joinSharedDocument: (
    token: string,
    shareDocumentId: string,
    navigateToApp: () => void
  ) => Promise<void>;
  renameDocument: (token: string, document: DocumentDetail) => Promise<void>;
  deleteDocument: (
    token: string,
    document: DocumentListItem,
    viewMode: ViewMode,
    reload: (nextMode: ViewMode) => Promise<void>
  ) => Promise<void>;
  restoreDocument: (
    token: string,
    document: DocumentListItem,
    reload: (nextMode: ViewMode) => Promise<void>
  ) => Promise<void>;
  enableCollaboration: (token: string, document: DocumentDetail) => Promise<void>;
  disableCollaboration: (token: string, document: DocumentDetail) => Promise<void>;
  restoreVersion: (token: string, document: DocumentDetail, versionId: string) => Promise<void>;
};

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  viewMode: "my-docs",
  documents: [],
  selectedId: null,
  selectedDocument: null,
  renameValue: "",
  joinPassword: "",
  collaborationPassword: "",
  isLoadingList: true,
  isLoadingDetail: false,
  isSavingTitle: false,
  isMutating: false,
  isJoining: false,
  isUpdatingCollaboration: false,
  listError: null,
  detailError: null,
  isLoadingVersions: false,
  isRestoringVersion: false,
  restoringVersionId: null,
  syncState: "connecting",
  presentUsers: [],
  versions: [],
  editorRestoreNonce: 0,
  editorRestoreContent: null,
  setViewMode(viewMode) {
    set({ viewMode });
  },
  setSelectedId(selectedId) {
    set({ selectedId });
  },
  setRenameValue(renameValue) {
    set({ renameValue });
  },
  setJoinPassword(joinPassword) {
    set({ joinPassword });
  },
  setCollaborationPassword(collaborationPassword) {
    set({ collaborationPassword });
  },
  setSyncState(syncState) {
    set({ syncState });
  },
  setPresentUsers(presentUsers) {
    set({ presentUsers });
  },
  resetSelectionState() {
    set({
      selectedDocument: null,
      renameValue: "",
      collaborationPassword: "",
      detailError: null,
      syncState: "connecting",
      presentUsers: [],
      versions: [],
      restoringVersionId: null,
      editorRestoreNonce: 0,
      editorRestoreContent: null
    });
  },
  syncDocumentInList(nextDocument) {
    set((state) => ({
      documents: state.documents.map((document) =>
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
    }));
  },
  async loadDocuments(token, nextMode, shareDocumentId) {
    set({
      isLoadingList: true,
      listError: null
    });

    try {
      const nextDocuments = await listDocuments(token, nextMode === "trash");

      set((state) => ({
        documents: nextDocuments,
        selectedId:
          nextDocuments.length === 0
            ? null
            : shareDocumentId &&
                nextDocuments.some((document) => document.id === shareDocumentId)
              ? shareDocumentId
              : state.selectedId &&
                  nextDocuments.some((document) => document.id === state.selectedId)
                ? state.selectedId
                : nextDocuments[0].id,
        selectedDocument: nextDocuments.length === 0 ? null : state.selectedDocument,
        renameValue: nextDocuments.length === 0 ? "" : state.renameValue
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load documents";
      toast.error(message);
      set({ listError: message });
    } finally {
      set({ isLoadingList: false });
    }
  },
  async loadSelectedDocument(token, selectedId) {
    set({
      isLoadingDetail: true,
      detailError: null
    });

    try {
      const document = await getDocument(token, selectedId);
      set({
        selectedDocument: document,
        renameValue: document.title,
        collaborationPassword: "",
        syncState: "connecting",
        presentUsers: [],
        editorRestoreNonce: 0,
        editorRestoreContent: null
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load document";
      toast.error(message);
      set({
        detailError: message,
        selectedDocument: null
      });
    } finally {
      set({ isLoadingDetail: false });
    }
  },
  async loadVersions(token, selectedId) {
    set({ isLoadingVersions: true });

    try {
      const versions = await listDocumentVersions(token, selectedId);
      set({ versions });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load versions");
      set({ versions: [] });
    } finally {
      set({ isLoadingVersions: false });
    }
  },
  async createDocument(token) {
    set({ isMutating: true });

    try {
      const document = await createDocument(token);
      toast.success("Document created");
      set({
        viewMode: "my-docs",
        selectedId: document.id
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create document");
    } finally {
      set({ isMutating: false });
    }
  },
  async joinSharedDocument(token, shareDocumentId, navigateToApp) {
    const { joinPassword } = get();

    set({ isJoining: true });

    try {
      const document = await joinSharedDocument(token, shareDocumentId, joinPassword);
      toast.success("Joined shared document");
      set({
        joinPassword: "",
        viewMode: "my-docs",
        selectedId: document.id
      });
      navigateToApp();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to join document");
    } finally {
      set({ isJoining: false });
    }
  },
  async renameDocument(token, document) {
    const { renameValue } = get();

    set({ isSavingTitle: true });

    try {
      const updatedDocument = await renameDocument(token, document.id, renameValue);
      toast.success("Document renamed");
      set({
        selectedDocument: updatedDocument
      });
      get().syncDocumentInList(updatedDocument);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to rename document");
    } finally {
      set({ isSavingTitle: false });
    }
  },
  async deleteDocument(token, document, viewMode, reload) {
    set({ isMutating: true });

    try {
      await deleteDocument(token, document.id);
      toast.success("Moved to trash");
      await reload(viewMode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete document");
    } finally {
      set({ isMutating: false });
    }
  },
  async restoreDocument(token, document, reload) {
    set({ isMutating: true });

    try {
      await restoreDocument(token, document.id);
      toast.success("Document restored");
      await reload("trash");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to restore document");
    } finally {
      set({ isMutating: false });
    }
  },
  async enableCollaboration(token, document) {
    const { collaborationPassword } = get();

    set({ isUpdatingCollaboration: true });

    try {
      const updatedDocument = await updateDocumentCollaboration(token, document.id, {
        enabled: true,
        password: collaborationPassword
      });
      toast.success(
        document.isCollaborationEnabled
          ? "Collaboration password updated"
          : "Shared editing enabled"
      );
      set({
        selectedDocument: updatedDocument,
        collaborationPassword: ""
      });
      get().syncDocumentInList(updatedDocument);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update collaboration"
      );
    } finally {
      set({ isUpdatingCollaboration: false });
    }
  },
  async disableCollaboration(token, document) {
    set({ isUpdatingCollaboration: true });

    try {
      const updatedDocument = await updateDocumentCollaboration(token, document.id, {
        enabled: false
      });
      toast.success("Shared editing disabled");
      set({
        selectedDocument: updatedDocument,
        collaborationPassword: ""
      });
      get().syncDocumentInList(updatedDocument);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update collaboration"
      );
    } finally {
      set({ isUpdatingCollaboration: false });
    }
  },
  async restoreVersion(token, document, versionId) {
    set({
      isRestoringVersion: true,
      restoringVersionId: versionId
    });

    try {
      const restoredDocument = await restoreDocumentVersion(token, document.id, versionId);
      toast.success("Version restored");
      set({
        selectedDocument: restoredDocument,
        renameValue: restoredDocument.title,
        editorRestoreNonce: Date.now(),
        editorRestoreContent: restoredDocument.contentJson ?? null
      });
      get().syncDocumentInList(restoredDocument);
      const nextVersions = await listDocumentVersions(token, restoredDocument.id);
      set({ versions: nextVersions });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to restore version");
    } finally {
      set({
        isRestoringVersion: false,
        restoringVersionId: null
      });
    }
  }
}));
