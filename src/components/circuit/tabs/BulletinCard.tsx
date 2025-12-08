import { useMemo } from "react";
import { Sparkles, Target, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useQuery } from "@tanstack/react-query";
import { StatusLine } from "./StatusLine";

interface BulletinCardProps {
  roundId?: string;
}

export function BulletinCard({ roundId }: BulletinCardProps) {
  const { user } = useFounderAuth();

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
    staleTime: 30 * 1000,
  });

  // Derive bulletin content from data - no AI needed
  const bulletinContent = useMemo(() => {
    if (investors.length === 0) {
      return {
        priorities: ["Add your first investor to the pipeline"],
        tasks: ["Set up your investor memo", "Configure deal terms"],
        insights: ["Get started by adding investors you're in contact with"],
      };
    }

    // Get recent investors (last 3)
    const recentInvestors = investors.slice(0, 3);
    
    // Count by status
    const prospectCount = investors.filter(i => i.status === 'prospect').length;
    const pitchCount = investors.filter(i => i.status === 'pitch').length;
    const contractCount = investors.filter(i => i.status === 'contract').length;
    const wonCount = investors.filter(i => i.status === 'won').length;

    // Build priorities based on status
    const priorities: string[] = [];
    if (contractCount > 0) {
      const contractInvestors = investors.filter(i => i.status === 'contract').slice(0, 2);
      priorities.push(...contractInvestors.map(i => `Close deal with ${i.name}`));
    }
    if (pitchCount > 0 && priorities.length < 3) {
      const pitchInvestors = investors.filter(i => i.status === 'pitch').slice(0, 2);
      priorities.push(...pitchInvestors.map(i => `Follow up with ${i.name}`));
    }
    if (priorities.length === 0) {
      priorities.push(...recentInvestors.map(i => `Follow up with ${i.name}`));
    }

    // Build tasks
    const tasks: string[] = [];
    if (prospectCount > 3) {
      tasks.push("Send memo links to new prospects");
    }
    if (pitchCount > 0 && contractCount === 0) {
      tasks.push("Generate dockets for interested investors");
    }
    if (investors.length < 5) {
      tasks.push("Add more investors to pipeline");
    } else {
      tasks.push("Review investor statuses");
    }
    tasks.push("Update memo content if needed");

    // Build insight
    const insights: string[] = [];
    if (wonCount > 0) {
      insights.push(`${wonCount} investor${wonCount > 1 ? 's' : ''} closed. Keep the momentum going.`);
    } else if (contractCount > 0) {
      insights.push(`${contractCount} investor${contractCount > 1 ? 's' : ''} reviewing contracts. Focus on closing.`);
    } else {
      insights.push(`${investors.length} investor${investors.length > 1 ? 's' : ''} in your pipeline`);
    }

    return {
      priorities: priorities.slice(0, 3),
      tasks: tasks.slice(0, 3),
      insights,
    };
  }, [investors]);

  return (
    <>
      <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium">Daily Bulletin</span>
        </div>
        
        <div className="p-4 space-y-4">
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
        </div>
      </div>
      
      {/* Status Line - Outside Card */}
      <StatusLine 
        status="idle"
        idleText="Updated just now"
      />
    </>
  );
}
