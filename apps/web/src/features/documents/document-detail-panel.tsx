import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { EditorShell } from "@/features/editor/editor-shell";
import type { AuthUser } from "@/features/auth/auth.types";
import type { PresenceUser, SyncState, ViewMode } from "./document.store";
import type { DocumentDetail, DocumentVersion } from "./document.types";

type DocumentDetailPanelProps = {
  viewMode: ViewMode;
  selectedId: string | null;
  selectedDocument: DocumentDetail | null;
  isLoadingDetail: boolean;
  detailError: string | null;
  isMutating: boolean;
  renameValue: string;
  isSavingTitle: boolean;
  collaborationPassword: string;
  collaborationReadOnly: boolean;
  isUpdatingCollaboration: boolean;
  presentUsers: PresenceUser[];
  isLoadingVersions: boolean;
  isSavingVersion: boolean;
  versions: DocumentVersion[];
  isRestoringVersion: boolean;
  restoringVersionId: string | null;
  editorRestoreNonce: number;
  editorRestoreContent: unknown | null;
  syncState: SyncState;
  token: string;
  user: AuthUser;
  passwordSlots: number[];
  onRenameValueChange: (value: string) => void;
  onCollaborationPasswordChange: (value: string) => void;
  onCollaborationReadOnlyChange: (value: boolean) => void;
  onDeleteDocument: () => void;
  onRestoreDocument: () => void;
  onRenameDocument: () => void;
  onCopyShareLink: () => void;
  onEnableCollaboration: () => void;
  onDisableCollaboration: () => void;
  onUpdateShareMode: () => void;
  onSaveVersion: () => void;
  onRestoreVersion: (versionId: string) => void;
  onPresenceChange: (users: PresenceUser[]) => void;
  onSyncStateChange: (state: SyncState) => void;
};

export function DocumentDetailPanel({
  viewMode,
  selectedId,
  selectedDocument,
  isLoadingDetail,
  detailError,
  isMutating,
  renameValue,
  isSavingTitle,
  collaborationPassword,
  collaborationReadOnly,
  isUpdatingCollaboration,
  presentUsers,
  isLoadingVersions,
  isSavingVersion,
  versions,
  isRestoringVersion,
  restoringVersionId,
  editorRestoreNonce,
  editorRestoreContent,
  syncState,
  token,
  user,
  passwordSlots,
  onRenameValueChange,
  onCollaborationPasswordChange,
  onCollaborationReadOnlyChange,
  onDeleteDocument,
  onRestoreDocument,
  onRenameDocument,
  onCopyShareLink,
  onEnableCollaboration,
  onDisableCollaboration,
  onUpdateShareMode,
  onSaveVersion,
  onRestoreVersion,
  onPresenceChange,
  onSyncStateChange
}: DocumentDetailPanelProps) {
  return (
    <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      {!selectedId ? (
        <div className="flex h-full min-h-[60vh] items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
          Select a document to continue.
        </div>
      ) : isLoadingDetail ? (
        <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
          <Spinner className="size-8" />
          Loading document...
        </div>
      ) : detailError ? (
        <div className="flex h-full min-h-[60vh] items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 px-6 text-sm text-destructive">
          {detailError}
        </div>
      ) : selectedDocument ? (
        <div className="flex h-full min-h-[60vh] flex-col gap-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="order-2 min-w-0 xl:order-1">
              {viewMode !== "trash" ? (
                <div className="sticky top-6">
                  <EditorShell
                    documentId={selectedDocument.id}
                    isReadOnly={selectedDocument.isReadOnly}
                    restoredContent={editorRestoreContent}
                    restoreNonce={editorRestoreNonce}
                    onPresenceChange={onPresenceChange}
                    onSyncStateChange={onSyncStateChange}
                    syncState={syncState}
                    token={token}
                    user={{
                      id: user.id,
                      name: user.name,
                      email: user.email
                    }}
                  />
                </div>
              ) : (
                <div className="flex min-h-[70vh] items-center justify-center rounded-2xl border border-dashed border-border bg-background/40 p-10 text-sm text-muted-foreground">
                  Restore this document to continue editing it.
                </div>
              )}
            </div>

            <aside className="order-1 flex min-w-0 flex-col gap-4 xl:order-2">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
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

                    {viewMode !== "trash" && selectedDocument.isOwner ? (
                      <Button
                        disabled={isMutating}
                        onClick={onDeleteDocument}
                        variant="outline"
                      >
                        Move to trash
                      </Button>
                    ) : null}

                    {viewMode === "trash" && selectedDocument.isOwner ? (
                      <Button
                        disabled={isMutating}
                        onClick={onRestoreDocument}
                        variant="outline"
                      >
                        Restore
                      </Button>
                    ) : null}
                  </div>

                  {viewMode !== "trash" && selectedDocument.isOwner ? (
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Input
                        value={renameValue}
                        onChange={(event) => onRenameValueChange(event.target.value)}
                        placeholder="Document title"
                      />
                      <Button disabled={isSavingTitle} onClick={onRenameDocument}>
                        {isSavingTitle ? <Spinner className="size-5" /> : null}
                        {isSavingTitle ? "Saving..." : "Rename"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <MetadataCard
                  label="Created"
                  value={new Date(selectedDocument.createdAt).toLocaleString()}
                />
                <MetadataCard
                  label="Updated"
                  value={new Date(selectedDocument.updatedAt).toLocaleString()}
                />
              </div>

              {viewMode !== "trash" ? (
                <div className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Collaboration
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedDocument.isOwner
                          ? "Turn on shared editing with a password, then send the document link to another user."
                          : "You joined this document through shared editing."}
                      </p>
                    </div>
                    <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">
                      {selectedDocument.isCollaborationEnabled
                        ? selectedDocument.isCollaborationReadOnly
                          ? "Read-only share"
                          : "Shared"
                        : "Private"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {selectedDocument.isOwner ? (
                      <>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            disabled={!selectedDocument.isCollaborationEnabled}
                            onClick={onCopyShareLink}
                            variant="outline"
                          >
                            Copy share link
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="rounded-2xl border border-border bg-card/70 p-3">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  Share mode
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Choose whether collaborators can edit or only view.
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                    collaborationReadOnly
                                      ? "border border-amber-500/30 bg-amber-500/15 text-amber-200"
                                      : "border border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
                                  }`}
                                >
                                  {collaborationReadOnly ? "Read-only" : "Editable"}
                                </span>
                                <Switch
                                  aria-label="Toggle read-only sharing"
                                  checked={collaborationReadOnly}
                                  onCheckedChange={onCollaborationReadOnlyChange}
                                />
                              </div>
                            </div>
                            {selectedDocument.isCollaborationEnabled ? (
                              <div className="mt-3 flex justify-end">
                                <Button
                                  disabled={isUpdatingCollaboration}
                                  onClick={onUpdateShareMode}
                                  size="sm"
                                  variant="outline"
                                >
                                  {isUpdatingCollaboration ? (
                                    <Spinner className="size-4" />
                                  ) : null}
                                  {isUpdatingCollaboration
                                    ? "Updating..."
                                    : "Update share mode"}
                                </Button>
                              </div>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {selectedDocument.isCollaborationEnabled
                              ? "Set a new 4-digit collaboration password"
                              : "Set a 4-digit collaboration password"}
                          </p>
                          <InputOTP
                            maxLength={4}
                            value={collaborationPassword}
                            onChange={onCollaborationPasswordChange}
                            containerClassName="justify-start"
                          >
                            <InputOTPGroup>
                              {passwordSlots.map((slotIndex) => (
                                <InputOTPSlot key={slotIndex} index={slotIndex} />
                              ))}
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            disabled={isUpdatingCollaboration}
                            onClick={onEnableCollaboration}
                          >
                            {isUpdatingCollaboration ? (
                              <Spinner className="size-5" />
                            ) : null}
                            {isUpdatingCollaboration
                              ? "Saving..."
                              : selectedDocument.isCollaborationEnabled
                                ? "Update password"
                                : "Enable collaboration"}
                          </Button>
                          {selectedDocument.isCollaborationEnabled ? (
                            <Button
                              disabled={isUpdatingCollaboration}
                              onClick={onDisableCollaboration}
                              variant="outline"
                            >
                              Disable collaboration
                            </Button>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Owner: {selectedDocument.owner.name} ({selectedDocument.owner.email})
                        </p>
                        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs">
                          <span className="text-muted-foreground">Access</span>
                          <span
                            className={`rounded-full px-2.5 py-1 font-medium ${
                              selectedDocument.isReadOnly
                                ? "border border-amber-500/30 bg-amber-500/15 text-amber-200"
                                : "border border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
                            }`}
                          >
                            {selectedDocument.isReadOnly ? "Read-only" : "Editable"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <PresenceCard presentUsers={presentUsers} />
              <VersionHistoryCard
                isLoadingVersions={isLoadingVersions}
                isSavingVersion={isSavingVersion}
                canSaveVersion={viewMode !== "trash" && !selectedDocument.isReadOnly}
                canRestoreVersion={!selectedDocument.isReadOnly}
                versions={versions}
                onSaveVersion={onSaveVersion}
                isRestoringVersion={isRestoringVersion}
                restoringVersionId={restoringVersionId}
                onRestoreVersion={onRestoreVersion}
              />
            </aside>
          </div>
        </div>
      ) : (
        <div className="flex h-full min-h-[60vh] items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
          Unable to load the selected document.
        </div>
      )}
    </section>
  );
}

function MetadataCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm">{value}</p>
    </div>
  );
}

function PresenceCard({ presentUsers }: { presentUsers: PresenceUser[] }) {
  return (
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
                {presenceUser.label} ·{" "}
                {presenceUser.status === "editing" ? "Editing" : "Viewing"}
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
  );
}

function VersionHistoryCard({
  isLoadingVersions,
  isSavingVersion,
  canSaveVersion,
  canRestoreVersion,
  versions,
  onSaveVersion,
  isRestoringVersion,
  restoringVersionId,
  onRestoreVersion
}: {
  isLoadingVersions: boolean;
  isSavingVersion: boolean;
  canSaveVersion: boolean;
  canRestoreVersion: boolean;
  versions: DocumentVersion[];
  onSaveVersion: () => void;
  isRestoringVersion: boolean;
  restoringVersionId: string | null;
  onRestoreVersion: (versionId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Version history
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Save a version anytime. Live editing also auto-saves a snapshot every 5 minutes.
          </p>
        </div>

        {canSaveVersion ? (
          <Button disabled={isSavingVersion} onClick={onSaveVersion} size="sm">
            {isSavingVersion ? <Spinner className="size-4" /> : null}
            {isSavingVersion ? "Saving..." : "Save version"}
          </Button>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        {isLoadingVersions ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Spinner className="size-6" />
            <p>Loading versions...</p>
          </div>
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
                disabled={isRestoringVersion || !canRestoreVersion}
                onClick={() => onRestoreVersion(version.id)}
                size="sm"
                variant="outline"
              >
                {isRestoringVersion && restoringVersionId === version.id ? (
                  <Spinner className="size-4" />
                ) : null}
                {isRestoringVersion && restoringVersionId === version.id
                  ? "Restoring..."
                  : "Restore"}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
