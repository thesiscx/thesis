import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Link,
  Image,
  Table,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Type,
  ImageIcon,
  MessageSquareQuote,
} from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EditorToolbarProps {
  editor: Editor | null;
}

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '30px'];

export const EditorToolbar = ({ editor }: EditorToolbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [citationDialogOpen, setCitationDialogOpen] = useState(false);
  const [citationText, setCitationText] = useState('');

  if (!editor) return null;

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('editor_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('editor_images')
        .getPublicUrl(filePath);

      editor.chain().focus().setImage({ src: publicUrl }).run();

      toast({
        title: 'Image uploaded',
        description: 'Your image has been added to the document.',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const getCurrentFontSize = () => {
    const attrs = editor.getAttributes('textStyle');
    return attrs.fontSize || '16px';
  };

  const setFontSize = (size: string) => {
    (editor.chain().focus() as any).setFontSize(size).run();
  };

  const ToolbarButton = ({
    onClick,
    isActive = false,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`h-8 w-8 p-0 ${isActive ? 'bg-muted' : ''}`}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className="border-b border-border bg-background sticky top-0 z-40 shrink-0">
      <div className="flex flex-wrap items-center gap-1 p-2">
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Font Size */}
        <div className="flex items-center gap-1">
          <Type className="h-4 w-4 text-muted-foreground" />
          <Select value={getCurrentFontSize()} onValueChange={setFontSize}>
            <SelectTrigger className="h-8 w-[70px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size} value={size} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Basic formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align left"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align right"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet list"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Insert */}
        <ToolbarButton onClick={addLink} title="Insert link">
          <Link className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          title="Insert image"
        >
          <Image className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addTable} title="Insert table">
          <Table className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal rule"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            const existingCitation = editor.getAttributes('citation').tooltip;
            setCitationText(existingCitation || '');
            setCitationDialogOpen(true);
          }}
          isActive={editor.isActive('citation')}
          title="Add citation/footnote"
        >
          <MessageSquareQuote className="h-4 w-4" />
        </ToolbarButton>

        {/* Image alignment - only show when image is selected */}
        {editor.isActive('image') && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            <span className="text-xs text-muted-foreground mr-1">Image:</span>
            <ToolbarButton
              onClick={() => editor.chain().focus().updateAttributes('image', { align: 'left' }).run()}
              isActive={editor.getAttributes('image').align === 'left'}
              title="Align image left"
            >
              <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().updateAttributes('image', { align: 'center' }).run()}
              isActive={editor.getAttributes('image').align === 'center' || !editor.getAttributes('image').align}
              title="Align image center"
            >
              <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().updateAttributes('image', { align: 'right' }).run()}
              isActive={editor.getAttributes('image').align === 'right'}
              title="Align image right"
            >
              <AlignRight className="h-4 w-4" />
            </ToolbarButton>
          </>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Citation Dialog */}
      <Dialog open={citationDialogOpen} onOpenChange={setCitationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Citation / Footnote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="citation-text">Citation text (shown on hover)</Label>
              <Textarea
                id="citation-text"
                placeholder="Enter your citation, footnote, or additional details..."
                value={citationText}
                onChange={(e) => setCitationText(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editor.isActive('citation') && (
              <Button
                variant="outline"
                onClick={() => {
                  editor.chain().focus().unsetCitation().run();
                  setCitationDialogOpen(false);
                  setCitationText('');
                }}
              >
                Remove
              </Button>
            )}
            <Button
              onClick={() => {
                if (citationText.trim()) {
                  editor.chain().focus().setCitation({ tooltip: citationText.trim() }).run();
                }
                setCitationDialogOpen(false);
                setCitationText('');
              }}
            >
              {editor.isActive('citation') ? 'Update' : 'Add'} Citation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
