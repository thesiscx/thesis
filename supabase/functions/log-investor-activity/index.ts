import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { actionType, docketId, roundId, investorId, metadata } = await req.json();

    if (!actionType || !docketId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: actionType and docketId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up the workspace_id from the docket -> round
    const { data: docket, error: docketError } = await supabase
      .from("dockets")
      .select("round_id, investor_id, rounds!inner(workspace_id)")
      .eq("id", docketId)
      .single();

    if (docketError || !docket) {
      console.error("Failed to find docket:", docketError);
      return new Response(
        JSON.stringify({ error: "Docket not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const workspaceId = (docket.rounds as any).workspace_id;

    // Insert the activity log
    const { error: insertError } = await supabase.from("activity_logs").insert({
      workspace_id: workspaceId,
      action_type: actionType,
      round_id: roundId || docket.round_id,
      investor_id: investorId || docket.investor_id,
      docket_id: docketId,
      metadata: metadata || {},
    });

    if (insertError) {
      console.error("Failed to insert activity log:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to log activity" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Activity logged: ${actionType} for docket ${docketId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in log-investor-activity:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
