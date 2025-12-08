import { supabase } from "@/integrations/supabase/client";

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
  | "investor_marked_passed"
  // Round actions
  | "round_created"
  | "round_opened"
  | "round_closed"
  | "round_reopened"
  // Access key actions
  | "access_key_generated";

interface LogActivityParams {
  workspaceId: string;
  actionType: ActivityActionType;
  roundId?: string | null;
  investorId?: string | null;
  docketId?: string | null;
  memoId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

/**
 * Log an activity to the activity_logs table.
 * This is a standalone function that can be called from anywhere.
 */
export async function logActivity({
  workspaceId,
  actionType,
  roundId,
  investorId,
  docketId,
  memoId,
  metadata = {},
}: LogActivityParams): Promise<void> {
  if (!workspaceId) {
    console.warn("Cannot log activity: no workspaceId");
    return;
  }

  try {
    const { error } = await supabase.from("activity_logs").insert([{
      workspace_id: workspaceId,
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
}
