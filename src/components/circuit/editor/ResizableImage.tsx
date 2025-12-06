import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useState, useRef, useCallback } from 'react';

export interface ImageAttributes {
  src: string;
  alt?: string;
  caption?: string;
  width?: string;
  height?: string;
  align?: 'left' | 'center' | 'right';
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: ImageAttributes) => ReturnType;
    };
  }
}

const ResizableImageComponent = ({ node, updateAttributes, selected }: any) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const captionRef = useRef<HTMLInputElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = imageRef.current?.offsetWidth || 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      const diff = direction.includes('left') ? startX - e.clientX : e.clientX - startX;
      const newWidth = Math.max(100, startWidth + diff);
      updateAttributes({ width: `${newWidth}px` });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [updateAttributes]);

  const handleCaptionSave = () => {
    if (captionRef.current) {
      updateAttributes({ caption: captionRef.current.value });
    }
    setIsEditingCaption(false);
  };

  const handleCaptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCaptionSave();
    }
    if (e.key === 'Escape') {
      setIsEditingCaption(false);
    }
  };

  const getWrapperStyle = () => {
    const align = node.attrs.align || 'center';
    const baseStyle: React.CSSProperties = {
      width: node.attrs.width || 'auto',
      maxWidth: '100%',
    };
    
    if (align === 'left') return { ...baseStyle, marginRight: 'auto' };
    if (align === 'right') return { ...baseStyle, marginLeft: 'auto' };
    return { ...baseStyle, margin: '0 auto' };
  };

  return (
    <NodeViewWrapper className="resizable-image-wrapper my-4">
      <div 
        className={`resizable-image-container relative inline-block ${selected ? 'ring-2 ring-primary' : ''}`}
        style={getWrapperStyle()}
      >
        <img
          ref={imageRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          className="resizable-image block max-w-full h-auto"
          style={{ width: node.attrs.width || 'auto' }}
          draggable={false}
        />
        
        {selected && !isResizing && (
          <>
            <div
              className="resize-handle resize-handle-left absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full cursor-ew-resize"
              onMouseDown={(e) => handleMouseDown(e, 'left')}
            />
            <div
              className="resize-handle resize-handle-right absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-primary rounded-full cursor-ew-resize"
              onMouseDown={(e) => handleMouseDown(e, 'right')}
            />
          </>
        )}
        
        {(node.attrs.caption || selected) && (
          <div className="image-caption text-center text-sm text-muted-foreground mt-2">
            {isEditingCaption ? (
              <input
                ref={captionRef}
                type="text"
                defaultValue={node.attrs.caption || ''}
                className="w-full text-center bg-transparent border-b border-border focus:outline-none focus:border-primary"
                onBlur={handleCaptionSave}
                onKeyDown={handleCaptionKeyDown}
                autoFocus
              />
            ) : (
              <span 
                onClick={() => selected && setIsEditingCaption(true)}
                className={selected ? 'cursor-text hover:bg-muted/50 px-2 py-1 rounded' : ''}
              >
                {node.attrs.caption || (selected ? 'Add caption...' : '')}
              </span>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const ResizableImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      caption: { default: null },
      width: { default: null },
      height: { default: null },
      align: { default: 'center' },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },

  addCommands() {
    return {
      setImage:
        (options: ImageAttributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});

export default ResizableImage;
