import { Fragment, useState } from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface TipTapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

interface TipTapRendererProps {
  content: { type: string; content?: TipTapNode[] };
}

function CitationMark({ children, tooltip }: { children: React.ReactNode; tooltip: string }) {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="border-b border-dotted border-muted-foreground cursor-help">
          {children}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 text-sm" side="top">
        <p className="text-muted-foreground whitespace-pre-wrap">{tooltip}</p>
      </HoverCardContent>
    </HoverCard>
  );
}

function renderMarks(text: string, marks?: Array<{ type: string; attrs?: Record<string, any> }>) {
  if (!marks || marks.length === 0) return text;

  return marks.reduce((acc: React.ReactNode, mark) => {
    switch (mark.type) {
      case 'bold':
        return <strong>{acc}</strong>;
      case 'italic':
        return <em>{acc}</em>;
      case 'underline':
        return <u>{acc}</u>;
      case 'strike':
        return <s>{acc}</s>;
      case 'link':
        return (
          <a 
            href={mark.attrs?.href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80"
          >
            {acc}
          </a>
        );
      case 'citation':
        return (
          <CitationMark tooltip={mark.attrs?.tooltip || ''}>
            {acc}
          </CitationMark>
        );
      default:
        return acc;
    }
  }, text);
}

// Pre-count all headings to generate consistent IDs
function countHeadings(nodes: TipTapNode[]): number[] {
  const indices: number[] = [];
  let counter = 0;
  
  const traverse = (nodeList: TipTapNode[]) => {
    for (const node of nodeList) {
      if (node.type === 'heading') {
        indices.push(counter++);
      }
      if (node.content) {
        traverse(node.content);
      }
    }
  };
  
  traverse(nodes);
  return indices;
}

interface RenderContext {
  headingIndex: { current: number };
}

function renderNode(node: TipTapNode, index: number, context: RenderContext): React.ReactNode {
  const key = `node-${index}`;
  const textAlign = node.attrs?.textAlign;
  const alignClass = textAlign ? `text-${textAlign}` : '';

  switch (node.type) {
    case 'text':
      return <Fragment key={key}>{renderMarks(node.text || '', node.marks)}</Fragment>;

    case 'paragraph':
      if (!node.content || node.content.length === 0) {
        return <p key={key} className={`min-h-[1.5em] ${alignClass}`}>&nbsp;</p>;
      }
      return (
        <p key={key} className={`mb-4 ${alignClass}`}>
          {node.content?.map((child, i) => renderNode(child, i, context))}
        </p>
      );

    case 'heading':
      const level = node.attrs?.level || 1;
      const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
      const headingClasses: Record<number, string> = {
        1: 'text-3xl font-bold mb-6 mt-8',
        2: 'text-2xl font-semibold mb-4 mt-6',
        3: 'text-xl font-semibold mb-3 mt-5',
        4: 'text-lg font-medium mb-2 mt-4',
        5: 'text-base font-medium mb-2 mt-3',
        6: 'text-sm font-medium mb-2 mt-3',
      };
      
      // Extract text content to check if heading has actual text
      // This must match the logic in Petition.tsx extractHeadingsFromContent
      const headingText = node.content
        ?.filter((n) => n.type === 'text')
        .map((n) => n.text)
        .join('') || '';
      
      // Only assign ID if heading has text content (matches TOC extraction logic)
      const headingId = headingText.trim() ? `heading-${context.headingIndex.current++}` : undefined;
      
      return (
        <HeadingTag 
          key={key} 
          id={headingId}
          data-toc-id={headingId}
          className={`${headingClasses[level] || ''} ${alignClass} scroll-mt-20`}
        >
          {node.content?.map((child, i) => renderNode(child, i, context))}
        </HeadingTag>
      );

    case 'bulletList':
      return (
        <ul key={key} className="list-disc pl-6 mb-4 space-y-1">
          {node.content?.map((child, i) => renderNode(child, i, context))}
        </ul>
      );

    case 'orderedList':
      return (
        <ol key={key} className="list-decimal pl-6 mb-4 space-y-1">
          {node.content?.map((child, i) => renderNode(child, i, context))}
        </ol>
      );

    case 'listItem':
      return (
        <li key={key}>
          {node.content?.map((child, i) => renderNode(child, i, context))}
        </li>
      );

    case 'blockquote':
      return (
        <blockquote key={key} className="border-l-4 border-primary/30 pl-4 italic my-4 text-muted-foreground">
          {node.content?.map((child, i) => renderNode(child, i, context))}
        </blockquote>
      );

    case 'codeBlock':
      return (
        <pre key={key} className="bg-muted p-4 rounded-lg overflow-x-auto mb-4 text-sm">
          <code>
            {node.content?.map((child, i) => renderNode(child, i, context))}
          </code>
        </pre>
      );

    case 'horizontalRule':
      return <hr key={key} className="my-6 border-border" />;

    case 'image':
      const imageWidth = node.attrs?.width;
      const imageAlign = node.attrs?.align || 'center';
      const imageCaption = node.attrs?.caption || node.attrs?.title;
      const imageWrapperStyle: React.CSSProperties = {
        width: imageWidth ? `${imageWidth}px` : 'auto',
        maxWidth: '100%',
        ...(imageAlign === 'left' && { marginRight: 'auto' }),
        ...(imageAlign === 'right' && { marginLeft: 'auto' }),
        ...(imageAlign === 'center' && { marginLeft: 'auto', marginRight: 'auto' }),
      };
      return (
        <figure key={key} className="my-6" style={imageWrapperStyle}>
          <img 
            src={node.attrs?.src} 
            alt={node.attrs?.alt || ''} 
            className="w-full h-auto rounded-lg"
          />
          {imageCaption && (
            <figcaption className="text-sm text-muted-foreground mt-2 text-center italic">
              {imageCaption}
            </figcaption>
          )}
        </figure>
      );

    case 'table':
      return (
        <div key={key} className="overflow-x-auto mb-6">
          <table className="w-full border-collapse border border-border">
            <tbody>
              {node.content?.map((child, i) => renderNode(child, i, context))}
            </tbody>
          </table>
        </div>
      );

    case 'tableRow':
      return (
        <tr key={key}>
          {node.content?.map((child, i) => renderNode(child, i, context))}
        </tr>
      );

    case 'tableCell':
      return (
        <td key={key} className="border border-border p-2">
          {node.content?.map((child, i) => renderNode(child, i, context))}
        </td>
      );

    case 'tableHeader':
      return (
        <th key={key} className="border border-border p-2 bg-muted font-semibold">
          {node.content?.map((child, i) => renderNode(child, i, context))}
        </th>
      );

    case 'hardBreak':
      return <br key={key} />;

    default:
      // For unknown nodes, try to render content if it exists
      if (node.content) {
        return <Fragment key={key}>{node.content.map((child, i) => renderNode(child, i, context))}</Fragment>;
      }
      return null;
  }
}

export default function TipTapRenderer({ content }: TipTapRendererProps) {
  if (!content || !content.content) {
    return null;
  }

  // Create a fresh context for each render with a mutable counter object
  const context: RenderContext = {
    headingIndex: { current: 0 }
  };

  return (
    <div className="prose prose-sm max-w-none">
      {content.content.map((node, index) => renderNode(node, index, context))}
    </div>
  );
}
