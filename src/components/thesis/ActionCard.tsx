import { useState } from "react";
import { Check, X, Loader2, User, FileText, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

interface ActionCardProps {
  toolCall: ToolCall;
  onComplete: (success: boolean, message: string) => void;
}

const ACTION_LABELS: Record<string, { label: string; icon: typeof User }> = {
  add_investor: { label: "Add Investor", icon: User },
  create_investor_memo: { label: "Create Memo", icon: FileText },
  create_investor_docket: { label: "Create Docket", icon: Briefcase },
};

export default function ActionCard({ toolCall, onComplete }: ActionCardProps) {
  const { toast } = useToast();
  const { session } = useFounderAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"pending" | "loading" | "success" | "error">("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  let params: Record<string, any> = {};
  try {
    params = JSON.parse(toolCall.arguments);
  } catch {
    params = {};
  }

  const actionInfo = ACTION_LABELS[toolCall.name] || { label: toolCall.name, icon: User };
  const Icon = actionInfo.icon;

  const handleConfirm = async () => {
    setStatus("loading");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/thesis-action`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            action: toolCall.name,
            params,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Action failed");
      }

      setStatus("success");
      
      // Invalidate relevant queries
      if (toolCall.name === "add_investor") {
        queryClient.invalidateQueries({ queryKey: ["investors"] });
      } else if (toolCall.name === "create_investor_memo") {
        queryClient.invalidateQueries({ queryKey: ["memo"] });
        queryClient.invalidateQueries({ queryKey: ["memos"] });
      } else if (toolCall.name === "create_investor_docket") {
        queryClient.invalidateQueries({ queryKey: ["docket"] });
        queryClient.invalidateQueries({ queryKey: ["dockets"] });
      }

      toast({ title: "Done", description: data.message });
      onComplete(true, data.message);
    } catch (error) {
      setStatus("error");
      const message = error instanceof Error ? error.message : "Action failed";
      setErrorMessage(message);
      toast({ title: "Failed", description: message, variant: "destructive" });
      onComplete(false, message);
    }
  };

  const handleReject = () => {
    onComplete(false, "Action cancelled");
  };

  const renderParams = () => {
    return Object.entries(params).map(([key, value]) => (
      <div key={key} className="flex justify-between text-sm">
        <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
        <span className="font-medium">{String(value)}</span>
      </div>
    ));
  };

  if (status === "success") {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-green-600">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Completed</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-destructive">
            <X className="w-4 h-4" />
            <span className="text-sm">{errorMessage}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-primary/10">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium">{actionInfo.label}</span>
        </div>

        {/* Parameters */}
        <div className="space-y-1.5 pl-7">
          {renderParams()}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pl-7">
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs"
            onClick={handleConfirm}
            disabled={status === "loading"}
          >
            {status === "loading" ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Check className="w-3 h-3 mr-1" />
            )}
            Confirm
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={handleReject}
            disabled={status === "loading"}
          >
            <X className="w-3 h-3 mr-1" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
