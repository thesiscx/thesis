import { useState, useEffect } from "react";
import { Loader2, Sparkles, Target, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useQuery } from "@tanstack/react-query";
import { StatusLine, StatusState } from "./StatusLine";

interface BulletinCardProps {
  roundId?: string;
}

export function BulletinCard({ roundId }: BulletinCardProps) {
  const { user } = useFounderAuth();
  const [bulletinContent, setBulletinContent] = useState<{
    priorities: string[];
    tasks: string[];
    insights: string[];
  } | null>(null);
  const [status, setStatus] = useState<StatusState>("idle");
  const [error, setError] = useState<string | null>(null);

  // Fetch investors for this round
  const { data: investors = [] } = useQuery({
    queryKey: ["investors", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("investors")
        .select("*")
        .eq("workspace_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch recent activity for context
  const { data: recentActivity = [] } = useQuery({
    queryKey: ["activity-logs", user?.id, roundId],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase
        .from("activity_logs")
        .select("*")
        .eq("workspace_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (roundId) {
        query = query.eq("round_id", roundId);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Generate AI bulletin
  useEffect(() => {
    const generateBulletin = async () => {
      if (!user?.id || investors.length === 0) {
        setBulletinContent({
          priorities: ["Add your first investor to the pipeline"],
          tasks: ["Set up your investor memo", "Configure deal terms"],
          insights: ["Get started by adding investors you're in contact with"],
        });
        return;
      }

      setStatus("loading");
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke("circuit-chat", {
          body: {
            messages: [
              {
                role: "user",
                content: `Based on my investor pipeline data, give me a brief bulletin:
                
Investors in pipeline: ${investors.map(i => i.name).join(", ")}
Recent activity count: ${recentActivity.length}

Please respond with JSON in this exact format:
{
  "priorities": ["top 2-3 investors to focus on with brief reason"],
  "tasks": ["2-3 key tasks to do today"],
  "insights": ["1-2 brief strategic insights"]
}

Keep each item under 15 words. Be specific and actionable.`
              }
            ],
          },
        });

        if (fnError) throw fnError;

        const content = data?.content || data?.message;
        if (content) {
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              setBulletinContent(parsed);
              setStatus("success");
              setTimeout(() => setStatus("idle"), 2000);
            } else {
              throw new Error("No JSON found");
            }
          } catch {
            setBulletinContent({
              priorities: investors.slice(0, 3).map(i => `Follow up with ${i.name}`),
              tasks: ["Review your investor pipeline", "Update memo content"],
              insights: [`You have ${investors.length} investors in your pipeline`],
            });
            setStatus("idle");
          }
        }
      } catch (err) {
        console.error("Failed to generate bulletin:", err);
        setError("Failed to generate bulletin");
        setStatus("error");
        setBulletinContent({
          priorities: investors.slice(0, 3).map(i => `Follow up with ${i.name}`),
          tasks: ["Review your investor pipeline", "Update memo content"],
          insights: [`You have ${investors.length} investors in your pipeline`],
        });
        setTimeout(() => setStatus("idle"), 3000);
      }
    };

    generateBulletin();
  }, [user?.id, investors.length, recentActivity.length, roundId]);

  if (status === "loading" && !bulletinContent) {
    return (
      <>
        <div className="rounded-xl border border-border bg-secondary/50 p-6">
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Generating bulletin...</span>
          </div>
        </div>
        <StatusLine status="loading" idleText="" loadingText="Generating bulletin..." />
      </>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium">Daily Bulletin</span>
        </div>
        
        <div className="p-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}

          {bulletinContent && (
            <>
              {/* Priorities */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Target className="w-3.5 h-3.5" />
                  <span className="font-medium">Priority Investors</span>
                </div>
                <ul className="space-y-1.5">
                  {bulletinContent.priorities.map((item, i) => (
                    <li key={i} className="text-sm pl-5 relative before:content-['•'] before:absolute before:left-1.5 before:text-muted-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="font-medium">Today's Tasks</span>
                </div>
                <ul className="space-y-1.5">
                  {bulletinContent.tasks.map((item, i) => (
                    <li key={i} className="text-sm pl-5 relative before:content-['•'] before:absolute before:left-1.5 before:text-muted-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Insights */}
              {bulletinContent.insights.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground italic">
                    {bulletinContent.insights[0]}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Status Line - Outside Card */}
      <StatusLine 
        status={status}
        idleText="Updated just now"
        loadingText="Generating bulletin..."
        successText="Bulletin refreshed"
        errorText="Failed to load bulletin"
      />
    </>
  );
}
