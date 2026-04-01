import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DocumentListItem } from "./document.types";
import type { ViewMode } from "./document.store";

type DocumentSidebarProps = {
  userName?: string;
  viewMode: ViewMode;
  documents: DocumentListItem[];
  selectedId: string | null;
  isLoadingList: boolean;
  isMutating: boolean;
  listError: string | null;
  onLogout: () => void;
  onCreateDocument: () => void;
  onSelectDocument: (id: string) => void;
  onChangeViewMode: (mode: ViewMode) => void;
};

export function DocumentSidebar({
  userName,
  viewMode,
  documents,
  selectedId,
  isLoadingList,
  isMutating,
  listError,
  onLogout,
  onCreateDocument,
  onSelectDocument,
  onChangeViewMode
}: DocumentSidebarProps) {
  const filteredDocuments = documents.filter((document) => {
    if (viewMode === "trash") {
      return document.isOwner;
    }

    if (viewMode === "shared") {
      return !document.isOwner;
    }

    return document.isOwner;
  });

  return (
    <aside className="flex flex-col rounded-3xl border border-border bg-card/95 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="space-y-3 border-b border-border pb-3">
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              WenFlow
            </p>
            <h1 className="mt-2 text-[15px] font-semibold leading-snug">
              {userName}'s workspace
            </h1>
          </div>

          <Button className="w-full" onClick={onLogout} size="sm" variant="outline">
            Sign out
          </Button>
        </div>

        <Button
          className="w-full justify-start"
          disabled={isMutating}
          onClick={onCreateDocument}
        >
          New document
        </Button>

        <div className="space-y-2 rounded-2xl border border-border bg-background/50 p-2.5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Shared access
          </p>
          <p className="text-xs text-muted-foreground">
            Open a share link to join a shared document. If the link is valid, a
            password dialog will appear automatically.
          </p>
        </div>

        <Tabs value={viewMode} onValueChange={(value) => onChangeViewMode(value as ViewMode)}>
          <TabsList>
            <TabsTrigger className="px-2 text-xs" value="my-docs">
              My Docs
            </TabsTrigger>
            <TabsTrigger className="px-2 text-xs" value="shared">
              Shared
            </TabsTrigger>
            <TabsTrigger className="px-2 text-xs" value="trash">
              Trash
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto">
        {isLoadingList ? (
          <div className="flex flex-col items-center justify-center gap-3 px-2 py-10 text-sm text-muted-foreground">
            <Spinner className="size-7" />
            <p>Loading documents...</p>
          </div>
        ) : listError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-6 text-sm text-destructive">
            {listError}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            {viewMode === "my-docs"
              ? "You haven't created any documents yet."
              : viewMode === "shared"
                ? "No documents have been shared with you yet."
                : "Trash is empty."}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredDocuments.map((document) => (
              <button
                key={document.id}
                className={`w-full rounded-2xl border px-3 py-2.5 text-left transition ${
                  selectedId === document.id
                    ? "border-primary/30 bg-primary/10 text-foreground"
                    : "border-transparent bg-background/50 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
                onClick={() => onSelectDocument(document.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate text-sm font-medium">{document.title}</p>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]">
                    {document.isOwner ? "Mine" : "Shared"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {document.isOwner ? "Owner" : `Owner: ${document.owner.name}`}
                  {document.isCollaborationEnabled
                    ? document.isCollaborationReadOnly
                      ? " · Read-only share"
                      : " · Live collaboration"
                    : ""}
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
  );
}
