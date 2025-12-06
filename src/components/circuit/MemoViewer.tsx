import { Json } from '@/integrations/supabase/types';
import TipTapRenderer from '@/components/circuit/TipTapRenderer';

interface MemoViewerProps {
  content?: Json;
}

export default function MemoViewer({ content }: MemoViewerProps) {
  if (!content) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>No memo content yet. Click "Edit" to start drafting.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-16 py-12 bg-background">
      <div className="max-w-4xl mx-auto">
        <TipTapRenderer content={content as any} />
      </div>
    </div>
  );
}
