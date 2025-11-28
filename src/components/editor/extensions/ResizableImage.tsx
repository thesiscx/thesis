import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useState, useCallback, useRef, useEffect } from 'react';

interface ImageAttributes {
  src: string;
  alt?: string;
  title?: string;
  caption?: string;
  width?: number;
  height?: number;
  align?: 'left' | 'center' | 'right';
}

const ResizableImageComponent = ({ node, updateAttributes, selected }: any) => {
  const { src, alt, title, caption, width, align = 'center' } = node.attrs as ImageAttributes;
  const [isResizing, setIsResizing] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState(caption || '');
  const imageRef = useRef<HTMLImageElement>(null);
  const captionInputRef = useRef<HTMLInputElement>(null);
  const startPos = useRef({ x: 0, width: 0 });

  // Sync caption text when node attrs change
  useEffect(() => {
    setCaptionText(caption || '');
  }, [caption]);

  // Focus caption input when editing starts
  useEffect(() => {
    if (isEditingCaption && captionInputRef.current) {
      captionInputRef.current.focus();
    }
  }, [isEditingCaption]);

  const handleMouseDown = useCallback((e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    startPos.current = {
      x: e.clientX,
      width: rect.width,
    };
    
    setIsResizing(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startPos.current.x;
      let newWidth: number;
      
      if (corner.includes('e')) {
        newWidth = Math.max(100, startPos.current.width + deltaX);
      } else {
        newWidth = Math.max(100, startPos.current.width - deltaX);
      }
      
      updateAttributes({ width: Math.round(newWidth) });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [updateAttributes]);

  const handleCaptionSave = useCallback(() => {
    updateAttributes({ caption: captionText });
    setIsEditingCaption(false);
  }, [captionText, updateAttributes]);

  const handleCaptionKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCaptionSave();
    } else if (e.key === 'Escape') {
      setCaptionText(caption || '');
      setIsEditingCaption(false);
    }
  }, [caption, handleCaptionSave]);

  // Determine wrapper styles based on alignment
  const getWrapperStyle = () => {
    const baseStyle: React.CSSProperties = {
      width: width ? `${width}px` : 'auto',
      maxWidth: '100%',
    };

    switch (align) {
      case 'left':
        return { ...baseStyle, marginRight: 'auto' };
      case 'right':
        return { ...baseStyle, marginLeft: 'auto' };
      case 'center':
      default:
        return { ...baseStyle, marginLeft: 'auto', marginRight: 'auto' };
    }
  };

  return (
    <NodeViewWrapper 
      className={`resizable-image-wrapper ${selected ? 'selected' : ''}`}
      data-align={align}
      style={getWrapperStyle()}
    >
      <figure className="resizable-image-figure">
        <div className="resizable-image-container">
          <img
            ref={imageRef}
            src={src}
            alt={alt || ''}
            title={title}
            className={isResizing ? 'resizing' : ''}
            style={{ 
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
            draggable={false}
          />
          {selected && (
            <>
              <div 
                className="resize-handle resize-handle-nw"
                onMouseDown={(e) => handleMouseDown(e, 'nw')}
              />
              <div 
                className="resize-handle resize-handle-ne"
                onMouseDown={(e) => handleMouseDown(e, 'ne')}
              />
              <div 
                className="resize-handle resize-handle-sw"
                onMouseDown={(e) => handleMouseDown(e, 'sw')}
              />
              <div 
                className="resize-handle resize-handle-se"
                onMouseDown={(e) => handleMouseDown(e, 'se')}
              />
            </>
          )}
        </div>
        
        {/* Caption area */}
        <figcaption className="image-caption-container">
          {isEditingCaption ? (
            <input
              ref={captionInputRef}
              type="text"
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              onBlur={handleCaptionSave}
              onKeyDown={handleCaptionKeyDown}
              placeholder="Enter caption (e.g., Figure 1: Description)"
              className="image-caption-input"
            />
          ) : (
            <span
              onClick={() => setIsEditingCaption(true)}
              className={`image-caption-text ${!caption ? 'placeholder' : ''}`}
            >
              {caption || (selected ? 'Click to add caption' : '')}
            </span>
          )}
        </figcaption>
      </figure>
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
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      caption: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      align: {
        default: 'center',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },

  addCommands() {
    return {
      setImage: (options: ImageAttributes) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: ImageAttributes) => ReturnType;
    };
  }
}
