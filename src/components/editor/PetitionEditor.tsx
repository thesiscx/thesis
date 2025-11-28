import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ResizableImage } from './extensions/ResizableImage';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import { FontSize } from './extensions/FontSize';
import { Citation } from './extensions/Citation';
import { EditorToolbar } from './EditorToolbar';
import './EditorStyles.css';
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TocItem {
  id: string;
  label: string;
  level: number;
}

interface PetitionEditorProps {
  content: any;
  onContentChange: (content: any) => void;
  onTocChange: (toc: TocItem[]) => void;
}

export const PetitionEditor = ({ content, onContentChange, onTocChange }: PetitionEditorProps) => {
  const isInitialMount = useRef(true);
  const editorContainerRef = useRef<HTMLDivElement>(null);

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
      const filePath = `petition-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('editor_images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('editor_images')
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
          levels: [1, 2, 3],
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
        placeholder: 'Start writing your petition content here...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Citation,
    ],
    content: content || '',
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
      onContentChange(json);
      
      const headings = extractHeadings(editor);
      onTocChange(headings);
    },
  });

  useEffect(() => {
    if (editor && content && isInitialMount.current) {
      isInitialMount.current = false;
      editor.commands.setContent(content);
      
      const headings = extractHeadings(editor);
      onTocChange(headings);
    }
  }, [editor, content, extractHeadings, onTocChange]);

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

  return (
    <div 
      className="flex flex-col h-full overflow-y-auto"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="sticky top-0 z-40 bg-background">
        <EditorToolbar editor={editor} />
      </div>
      <div className="flex-1 px-16 py-12 bg-background">
        <div className="max-w-4xl mx-auto">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};
