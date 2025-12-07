import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useCallback } from "react";

export type ActivityActionType =
  // Memo actions
  | "memo_updated"
  | "memo_published"
  | "memo_version_created"
  | "memo_link_generated"
  // Docket actions
  | "docket_created"
  | "docket_link_generated"
  | "docket_terms_updated"
  | "docket_voided"
  | "docket_archived"
  // Investor commitment actions
  | "investor_viewed_memo"
  | "investor_viewed_docket"
  | "investor_details_submitted"
  | "investor_signed"
  | "investor_funded"
  | "deal_executed"
  // Pipeline actions
  | "investor_added"
  | "investor_updated"
  // Round actions
  | "round_created"
  | "round_opened"
  | "round_closed"
  | "round_reopened"
  // Access key actions
  | "access_key_generated";

interface LogActivityParams {
  actionType: ActivityActionType;
  roundId?: string | null;
  investorId?: string | null;
  docketId?: string | null;
  memoId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export function useActivityLog() {
  const { user } = useFounderAuth();

  const logActivity = useCallback(
    async ({
      actionType,
      roundId,
      investorId,
      docketId,
      memoId,
      metadata = {},
    }: LogActivityParams) => {
      if (!user?.id) {
        console.warn("Cannot log activity: no user");
        return;
      }

      try {
        const { error } = await supabase.from("activity_logs").insert([{
          workspace_id: user.id,
          action_type: actionType,
          round_id: roundId || null,
          investor_id: investorId || null,
          docket_id: docketId || null,
          memo_id: memoId || null,
          metadata,
        }]);
        if (error) {
          console.error("Failed to log activity:", error);
        }
      } catch (err) {
        console.error("Failed to log activity:", err);
      }
    },
    [user?.id]
  );

  return { logActivity };
}
