import React from 'react';
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
  content: {
    type: string;
    content?: TipTapNode[];
  };
}

// Citation component with hover card
const CitationMark = ({ children, tooltip }: { children: React.ReactNode; tooltip: string }) => (
  <HoverCard>
    <HoverCardTrigger asChild>
      <span className="citation-mark bg-primary/10 border-b border-dashed border-primary cursor-help">
        {children}
      </span>
    </HoverCardTrigger>
    <HoverCardContent className="w-80 text-sm">
      {tooltip}
    </HoverCardContent>
  </HoverCard>
);

// Render marks (bold, italic, links, citations, etc.)
const renderMarks = (node: TipTapNode): React.ReactNode => {
  if (!node.marks || node.marks.length === 0) {
    return node.text || '';
  }

  let content: React.ReactNode = node.text || '';

  for (const mark of node.marks) {
    switch (mark.type) {
      case 'bold':
        content = <strong key={Math.random()}>{content}</strong>;
        break;
      case 'italic':
        content = <em key={Math.random()}>{content}</em>;
        break;
      case 'code':
        content = <code key={Math.random()} className="bg-muted px-1 py-0.5 rounded text-sm">{content}</code>;
        break;
      case 'link':
        content = (
          <a
            key={Math.random()}
            href={mark.attrs?.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:opacity-80"
          >
            {content}
          </a>
        );
        break;
      case 'citation':
        content = (
          <CitationMark key={Math.random()} tooltip={mark.attrs?.tooltip || ''}>
            {content}
          </CitationMark>
        );
        break;
      case 'textStyle':
        const styles: React.CSSProperties = {};
        if (mark.attrs?.fontSize) styles.fontSize = mark.attrs.fontSize;
        content = <span key={Math.random()} style={styles}>{content}</span>;
        break;
    }
  }

  return content;
};

// Render a single node
const renderNode = (node: TipTapNode, index: number, headingIndex: { current: number }): React.ReactNode => {
  const key = `${node.type}-${index}`;

  switch (node.type) {
    case 'paragraph':
      const align = node.attrs?.textAlign || 'left';
      return (
        <p key={key} className="mb-4 leading-7" style={{ textAlign: align }}>
          {node.content?.map((child, i) => 
            child.type === 'text' ? renderMarks(child) : renderNode(child, i, headingIndex)
          )}
        </p>
      );

    case 'heading':
      const level = node.attrs?.level || 1;
      const headingAlign = node.attrs?.textAlign || 'left';
      const headingId = level === 1 || level === 2 ? `heading-${headingIndex.current++}` : undefined;
      const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
      const headingClasses = {
        1: 'text-3xl font-bold mt-8 mb-4',
        2: 'text-2xl font-semibold mt-6 mb-3',
        3: 'text-xl font-semibold mt-4 mb-2',
      }[level] || 'text-lg font-medium mt-4 mb-2';

      return (
        <HeadingTag key={key} id={headingId} className={headingClasses} style={{ textAlign: headingAlign }}>
          {node.content?.map((child, i) =>
            child.type === 'text' ? renderMarks(child) : renderNode(child, i, headingIndex)
          )}
        </HeadingTag>
      );

    case 'bulletList':
      return (
        <ul key={key} className="list-disc pl-6 mb-4 space-y-1">
          {node.content?.map((child, i) => renderNode(child, i, headingIndex))}
        </ul>
      );

    case 'orderedList':
      return (
        <ol key={key} className="list-decimal pl-6 mb-4 space-y-1">
          {node.content?.map((child, i) => renderNode(child, i, headingIndex))}
        </ol>
      );

    case 'listItem':
      return (
        <li key={key}>
          {node.content?.map((child, i) => renderNode(child, i, headingIndex))}
        </li>
      );

    case 'blockquote':
      return (
        <blockquote key={key} className="border-l-4 border-border pl-4 italic text-muted-foreground my-4">
          {node.content?.map((child, i) => renderNode(child, i, headingIndex))}
        </blockquote>
      );

    case 'codeBlock':
      return (
        <pre key={key} className="bg-muted rounded-lg p-4 overflow-x-auto my-4">
          <code className="text-sm">
            {node.content?.map((child) => child.text).join('')}
          </code>
        </pre>
      );

    case 'image':
      const imgAlign = node.attrs?.align || 'center';
      const imgStyle: React.CSSProperties = {
        width: node.attrs?.width || 'auto',
        maxWidth: '100%',
      };
      if (imgAlign === 'center') imgStyle.margin = '0 auto';
      if (imgAlign === 'right') imgStyle.marginLeft = 'auto';

      return (
        <figure key={key} className="my-4">
          <img
            src={node.attrs?.src}
            alt={node.attrs?.alt || ''}
            style={imgStyle}
            className="block"
          />
          {node.attrs?.caption && (
            <figcaption className="text-center text-sm text-muted-foreground mt-2">
              {node.attrs.caption}
            </figcaption>
          )}
        </figure>
      );

    case 'table':
      return (
        <div key={key} className="overflow-x-auto my-4">
          <table className="w-full border-collapse">
            <tbody>
              {node.content?.map((child, i) => renderNode(child, i, headingIndex))}
            </tbody>
          </table>
        </div>
      );

    case 'tableRow':
      return (
        <tr key={key} className="border-b border-border">
          {node.content?.map((child, i) => renderNode(child, i, headingIndex))}
        </tr>
      );

    case 'tableCell':
      return (
        <td key={key} className="border border-border px-4 py-2">
          {node.content?.map((child, i) => renderNode(child, i, headingIndex))}
        </td>
      );

    case 'tableHeader':
      return (
        <th key={key} className="border border-border px-4 py-2 bg-muted font-semibold text-left">
          {node.content?.map((child, i) => renderNode(child, i, headingIndex))}
        </th>
      );

    case 'horizontalRule':
      return <hr key={key} className="my-6 border-border" />;

    case 'hardBreak':
      return <br key={key} />;

    case 'text':
      return <React.Fragment key={key}>{renderMarks(node)}</React.Fragment>;

    default:
      return null;
  }
};

export default function TipTapRenderer({ content }: TipTapRendererProps) {
  if (!content?.content) {
    return null;
  }

  const headingIndex = { current: 0 };

  return (
    <div className="prose prose-sm max-w-none">
      {content.content.map((node, index) => renderNode(node, index, headingIndex))}
    </div>
  );
}
