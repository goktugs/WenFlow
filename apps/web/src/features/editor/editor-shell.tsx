import { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";

type SlashCommand = {
  id: "paragraph" | "heading" | "bullet" | "code";
  label: string;
  description: string;
  keywords: string[];
  run: () => void;
};

type EditorShellProps = {
  documentId: string;
  initialContent: unknown;
};

type SlashState = {
  query: string;
  range: { from: number; to: number };
};

export function EditorShell({ documentId, initialContent }: EditorShellProps) {
  const [slashState, setSlashState] = useState<SlashState | null>(null);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2]
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
      content: isTiptapDocument(initialContent)
        ? initialContent
        : {
            type: "doc",
            content: [
              {
                type: "paragraph"
              }
            ]
          },
      onSelectionUpdate: ({ editor: currentEditor }) => {
        setSlashState(getSlashState(currentEditor));
      },
      onUpdate: ({ editor: currentEditor }) => {
        setSlashState(getSlashState(currentEditor));
      }
    },
    [documentId]
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextContent = isTiptapDocument(initialContent)
      ? initialContent
      : {
          type: "doc",
          content: [
            {
              type: "paragraph"
            }
          ]
        };

    editor.commands.setContent(nextContent);
    setSlashState(null);
  }, [documentId, editor, initialContent]);

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

function isTiptapDocument(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      (value as { type?: unknown }).type === "doc"
  );
}
