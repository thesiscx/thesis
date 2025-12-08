import { useState, useEffect } from "react";
import { Loader2, History, TrendingUp, Users, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useQuery } from "@tanstack/react-query";
import { subDays, format } from "date-fns";

interface RecapCardProps {
  roundId?: string;
}

export function RecapCard({ roundId }: RecapCardProps) {
  const { user } = useFounderAuth();
  const [recapContent, setRecapContent] = useState<{
    summary: string;
    highlights: string[];
    stats: { label: string; value: string }[];
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch last week's activity
  const { data: weeklyActivity = [] } = useQuery({
    queryKey: ["weekly-activity", user?.id, roundId],
    queryFn: async () => {
      if (!user?.id) return [];
      const weekAgo = subDays(new Date(), 7).toISOString();
      
      let query = supabase
        .from("activity_logs")
        .select("*")
        .eq("workspace_id", user.id)
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: false });
      
      if (roundId) {
        query = query.eq("round_id", roundId);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Generate recap from activity
  useEffect(() => {
    const generateRecap = async () => {
      if (!user?.id) return;

      setIsGenerating(true);

      // Calculate stats from activity
      const stats = {
        docketsCreated: weeklyActivity.filter(a => a.action_type === "docket_created").length,
        investorsAdded: weeklyActivity.filter(a => a.action_type === "investor_added").length,
        memoUpdates: weeklyActivity.filter(a => a.action_type === "memo_updated").length,
        signed: weeklyActivity.filter(a => a.action_type === "investor_signed").length,
      };

      if (weeklyActivity.length === 0) {
        setRecapContent({
          summary: "No activity recorded this week. Start by adding investors to your pipeline.",
          highlights: [],
          stats: [
            { label: "Investors Added", value: "0" },
            { label: "Dockets Created", value: "0" },
            { label: "Memo Updates", value: "0" },
          ],
        });
        setIsGenerating(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("circuit-chat", {
          body: {
            messages: [
              {
                role: "user",
                content: `Summarize my fundraising activity from the past week:
                
Activity breakdown:
- Dockets created: ${stats.docketsCreated}
- Investors added: ${stats.investorsAdded}
- Memo updates: ${stats.memoUpdates}
- Investors signed: ${stats.signed}
- Total activities: ${weeklyActivity.length}

Please respond with JSON in this exact format:
{
  "summary": "One sentence summary of the week's progress",
  "highlights": ["2-3 key accomplishments or notable events"]
}

Keep it brief and encouraging.`
              }
            ],
          },
        });

        if (error) throw error;

        const content = data?.content || data?.message;
        if (content) {
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              setRecapContent({
                ...parsed,
                stats: [
                  { label: "Investors Added", value: stats.investorsAdded.toString() },
                  { label: "Dockets Created", value: stats.docketsCreated.toString() },
                  { label: "Signed", value: stats.signed.toString() },
                ],
              });
            } else {
              throw new Error("No JSON found");
            }
          } catch {
            // Fallback
            setRecapContent({
              summary: `${weeklyActivity.length} activities recorded this week.`,
              highlights: stats.docketsCreated > 0 
                ? [`Created ${stats.docketsCreated} dockets`] 
                : ["Keep building momentum with your investors"],
              stats: [
                { label: "Investors Added", value: stats.investorsAdded.toString() },
                { label: "Dockets Created", value: stats.docketsCreated.toString() },
                { label: "Signed", value: stats.signed.toString() },
              ],
            });
          }
        }
      } catch (err) {
        console.error("Failed to generate recap:", err);
        setRecapContent({
          summary: `${weeklyActivity.length} activities recorded this week.`,
          highlights: [],
          stats: [
            { label: "Investors Added", value: stats.investorsAdded.toString() },
            { label: "Dockets Created", value: stats.docketsCreated.toString() },
            { label: "Signed", value: stats.signed.toString() },
          ],
        });
      } finally {
        setIsGenerating(false);
      }
    };

    generateRecap();
  }, [user?.id, weeklyActivity.length, roundId]);

  if (isGenerating && !recapContent) {
    return (
      <div className="rounded-xl border border-border bg-transparent p-6">
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Generating recap...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-transparent overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <History className="w-4 h-4 text-foreground" />
        <span className="text-sm font-medium">Weekly Recap</span>
      </div>
      
      <div className="p-4 space-y-4">
        {recapContent && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {recapContent.stats.map((stat, i) => (
                <div key={i} className="text-center p-2 rounded-lg bg-transparent border border-border">
                  <p className="text-lg font-semibold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Summary */}
            <p className="text-sm text-foreground">{recapContent.summary}</p>

            {/* Highlights */}
            {recapContent.highlights.length > 0 && (
              <div className="space-y-1.5">
                {recapContent.highlights.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
