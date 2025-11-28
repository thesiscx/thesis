import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface AccessLog {
  id: string;
  timestamp: string;
  ip_address: string | null;
  action: string;
  stakeholder: {
    name: string;
  } | null;
}

export function AnalyticsTab() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['accessLogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_logs')
        .select('*, stakeholder:stakeholders(name)')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-4">Access Analytics</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Stakeholder</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No activity logs yet
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log: AccessLog) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">
                    {log.stakeholder?.name || "Unknown"}
                  </TableCell>
                  <TableCell className="capitalize">{log.action}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.ip_address || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
