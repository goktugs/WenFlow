import { useEffect, useMemo, useState } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
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
    users: Array<{ id: string; label: string; color: string }>
  ) => void;
};

type SlashState = {
  query: string;
  range: { from: number; to: number };
};

export function EditorShell({
  documentId,
  token,
  user,
  syncState,
  onSyncStateChange,
  onPresenceChange
}: EditorShellProps) {
  const [slashState, setSlashState] = useState<SlashState | null>(null);
  const localUserColor = useMemo(() => getUserColor(user.id), [user.id]);
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
      onClose() {
        onSyncStateChange("disconnected");
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
      label: user.name || user.email.split("@")[0],
      color: localUserColor
    });

    const handleAwarenessChange = () => {
      const states = Array.from(awareness.getStates().values());
      const users = states
        .map(
          (state) =>
            state.user as
              | { id?: string; label?: string; color?: string }
              | undefined
        )
        .filter(
          (
            awarenessUser
          ): awarenessUser is {
            id: string;
            label: string;
            color: string;
          } =>
            Boolean(
              awarenessUser?.id && awarenessUser.label && awarenessUser.color
            )
        );

      const uniqueUsers = Array.from(
        new Map(users.map((awarenessUser) => [awarenessUser.id, awarenessUser])).values()
      );

      onPresenceChange(uniqueUsers);
    };

    awareness.on("change", handleAwarenessChange);
    handleAwarenessChange();

    return { ydoc, provider };
  }, [documentId, onPresenceChange, onSyncStateChange, token, user.email, user.id, user.name]);

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
      editorProps: {
        attributes: {
          class:
            "min-h-[420px] rounded-2xl border border-border bg-background/70 px-5 py-4 text-[15px] leading-7 text-foreground outline-none"
        }
      },
      onSelectionUpdate: ({ editor: currentEditor }) => {
        setSlashState(getSlashState(currentEditor));
      },
      onUpdate: ({ editor: currentEditor }) => {
        setSlashState(getSlashState(currentEditor));
      }
    },
    [documentId, localUserColor, resources, user.email, user.id, user.name]
  );

  useEffect(() => {
    if (!editor) {
      return;
    }
    setSlashState(null);
  }, [documentId, editor]);

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
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-border bg-background/40 text-sm text-muted-foreground">
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
            Slash commands: `/heading`, `/bullet`, `/code`
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

      {slashState && commands.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-2 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
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

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          size="sm"
          variant="outline"
        >
          Heading
        </Button>
        <Button
          onClick={() => editor.chain().focus().setParagraph().run()}
          size="sm"
          variant="outline"
        >
          Paragraph
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          size="sm"
          variant="outline"
        >
          Bullet List
        </Button>
        <Button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          size="sm"
          variant="outline"
        >
          Code Block
        </Button>
      </div>

      <EditorContent editor={editor} />
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
  editor: NonNullable<ReturnType<typeof useEditor>>
): SlashState | null {
  const { $from } = editor.state.selection;
  const currentLineText = $from.parent.textContent;
  const match = currentLineText.match(/^\/([a-z-]*)$/i);

  if (!match) {
    return null;
  }

  const from = $from.start();

  return {
    query: match[1] ?? "",
    range: {
      from,
      to: from + currentLineText.length
    }
  };
}

function replaceSlashQuery(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  range: { from: number; to: number }
) {
  editor.chain().focus().deleteRange(range).insertContent("").run();
}
