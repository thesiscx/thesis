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
    const { docketId, investorId, accessKeyId, roundId, updateType, data } = await req.json();

    console.log("update-investor-docket called:", { updateType, docketId, roundId });

    // Validate required params
    if (!roundId || !updateType) {
      console.error("Missing required parameters");
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the docket
    let query = supabase.from("dockets").select("id, status").eq("round_id", roundId);

    if (docketId) {
      query = query.eq("id", docketId);
    } else if (investorId) {
      query = query.eq("investor_id", investorId);
    } else if (accessKeyId) {
      query = query.eq("access_key_id", accessKeyId);
    }

    const { data: docket, error: findError } = await query.maybeSingle();
    
    if (findError) {
      console.error("Error finding docket:", findError);
      return new Response(JSON.stringify({ error: "Error finding docket" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!docket) {
      console.error("Docket not found");
      return new Response(JSON.stringify({ error: "Docket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle different update types
    let updateData: Record<string, unknown> = {};

    switch (updateType) {
      case "viewed":
        // Only update to viewed if currently in draft
        if (docket.status === "draft") {
          updateData = { status: "viewed" };
        } else {
          console.log("Docket already viewed or beyond, skipping status update");
          return new Response(JSON.stringify({ success: true, docketId: docket.id, skipped: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        break;

      case "flow_state":
        updateData = { commitment_flow_state: data?.flowState };
        break;

      case "signed":
        updateData = {
          status: "investor_signed",
          commitment_status: "signed",
          amount: data?.amount,
          investor_name: data?.investorName,
          investor_email: data?.investorEmail,
          investor_phone: data?.investorPhone,
          investor_address: data?.investorAddress,
          investor_entity_name: data?.entityName,
          investor_entity_type: data?.entityType,
        };
        break;

      default:
        console.error("Invalid update type:", updateType);
        return new Response(JSON.stringify({ error: "Invalid update type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    console.log("Updating docket with:", updateData);

    const { error: updateError } = await supabase
      .from("dockets")
      .update(updateData)
      .eq("id", docket.id);

    if (updateError) {
      console.error("Error updating docket:", updateError);
      throw updateError;
    }

    console.log("Docket updated successfully:", docket.id);

    return new Response(JSON.stringify({ success: true, docketId: docket.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in update-investor-docket:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
