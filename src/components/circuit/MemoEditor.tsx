import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ResizableImage } from '@/components/circuit/editor/ResizableImage';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import { FontSize } from '@/components/circuit/editor/FontSize';
import { Citation } from '@/components/circuit/editor/Citation';
import { EditorToolbar } from '@/components/circuit/editor/EditorToolbar';
import '@/components/circuit/editor/EditorStyles.css';
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

interface TocItem {
  id: string;
  label: string;
  level: number;
}

interface MemoEditorProps {
  content?: Json;
  onChange: (content: Json, tocItems: TocItem[]) => void;
}

export default function MemoEditor({
  content,
  onChange,
}: MemoEditorProps) {
  const isInitialMount = useRef(true);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const prevContentRef = useRef<string | null>(null);

  // CRITICAL: Reset isInitialMount when content prop changes significantly (new memo loaded)
  useEffect(() => {
    const contentStr = content ? JSON.stringify(content) : null;
    
    // If we had previous content and it's completely different, allow re-initialization
    if (prevContentRef.current !== null && contentStr !== prevContentRef.current) {
      console.log('[MemoEditor] Content changed externally, allowing re-initialization');
      isInitialMount.current = true;
    }
    
    prevContentRef.current = contentStr;
  }, [content]);

  const extractHeadings = useCallback((editor: any) => {
    const headings: TocItem[] = [];
    const doc = editor.state.doc;
    let h1Index = 0;
    
    doc.descendants((node: any) => {
      if (node.type.name === 'heading' && node.attrs.level === 1) {
        const text = node.textContent;
        if (text.trim()) {
          headings.push({
            id: `h1-${h1Index}`,
            label: text,
            level: 1,
          });
          h1Index++;
        }
      }
    });
    
    return headings;
  }, []);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('memo-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('memo-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1], // Only H1 allowed for clean memo structure
        },
      }),
      TextStyle,
      FontSize,
      ResizableImage,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your memo...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Citation,
    ],
    content: (content as any) || '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor min-h-[500px] focus:outline-none',
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            
            uploadImage(file).then((url) => {
              if (url && editor) {
                editor.chain().focus().setImage({ src: url }).run();
              }
            });
            
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event, slice) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
              const file = items[i].getAsFile();
              if (file) {
                event.preventDefault();
                
                uploadImage(file).then((url) => {
                  if (url && editor) {
                    editor.chain().focus().setImage({ src: url }).run();
                  }
                });
                
                return true;
              }
            }
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const headings = extractHeadings(editor);
      onChange(json as Json, headings);
    },
  });

  useEffect(() => {
    if (editor && content && isInitialMount.current) {
      isInitialMount.current = false;
      editor.commands.setContent(content as any);
      
      const headings = extractHeadings(editor);
      onChange(content, headings);
    }
  }, [editor, content, extractHeadings, onChange]);

  // Handle content updates from outside (e.g., version restore)
  useEffect(() => {
    if (editor && content && !isInitialMount.current) {
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = JSON.stringify(content);
      if (currentContent !== newContent) {
        editor.commands.setContent(content as any);
      }
    }
  }, [editor, content]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer?.files?.length > 0) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <div 
      className="flex flex-col h-full overflow-hidden"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="sticky top-0 z-40 bg-background border-b border-border shrink-0">
        <div className="px-4 py-2">
          <EditorToolbar editor={editor} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-16 py-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
