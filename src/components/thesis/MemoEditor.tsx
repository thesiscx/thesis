import { useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import ShareButton from "@/components/thesis/ShareButton";
import { Json } from "@/integrations/supabase/types";
import "@/components/editor/EditorStyles.css";

interface TocItem {
  id: string;
  label: string;
  level: number;
}

interface MemoEditorProps {
  content?: Json;
  onChange: (content: Json, tocItems: TocItem[]) => void;
  roundSlug?: string;
  variantSlug?: string;
}

export default function MemoEditor({
  content,
  onChange,
  roundSlug,
  variantSlug,
}: MemoEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: "Start writing your memo...",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: content as any,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const tocItems = extractTocItems(editor.getHTML());
      onChange(json as Json, tocItems);
    },
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none focus:outline-none min-h-[calc(100vh-12rem)] px-16 py-8",
      },
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content as any);
    }
  }, [editor, content]);

  const extractTocItems = useCallback((html: string): TocItem[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const headings = doc.querySelectorAll("h1");
    
    return Array.from(headings).map((heading, index) => ({
      id: `h1-${index}`,
      label: heading.textContent || `Section ${index + 1}`,
      level: 1,
    }));
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-2">
          <EditorToolbar editor={editor} />
          <ShareButton roundSlug={roundSlug} variantSlug={variantSlug} />
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
