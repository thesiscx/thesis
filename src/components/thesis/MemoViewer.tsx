import { Json } from '@/integrations/supabase/types';
import TipTapRenderer from '@/components/thesis/TipTapRenderer';

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
    <div className="h-full overflow-y-auto px-8 py-6 bg-background">
      <div className="max-w-4xl">
        <TipTapRenderer content={content as any} />
      </div>
    </div>
  );
}
