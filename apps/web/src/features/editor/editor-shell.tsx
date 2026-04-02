import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import StarterKit from "@tiptap/starter-kit";
import { Spinner } from "@/components/ui/spinner";
import { env } from "@/lib/env";

type SlashCommand = {
  id: "paragraph" | "heading" | "bullet" | "code";
  label: string;
  description: string;
  keywords: string[];
  run: () => void;
};

type EditorShellProps = {
  documentId: string;
  restoredContent: unknown | null;
  restoreNonce: number;
  versionSaveNonce: number;
  isReadOnly: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  syncState: "connecting" | "connected" | "disconnected" | "error";
  onSyncStateChange: (
    nextState: "connecting" | "connected" | "disconnected" | "error"
  ) => void;
  onPresenceChange: (
    users: Array<{
      id: string;
      label: string;
      color: string;
      status: "viewing" | "editing";
    }>
  ) => void;
  onVersionSaved: () => void;
};

type SlashState = {
  query: string;
  range: { from: number; to: number };
  anchor: { top: number; left: number; maxHeight: number };
};

export function EditorShell({
  documentId,
  restoredContent,
  restoreNonce,
  versionSaveNonce,
  isReadOnly,
  token,
  user,
  syncState,
  onSyncStateChange,
  onPresenceChange,
  onVersionSaved
}: EditorShellProps) {
  const [slashState, setSlashState] = useState<SlashState | null>(null);
  const [restartNonce, setRestartNonce] = useState(0);
  const localUserColor = useMemo(() => getUserColor(user.id), [user.id]);
  const editorWrapperRef = useRef<HTMLDivElement | null>(null);
  const lastAppliedRestoreNonceRef = useRef(restoreNonce);
  const lastAppliedVersionSaveNonceRef = useRef(versionSaveNonce);

  const buildPresenceUsers = (
    awarenessStates: Map<number, { user?: unknown }>
  ) => {
    const users = Array.from(awarenessStates.values())
      .map(
        (state) =>
          state.user as
            | {
                id?: string;
                label?: string;
                name?: string;
                color?: string;
                status?: "viewing" | "editing";
              }
            | undefined
      )
      .filter(
        (
          awarenessUser
        ): awarenessUser is {
          id: string;
          label?: string;
          name?: string;
          color: string;
          status?: "viewing" | "editing";
        } =>
          Boolean(
            awarenessUser?.id &&
              (awarenessUser.label || awarenessUser.name) &&
              awarenessUser.color
          )
      );

    return Array.from(
      new Map(
        users.map((awarenessUser) => [
          awarenessUser.id,
          {
            id: awarenessUser.id,
            label: awarenessUser.label ?? awarenessUser.name ?? "Guest",
            color: awarenessUser.color,
            status: awarenessUser.status ?? "viewing"
          }
        ])
      ).values()
    );
  };

  const resources = useMemo(() => {
    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: env.collabUrl,
      name: documentId,
      document: ydoc,
      token,
      onOpen() {
        onSyncStateChange("connecting");
      },
      onConnect() {
        onSyncStateChange("connecting");
      },
      onSynced() {
        onSyncStateChange("connected");
      },
      onDisconnect() {
        onSyncStateChange("disconnected");
      },
      onClose({ event }) {
        onSyncStateChange("disconnected");
        if (typeof event?.code === "number" && event.code === 1012) {
          setRestartNonce((n) => n + 1);
        }
      },
      onAuthenticationFailed() {
        onSyncStateChange("error");
      }
    });

    const awareness = provider.awareness;

    if (!awareness) {
      return { ydoc, provider };
    }

    awareness.setLocalStateField("user", {
      id: user.id,
      name: user.name || user.email.split("@")[0],
      label: user.name || user.email.split("@")[0],
      color: localUserColor,
      status: "viewing"
    });

    return { ydoc, provider };
  }, [documentId, localUserColor, onSyncStateChange, restartNonce, token, user.email, user.id, user.name]);

  useEffect(() => {
    const awareness = resources.provider.awareness;

    if (!awareness) {
      return;
    }

    const handleAwarenessChange = () => {
      onPresenceChange(buildPresenceUsers(awareness.getStates() as Map<number, { user?: unknown }>));
    };

    awareness.on("change", handleAwarenessChange);
    handleAwarenessChange();

    return () => {
      awareness.off("change", handleAwarenessChange);
    };
  }, [onPresenceChange, resources.provider.awareness]);

  useEffect(() => {
    return () => {
      onPresenceChange([]);
      resources.provider.destroy();
      resources.ydoc.destroy();
    };
  }, [onPresenceChange, resources]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          history: false,
          heading: {
            levels: [1, 2]
          }
        }),
        Collaboration.configure({
          document: resources.ydoc
        }),
        CollaborationCursor.configure({
          provider: resources.provider,
          user: {
            id: user.id,
            name: user.name || user.email.split("@")[0],
            color: localUserColor
          }
        }),
        Placeholder.configure({
          placeholder:
            'Type "/" for commands, or start writing your document here...'
        })
      ],
      editable: !isReadOnly,
      editorProps: {
        attributes: {
          class:
            "min-h-[420px] rounded-2xl border border-border bg-background/70 px-5 py-4 text-[15px] leading-7 text-foreground outline-none",
          style: `caret-color: ${localUserColor};`
        },
        handleDOMEvents: {
          focus: () => {
            resources.provider.awareness?.setLocalStateField("user", {
              id: user.id,
              name: user.name || user.email.split("@")[0],
              label: user.name || user.email.split("@")[0],
              color: localUserColor,
              status: isReadOnly ? "viewing" : "editing"
            });

            return false;
          },
          blur: () => {
            resources.provider.awareness?.setLocalStateField("user", {
              id: user.id,
              name: user.name || user.email.split("@")[0],
              label: user.name || user.email.split("@")[0],
              color: localUserColor,
              status: "viewing"
            });

            return false;
          }
        }
      },
      onSelectionUpdate: ({ editor: currentEditor }) => {
        if (isReadOnly) {
          setSlashState(null);
          return;
        }
        setSlashState(getSlashState(currentEditor, editorWrapperRef.current));
      },
      onUpdate: ({ editor: currentEditor }) => {
        if (isReadOnly) {
          setSlashState(null);
          return;
        }
        setSlashState(getSlashState(currentEditor, editorWrapperRef.current));
      }
    },
    [documentId, isReadOnly, localUserColor, resources, user.email, user.id, user.name]
  );

  useEffect(() => {
    if (!editor) {
      return;
    }
    setSlashState(null);
  }, [documentId, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!isReadOnly);
    if (isReadOnly) {
      setSlashState(null);
    }
  }, [editor, isReadOnly]);

  useEffect(() => {
    if (!editor || restoreNonce === 0) {
      return;
    }

    if (lastAppliedRestoreNonceRef.current === restoreNonce) {
      return;
    }

    lastAppliedRestoreNonceRef.current = restoreNonce;
    editor.commands.setContent(normalizeEditorContent(restoredContent), true);
    setSlashState(null);
  }, [editor, restoreNonce, restoredContent]);

  // Bug fix: listen for "version-saved" broadcasts from other collaborators
  useEffect(() => {
    const provider = resources.provider;
    const handleStateless = ({ payload }: { payload: string }) => {
      if (payload === "version-saved") {
        onVersionSaved();
      }
    };
    provider.on("stateless", handleStateless);
    return () => {
      provider.off("stateless", handleStateless);
    };
  }, [resources.provider, onVersionSaved]);

  // Bug fix: broadcast "version-saved" to collaborators when a save completes
  useEffect(() => {
    if (lastAppliedVersionSaveNonceRef.current === versionSaveNonce) {
      return;
    }
    lastAppliedVersionSaveNonceRef.current = versionSaveNonce;
    resources.provider.sendStateless("version-saved");
  }, [versionSaveNonce, resources.provider]);

  const commands = useMemo<SlashCommand[]>(() => {
    if (!editor || !slashState) {
      return [];
    }

    const allCommands: SlashCommand[] = [
      {
        id: "paragraph",
        label: "/paragraph",
        description: "Start writing in a normal paragraph.",
        keywords: ["paragraph", "text", "normal"],
        run: () => {
          replaceSlashQuery(editor, slashState.range);
          editor.chain().focus().setParagraph().run();
        }
      },
      {
        id: "heading",
        label: "/heading",
        description: "Turn this block into a heading.",
        keywords: ["heading", "title", "h1"],
        run: () => {
          replaceSlashQuery(editor, slashState.range);
          editor.chain().focus().toggleHeading({ level: 1 }).run();
        }
      },
      {
        id: "bullet",
        label: "/bullet",
        description: "Create a bullet list.",
        keywords: ["bullet", "list", "ul"],
        run: () => {
          replaceSlashQuery(editor, slashState.range);
          editor.chain().focus().toggleBulletList().run();
        }
      },
      {
        id: "code",
        label: "/code",
        description: "Insert a code block.",
        keywords: ["code", "snippet", "block"],
        run: () => {
          replaceSlashQuery(editor, slashState.range);
          editor.chain().focus().toggleCodeBlock().run();
        }
      }
    ];

    return allCommands.filter((command) => {
      const query = slashState.query.trim().toLowerCase();

      if (!query) {
        return true;
      }

      return [command.label, command.description, ...command.keywords].some((value) =>
        value.toLowerCase().includes(query)
      );
    });
  }, [editor, slashState]);

  if (!editor) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-background/40 text-sm text-muted-foreground">
        <Spinner className="size-8" />
        Loading editor...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Editor
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isReadOnly
              ? "Read-only access. Editing is disabled for this shared link."
              : "Slash commands: `/heading`, `/bullet`, `/code`"}
          </p>
        </div>
        <div className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
          {syncState === "connecting"
            ? "Syncing..."
            : syncState === "connected"
              ? "Live"
              : syncState === "error"
                ? "Connection failed"
                : "Offline"}
        </div>
      </div>

      <div className="relative" ref={editorWrapperRef}>
        {slashState && commands.length > 0 ? (
          <div
            className="absolute z-20 w-[280px] max-w-[calc(100vw-4rem)] overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-[0_18px_50px_rgba(0,0,0,0.24)]"
            style={{
              top: slashState.anchor.top,
              left: slashState.anchor.left,
              maxHeight: slashState.anchor.maxHeight
            }}
          >
            <div className="mb-2 px-2 pt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Slash commands
            </div>
            <div className="grid gap-1">
              {commands.map((command) => (
                <button
                  key={command.id}
                  className="rounded-xl px-3 py-2 text-left transition hover:bg-background/80"
                  onClick={command.run}
                  type="button"
                >
                  <p className="text-sm font-medium text-foreground">{command.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {command.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function getUserColor(userId: string) {
  const palette = [
    "#FF6B6B",
    "#4D96FF",
    "#6BCB77",
    "#FFD93D",
    "#C77DFF",
    "#FF8E3C",
    "#2EC4B6",
    "#F06595",
    "#90BE6D",
    "#00B4D8"
  ];

  let hash = 0;

  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0;
  }

  return palette[hash % palette.length];
}

function getSlashState(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  wrapperElement: HTMLDivElement | null
): SlashState | null {
  const { $from } = editor.state.selection;
  const textBeforeCursor = $from.parent.textBetween(0, $from.parentOffset, "\n", "\n");
  const textAfterCursor = $from.parent.textBetween(
    $from.parentOffset,
    $from.parent.content.size,
    "\n",
    "\n"
  );
  const match = textBeforeCursor.match(/(?:^|\s)\/([a-z-]*)$/i);

  if (!match) {
    return null;
  }

  if (textAfterCursor.trim().length > 0) {
    return null;
  }

  const slashIndex = textBeforeCursor.lastIndexOf(`/${match[1] ?? ""}`);

  if (slashIndex < 0) {
    return null;
  }

  const from = $from.start() + slashIndex;
  const cursorCoords = editor.view.coordsAtPos($from.pos);
  const wrapperBounds =
    wrapperElement?.getBoundingClientRect() ?? editor.view.dom.getBoundingClientRect();
  const popupWidth = 280;
  const popupMargin = 12;
  const popupVerticalOffset = 8;
  const estimatedPopupHeight = 260;
  const viewportHeight = window.innerHeight;
  const left = Math.min(
    Math.max(cursorCoords.left - wrapperBounds.left, popupMargin),
    Math.max(wrapperBounds.width - popupWidth - popupMargin, popupMargin)
  );
  const spaceBelow = viewportHeight - cursorCoords.bottom - popupMargin;
  const spaceAbove = cursorCoords.top - popupMargin;
  const shouldOpenAbove =
    spaceBelow < estimatedPopupHeight && spaceAbove > spaceBelow;
  const maxHeight = Math.max(
    Math.min(shouldOpenAbove ? spaceAbove : spaceBelow, 320),
    140
  );
  const top = shouldOpenAbove
    ? Math.max(
        cursorCoords.top -
          wrapperBounds.top -
          Math.min(estimatedPopupHeight, maxHeight) -
          popupVerticalOffset,
        popupMargin
      )
    : cursorCoords.bottom - wrapperBounds.top + popupVerticalOffset;

  return {
    query: match[1] ?? "",
    range: {
      from,
      to: $from.pos
    },
    anchor: {
      top,
      left,
      maxHeight
    }
  };
}

function replaceSlashQuery(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  range: { from: number; to: number }
) {
  editor.chain().focus().deleteRange(range).insertContent("").run();
}

function normalizeEditorContent(content: unknown): JSONContent {
  if (
    content &&
    typeof content === "object" &&
    "type" in content &&
    typeof content.type === "string"
  ) {
    return content as JSONContent;
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
