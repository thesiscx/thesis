import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { FileText } from "lucide-react";

interface GlobalDocketProps {
  roundSlug?: string;
}

export default function GlobalDocket({ roundSlug }: GlobalDocketProps) {
  const { user } = useFounderAuth();

  // Fetch round and dockets
  const { data: roundData } = useQuery({
    queryKey: ["round", roundSlug, user?.id],
    queryFn: async () => {
      if (!roundSlug || !user?.id) return null;
      
      const { data, error } = await supabase
        .from("rounds")
        .select("id, name")
        .eq("slug", roundSlug)
        .eq("created_by", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!roundSlug && !!user?.id,
  });

  const { data: dockets = [], isLoading } = useQuery({
    queryKey: ["dockets", roundData?.id],
    queryFn: async () => {
      if (!roundData?.id) return [];
      
      const { data, error } = await supabase
        .from("dockets")
        .select(`
          id,
          amount,
          status,
          wire_received,
          updated_at,
          investor_id,
          is_global,
          investors (
            id,
            name
          )
        `)
        .eq("round_id", roundData.id)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!roundData?.id,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      sent: "secondary",
      investor_signed: "default",
      executed: "default",
      expired: "destructive",
    };
    const labels: Record<string, string> = {
      draft: "Draft",
      sent: "Sent",
      investor_signed: "Signed",
      executed: "Executed",
      expired: "Expired",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return "—";
    return `$${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-3.5rem)] p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold mb-2">Dockets</h1>
          <p className="text-muted-foreground">
            Manage deal documents and track investor commitments
          </p>
        </div>

        {dockets.length === 0 ? (
          <div className="border border-dashed border-border/50 rounded-xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">No dockets yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Set up your round terms using the sidebar, then create dockets for individual investors.
            </p>
          </div>
        ) : (
          <div className="border border-border/50 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-medium">Investor</TableHead>
                  <TableHead className="font-medium">Amount</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium">Last Updated</TableHead>
                  <TableHead className="font-medium text-right">Wire Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dockets.map((docket: any) => (
                  <TableRow 
                    key={docket.id} 
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-medium">
                      {docket.is_global ? "Global Template" : docket.investors?.name || "Unknown"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatAmount(docket.amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(docket.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {docket.updated_at ? format(new Date(docket.updated_at), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch 
                        checked={docket.wire_received || false} 
                        disabled
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
