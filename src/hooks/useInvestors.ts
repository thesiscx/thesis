import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";

interface Investor {
  id: string;
  slug: string;
  name: string;
  email: string | null;
}

export function useInvestors() {
  const { user } = useFounderAuth();

  const { data: investors = [], isLoading } = useQuery({
    queryKey: ["investors", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("investors")
        .select("*")
        .eq("workspace_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Investor[];
    },
    enabled: !!user?.id,
  });

  // For now, recent investors is just the first 5
  // In a real implementation, this would track actual recent access
  const recentInvestors = investors.slice(0, 5);

  return {
    investors,
    recentInvestors,
    isLoading,
  };
}
